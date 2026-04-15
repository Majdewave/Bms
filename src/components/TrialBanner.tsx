import { useNavigate } from "react-router-dom";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const navigate = useNavigate();

  let text = `⚡ Trial • ${daysLeft} days left`;

  if (daysLeft <= 2 && daysLeft > 0) {
    text = `⚠️ Trial ends in ${daysLeft} days`;
  }

  if (daysLeft <= 0) {
    text = `🚨 Trial ended`;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-lg flex justify-between items-center">
      <span>{text}</span>
      <button
        onClick={() => navigate('/admin/billing')}
        className="text-blue-600 font-semibold hover:underline"
      >
        Upgrade
      </button>
    </div>
  );
}
