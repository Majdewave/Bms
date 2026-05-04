import { stripeService } from "../api";

export default function Upgrade() {
  const startCheckout = async () => {
    try {
      const data = await stripeService.createCheckoutSession("pro_monthly");
      if (data?.url) {
        window.location.href = data.url;
      } else {
        window.location.href = "/billing";
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה ביצירת תשלום");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <h1>🚫 החשבון הוגבל</h1>
      <p>תקופת הניסיון הסתיימה. שדרג כדי להמשיך.</p>

      <button onClick={startCheckout}>
        שדרג עכשיו
      </button>
    </div>
  );
}
}
