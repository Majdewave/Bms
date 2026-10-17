import { useEffect, useState } from 'react'
import {
  fetchBusinessPlanConfigurations,
  updateBusinessPlanConfiguration,
  type BusinessPlanConfiguration,
  type BusinessPlanType,
} from '@/platform/settings/services/businessPlansService'

const planOrder: BusinessPlanType[] = ['Trial', 'Basic', 'Pro']

export default function BusinessPlansSection() {
  const [plans, setPlans] = useState<BusinessPlanConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState<BusinessPlanType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetchBusinessPlanConfigurations(controller.signal)
      .then(setPlans)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load Business plan configuration.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const updatePlan = (planType: BusinessPlanType, patch: Partial<BusinessPlanConfiguration>) => {
    setPlans((current) => current.map((plan) => plan.planType === planType ? { ...plan, ...patch } : plan))
  }

  const savePlan = async (plan: BusinessPlanConfiguration) => {
    setSavingPlan(plan.planType)
    setError(null)
    setMessage('')
    try {
      const updated = await updateBusinessPlanConfiguration(plan.planType, {
        displayName: plan.displayName,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        enabled: plan.enabled,
        displayOrder: plan.displayOrder,
      })
      setPlans((current) => current.map((item) => item.planType === updated.planType ? updated : item))
      setMessage(`${updated.displayName} saved.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save Business plan configuration.')
    } finally {
      setSavingPlan(null)
    }
  }

  return (
    <section id="business-plans" className="platform-card platform-section-card platform-settings-section">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Business Plans</h3>
      </header>
      <div className="space-y-4 p-4">
        <p className="platform-field-hint">
          Business display pricing is CLIENTA configuration only. It does not create or change Stripe prices or checkout behavior.
        </p>
        {message && <div role="status" className="platform-inline-message platform-inline-message-success">{message}</div>}
        {error && <div role="alert" className="platform-inline-message platform-inline-message-error">{error}</div>}
        {loading ? <div className="skeleton h-48 w-full" /> : null}
        {!loading && plans.length === 0 && !error && (
          <p className="platform-field-hint">Business plan definitions are not available.</p>
        )}
        {!loading && planOrder.map((planType) => {
          const plan = plans.find((item) => item.planType === planType)
          if (!plan) return null
          const isLockedForPurchase = planType !== 'Basic'

          return (
            <article key={plan.planType} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{plan.displayName}</h4>
                  <p className="text-xs text-slate-500">Business · {plan.planType}</p>
                </div>
                <span className={`platform-badge ${plan.availableForPurchase ? 'platform-badge-approved' : 'platform-badge-expired'}`}>
                  {plan.availableForPurchase ? 'Available for purchase' : planType === 'Pro' ? 'Coming soon' : 'Not purchasable'}
                </span>
              </div>

              <div className="platform-settings-grid">
                <label className="platform-field">
                  <span className="platform-field-label">Display Name</span>
                  <input className="input" maxLength={100} value={plan.displayName} onChange={(event) => updatePlan(planType, { displayName: event.target.value })} />
                </label>
                <label className="platform-field">
                  <span className="platform-field-label">Description</span>
                  <textarea className="input min-h-10" value={plan.description ?? ''} onChange={(event) => updatePlan(planType, { description: event.target.value || null })} />
                </label>
                <label className="platform-field">
                  <span className="platform-field-label">Monthly Display Price</span>
                  <input className="input" type="number" min={0} step="0.01" value={plan.monthlyPrice ?? ''} onChange={(event) => updatePlan(planType, { monthlyPrice: event.target.value === '' ? null : Number(event.target.value) })} />
                </label>
                <label className="platform-field">
                  <span className="platform-field-label">Annual Display Price</span>
                  <input className="input" type="number" min={0} step="0.01" value={plan.annualPrice ?? ''} onChange={(event) => updatePlan(planType, { annualPrice: event.target.value === '' ? null : Number(event.target.value) })} />
                </label>
                <label className="platform-field">
                  <span className="platform-field-label">Display Order</span>
                  <input className="input" type="number" min={0} step={1} value={plan.displayOrder} onChange={(event) => updatePlan(planType, { displayOrder: Number(event.target.value) })} />
                </label>
                <label className="platform-field">
                  <span className="platform-field-label">Enabled</span>
                  <input type="checkbox" checked={plan.enabled} onChange={(event) => updatePlan(planType, { enabled: event.target.checked })} />
                </label>
              </div>

              {isLockedForPurchase && (
                <p className="mt-3 text-xs text-slate-500">
                  Purchase availability is locked off for {planType}; this setting cannot be enabled here.
                </p>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="platform-button-primary"
                  onClick={() => void savePlan(plan)}
                  disabled={savingPlan !== null || !plan.displayName.trim() || plan.displayOrder < 0}
                >
                  {savingPlan === planType ? 'Saving...' : 'Save Business Plan'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}