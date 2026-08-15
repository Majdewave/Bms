import { useEffect, useRef, useState } from "react";

type Status = "loading" | "processing" | "success" | "error";

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;

export default function Success() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("טוענים את סטטוס התשלום...");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const resolveApiBaseUrl = () => {
    const envBase = (import.meta as any).env.VITE_API_URL as string | undefined;
    return envBase && envBase.trim().length > 0 ? envBase : "";
  };

  const confirmSession = async (sid: string, attempt = 0): Promise<void> => {
    if (attempt === 0) {
      setStatus("loading");
      setCanRetry(false);
      setError(null);
      setMessage("טוענים את סטטוס התשלום...");
    }

    const apiBaseUrl = resolveApiBaseUrl();
    const url = `${apiBaseUrl}/api/stripe/confirm-session?session_id=${encodeURIComponent(sid)}`;

    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      let data: Record<string, any> = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok) {
        if (data.success && data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("authToken", data.token);

          setStatus("success");
          setMessage("🎉 החשבון שודרג בהצלחה ל-Pro. מעבירים אותך למערכת...");

          retryTimeoutRef.current = window.setTimeout(() => {
            window.location.href = "/admin/dashboard";
          }, 1300);
          return;
        }

        setStatus("error");
        setError("התקבלה תשובה לא תקינה מהשרת. נסה שוב בעוד מספר שניות.");
        return;
      }

      if (response.status === 409 && data.error === "subscription_processing") {
        setStatus("processing");

        if (attempt < MAX_RETRIES - 1) {
          setMessage("✅ התשלום התקבל. אנחנו מסיימים להפעיל את חשבון ה-Pro שלך...");

          retryTimeoutRef.current = window.setTimeout(() => {
            void confirmSession(sid, attempt + 1);
          }, RETRY_DELAY);
          return;
        }

        setCanRetry(true);
        setMessage(
          "✅ התשלום התקבל. אנחנו עדיין מעדכנים את החשבון שלך. נסה לרענן בעוד מספר שניות, ואם עדיין לא התעדכן - פנה לתמיכה."
        );
        return;
      }

      if (response.status === 400 || response.status === 404) {
        setStatus("error");
        setError(data.message || "הסשן לא תקין או לא נמצא.");
        return;
      }

      if (response.status === 402) {
        setStatus("error");
        setError(data.message || "התשלום לא הושלם בהצלחה.");
        return;
      }

      setStatus("error");
      setError(data.message || data.error || "Unable to confirm payment");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "שגיאת רשת. נסה שוב.");
    }
  };

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session_id");

    if (!sid) {
      setStatus("error");
      setError("Missing session_id in URL.");
      return;
    }

    setSessionId(sid);
    void confirmSession(sid);

    return () => {
      clearRetryTimeout();
    };
  }, []);

  const handleRetry = () => {
    if (!sessionId) return;
    clearRetryTimeout();
    void confirmSession(sessionId, 0);
  };

  if (status === "loading" || status === "processing")
    return (
      <div style={{ textAlign: "center", marginTop: 64, maxWidth: 560, marginInline: "auto", paddingInline: 24 }}>
        <h2>✅ התשלום התקבל בהצלחה</h2>
        <p>{message}</p>
        <p>נא לא לסגור את החלון.</p>
        {canRetry && (
          <button
            onClick={handleRetry}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          >
            בדוק שוב
          </button>
        )}
      </div>
    );

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", marginTop: 64 }}>
        <h2>🎉 החשבון שודרג בהצלחה ל-Pro</h2>
        <p>מעבירים אותך למערכת...</p>
      </div>
    );
  }

  if (status === "error")
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 64 }}>
        <h2>❌ Error</h2>
        <p>{error || "Unknown error"}</p>
      </div>
    );

  return null;
}