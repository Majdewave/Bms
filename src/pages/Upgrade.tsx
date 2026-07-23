import { stripeService } from "../api";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Upgrade() {
  const navigate = useNavigate();

    useEffect(() => {
  // מונע redirect אוטומטי
    document.title = "Upgrade";
    }, []);

  const startCheckout = async () => {
    try {

        const params = new URLSearchParams(window.location.search);
        const tenantId = params.get("tenantId")

        if (!tenantId) {
        alert("Tenant not found");
        return;
        }

        const data = await stripeService.createCheckoutSession({
        plan: "pro_monthly",
        tenantId // עכשיו זה בטוח string
        });

        if (data?.url) {
        window.location.href = data.url;
      } else {
        navigate('/billing');
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה ביצירת תשלום");
    }
  };

  return (
        <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb"
        }}>
        <div style={{
            background: "#fff",
            padding: "40px 50px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            maxWidth: "420px",
            width: "100%"
        }}>
            
            <div style={{ fontSize: 40, marginBottom: 10 }}>🚫</div>

            <h1 style={{
            fontSize: 26,
            marginBottom: 10,
            color: "#1f2937"
            }}>
            החשבון הוגבל
            </h1>

            <p style={{
            color: "#6b7280",
            marginBottom: 25,
            lineHeight: 1.6
            }}>
            תקופת הניסיון הסתיימה.<br />
            שדרג את החשבון כדי להמשיך להשתמש במערכת.
            </p>

            <button
            onClick={startCheckout}
            style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "10px",
                fontSize: "16px",
                cursor: "pointer",
                width: "100%"
            }}
            >
            שדרג עכשיו
            </button>

        </div>
    </div>
  );
}