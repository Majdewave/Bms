import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";


export default function BillingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const daysLeft = 7;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl">

        {/* 🔥 MAIN CARD */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* HERO */}
          <div className="text-center mb-4 space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              🚨 {t('billing.trial.title', { days: daysLeft })}
            </h1>

            <p className="text-gray-500 text-sm">
              {t('billing.trial.subtitle')}
            </p>
          </div>

          {/* LIGHT WARNING */}
          <div className="text-center text-sm text-gray-500 mb-6">
            {t('billing.trial.warning')}
          </div>

          {/* VALUE */}
          <div className="flex justify-center gap-6 text-sm text-gray-600 mb-6 flex-wrap">
            <span>✔ {t('billing.value.clients')}</span>
            <span>✔ {t('billing.value.automation')}</span>
            <span>✔ {t('billing.value.support')}</span>
          </div>

          {/* PLANS */}
          <div className="flex justify-center items-end gap-6 flex-wrap">

            {/* BASIC */}
            <div className="w-60 bg-gray-50 border rounded-2xl p-6 opacity-60">
              <h3 className="text-lg font-semibold text-center">{t('billing.plans.basic')}</h3>
              <p className="text-center text-gray-400 text-sm">{t('billing.plans.perMonth', { price: 19 })}</p>

              <button className="mt-6 w-full border py-2 rounded-xl text-gray-500">
                {t('billing.cta.basic')}
              </button>
            </div>

            {/* PRO */}
            <div className="w-72 bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-2xl relative transform hover:scale-105 transition ring-4 ring-blue-500/10">

              {/* badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full shadow">
                  {t('billing.plans.popular')}
                </div>

              <h3 className="text-lg font-semibold text-center text-gray-900">
                {t('billing.plans.pro')}
              </h3>

              <p className="text-center text-gray-500 text-sm">{t('billing.plans.perMonth', { price: 39 })}</p>

              {/* CTA */}
              <button
                onClick={() => navigate("/checkout")}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl text-lg font-semibold shadow-lg hover:from-blue-700 hover:to-blue-600 active:scale-95 transition"
              >
                🚀 {t('billing.cta.upgrade')}
              </button>

              <p className="text-xs text-center text-gray-400 mt-2">
                {t('billing.cta.note')}
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}