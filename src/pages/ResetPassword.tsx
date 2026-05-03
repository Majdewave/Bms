import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";


export default function ResetPassword() {
  const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      console.log("TOKEN:", token);
      console.log("URL:", window.location.href);
      console.log("FULL URL:", window.location.href);
      console.log("SEARCH:", window.location.search);
      setError("קישור לא תקין");
      return;
    }


    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    if (password !== confirm) {
      setError("הסיסמאות לא תואמות");
      return;
    }

    setLoading(true);

    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      navigate("/login?reset=success");
    } catch {
      setError("שגיאה בעדכון סיסמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#f5f7fa"
    }}>
      <div style={{
        width: 400,
        padding: 30,
        borderRadius: 10,
        background: "white",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
      }}>
        <h2 style={{ marginBottom: 20 }}>איפוס סיסמה</h2>

        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 10 }}
          />

          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: "100%", marginBottom: 15, padding: 10 }}
          />

          <button
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6
            }}
          >
            {loading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>

        {error && (
          <p style={{ color: "red", marginTop: 10 }}>{error}</p>
        )}
      </div>
    </div>
  );
}