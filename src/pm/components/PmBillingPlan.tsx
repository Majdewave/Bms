import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePmAreaPrefix } from '@/pm/utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { getInvoices } from '@/api/invoices'
import type { Invoice } from '@/api/invoices'
import {
  createBillingMilestone,
  deleteBillingMilestone,
  getBillingMilestones,
  linkBillingMilestoneInvoice,
  updateBillingMilestone,
} from '@/api/billingMilestones'
import type { BillingMilestone, BillingMilestoneRequest, BillingMilestoneStatus, Project } from '@/types/pm'

type Props = { project: Project; canManage: boolean; fullPage?: boolean }

const statuses: BillingMilestoneStatus[] = ['Planned', 'ReadyToInvoice', 'Invoiced', 'Cancelled']

const statusClasses: Record<BillingMilestoneStatus, string> = {
  Planned: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  ReadyToInvoice: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
  Invoiced: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
}

const emptyForm = (): BillingMilestoneRequest => ({
  title: '', amount: 0, dueDate: null, description: '', status: 'Planned', sortOrder: 0,
})

export default function PmBillingPlan({ project, canManage, fullPage = false }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const [milestones, setMilestones] = useState<BillingMilestone[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BillingMilestone | null>(null)
  const [form, setForm] = useState<BillingMilestoneRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const canLoadInvoices = hasPermission('manage_invoices') && features?.invoicesEnabled === true
  const routePrefix = usePmAreaPrefix()

  const load = async () => {
    setLoading(true)
    try {
      const [milestonesData, invoicesData] = await Promise.all([
        getBillingMilestones(project.id),
        canLoadInvoices ? getInvoices({ clientId: project.clientId, projectId: project.id }) : Promise.resolve([]),
      ])
      setMilestones(milestonesData)
      setInvoices(invoicesData)
    } catch (error) {
      console.error('Failed to load billing plan:', error)
      setMilestones([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open || fullPage) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fullPage, project.id, canLoadInvoices])

  const planned = useMemo(() => milestones.filter((item) => item.status !== 'Cancelled').reduce((sum, item) => sum + item.amount, 0), [milestones])
  const invoiced = useMemo(() => milestones.filter((item) => item.status === 'Invoiced' && item.invoiceId).reduce((sum, item) => sum + item.amount, 0), [milestones])
  const notInvoiced = useMemo(() => milestones.filter((item) => item.status !== 'Cancelled' && item.status !== 'Invoiced').reduce((sum, item) => sum + item.amount, 0), [milestones])
  const difference = project.value - planned
  const nextBilling = milestones
    .filter((item) => item.status === 'Planned' || item.status === 'ReadyToInvoice')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))[0]
  const activeInvoiceIds = new Set(milestones.filter((item) => item.status !== 'Cancelled' && item.invoiceId).map((item) => item.invoiceId))

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true) }
  const openEdit = (milestone: BillingMilestone) => {
    setEditing(milestone)
    setForm({ title: milestone.title, amount: milestone.amount, dueDate: milestone.dueDate?.split('T')[0] ?? null, description: milestone.description ?? '', status: milestone.status, sortOrder: milestone.sortOrder })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm()) }

  const save = async () => {
    if (!form.title.trim() || form.amount < 0 || (form.status === 'Invoiced' && !editing?.invoiceId)) return
    setSaving(true)
    try {
      const payload = { ...form, title: form.title.trim(), dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null }
      if (editing) await updateBillingMilestone(editing.id, payload)
      else await createBillingMilestone(project.id, payload)
      closeModal()
      await load()
    } catch (error) { console.error('Failed to save billing milestone:', error) } finally { setSaving(false) }
  }

  const markReady = async (milestone: BillingMilestone) => {
    await updateBillingMilestone(milestone.id, { title: milestone.title, amount: milestone.amount, dueDate: milestone.dueDate, description: milestone.description, status: 'ReadyToInvoice', sortOrder: milestone.sortOrder })
    await load()
  }

  const cancelMilestone = async (milestone: BillingMilestone) => {
    await updateBillingMilestone(milestone.id, { title: milestone.title, amount: milestone.amount, dueDate: milestone.dueDate, description: milestone.description, status: 'Cancelled', sortOrder: milestone.sortOrder })
    await load()
  }

  const linkExisting = async (milestone: BillingMilestone, invoiceId: string) => {
    if (!invoiceId) return
    setLinkingId(milestone.id)
    try { await linkBillingMilestoneInvoice(milestone.id, invoiceId); await load() } catch (error) { console.error('Failed to link invoice:', error) } finally { setLinkingId(null) }
  }

  const content = (
    <div className={fullPage ? 'space-y-6' : 'mt-3 border-t border-slate-100 pt-3'}>
      {!fullPage && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-sm font-semibold text-slate-700">
          <span>{t('pm.billingPlan')}</span><span>{open ? '−' : '+'}</span>
        </button>
      )}
      {(fullPage || open) && (
        <div className={fullPage ? 'space-y-6' : 'mt-3 space-y-3'}>
          <div className={`grid grid-cols-2 gap-3 text-xs ${fullPage ? 'lg:grid-cols-5' : 'sm:grid-cols-5'}`}>
            <Metric label={t('pm.projectValueBeforeVat')} value={project.value} />
            <Metric label={t('pm.plannedBilling')} value={planned} />
            <Metric label={t('pm.milestonesInvoiced')} value={invoiced} />
            <Metric label={t('pm.notYetInvoiced')} value={notInvoiced} />
            <Metric label={t('pm.billingDifference')} value={difference} warning={Math.abs(difference) > 0.009} />
          </div>
          {Math.abs(difference) > 0.009 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('pm.billingPlanMismatch')} · {difference.toFixed(2)}</p> : <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{t('pm.billingPlanMatches')}</p>}
          {nextBilling && <p className="text-xs text-slate-600">{t('pm.nextBilling')}: {nextBilling.dueDate ? new Date(nextBilling.dueDate).toLocaleDateString() : '-'} · {nextBilling.title} · {nextBilling.amount.toFixed(2)}</p>}
          <div className="flex items-center justify-between gap-2">
            <h5 className={fullPage ? 'text-lg font-semibold text-slate-900' : 'text-xs font-semibold text-slate-600'}>{t('pm.billingMilestone')}</h5>
            {canManage && <button type="button" onClick={openCreate} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Plus className="h-3.5 w-3.5" />{t('pm.addMilestone')}</button>}
          </div>
          {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : milestones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{t('pm.noBillingMilestones')}</div>
          ) : milestones.map((milestone) => (
            <div key={milestone.id} className={`rounded-xl border border-slate-200 bg-white p-4 text-xs ${fullPage ? 'shadow-sm' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-800">{milestone.title}</p><p className="text-slate-600">{milestone.amount.toFixed(2)} · {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : '-'}</p></div><span className={`rounded-full px-2.5 py-1 font-semibold ${statusClasses[milestone.status]}`}>{t(`pm.milestoneStatus.${milestone.status}`)}</span></div>
              {milestone.invoiceNumber && <p className="mt-2 text-slate-600">{t('pm.linkedInvoice')}: {milestone.invoiceNumber}</p>}
              {canManage && <div className="mt-4 flex flex-wrap items-center gap-2">
                {milestone.status === 'Planned' && <button type="button" onClick={() => void markReady(milestone)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"><Check className="h-3.5 w-3.5" />{t('pm.markReady')}</button>}
                {(milestone.status === 'Planned' || milestone.status === 'ReadyToInvoice') && canLoadInvoices && <button type="button" onClick={() => navigate(`${routePrefix}/invoices?${new URLSearchParams({ clientId: project.clientId, projectId: project.id, billingMilestoneId: milestone.id })}`)} className="rounded-lg bg-primary-600 px-3 py-2 font-semibold text-white hover:bg-primary-700">{t('pm.createInvoice')}</button>}
                {(milestone.status === 'Planned' || milestone.status === 'ReadyToInvoice') && canLoadInvoices && <select aria-label={t('pm.linkInvoice')} disabled={linkingId === milestone.id} defaultValue="" onChange={(event) => void linkExisting(milestone, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">{t('pm.linkInvoice')}</option>{invoices.filter((invoice) => !activeInvoiceIds.has(invoice.id)).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}</select>}
                {milestone.invoiceId && <button type="button" onClick={() => navigate(`${routePrefix}/invoices?clientId=${project.clientId}&projectId=${project.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" />{t('pm.openInvoice')}</button>}
                {(milestone.status === 'Planned' || milestone.status === 'ReadyToInvoice') && <button type="button" onClick={() => void cancelMilestone(milestone)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 font-medium text-amber-800 hover:bg-amber-50"><X className="h-3.5 w-3.5" />{t('pm.cancelMilestone')}</button>}
                <button type="button" onClick={() => openEdit(milestone)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />{t('pm.editMilestoneAction')}</button>
                {!milestone.invoiceId ? <button type="button" onClick={async () => { if (window.confirm(t('pm.deleteMilestoneConfirm'))) { await deleteBillingMilestone(milestone.id); await load() } }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />{t('pm.deleteMilestoneAction')}</button> : <span className="text-xs font-medium text-slate-500">{t('pm.linkedMilestoneDeleteBlocked')}</span>}
              </div>}
            </div>
          ))}
        </div>
      )}
      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl"><h3 className="font-semibold">{editing ? t('pm.editMilestone') : t('pm.addMilestone')}</h3><input className="input w-full" placeholder={t('pm.milestoneTitle')} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><input className="input w-full" type="number" min="0" step="0.01" placeholder={t('pm.amount')} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /><input className="input w-full" type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} /><textarea className="input w-full" placeholder={t('pm.description')} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /><select className="input w-full" value={form.status} disabled={Boolean(editing?.invoiceId)} onChange={(event) => setForm({ ...form, status: event.target.value as BillingMilestoneStatus })}>{statuses.map((status) => <option key={status} value={status}>{t(`pm.milestoneStatus.${status}`)}</option>)}</select><div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded border px-3 py-2 text-sm">{t('common.cancel')}</button><button type="button" onClick={() => void save()} disabled={saving || !form.title.trim()} className="rounded bg-primary-600 px-3 py-2 text-sm font-semibold text-white">{t('common.save')}</button></div></div></div>}
    </div>
  )

  return content
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded bg-slate-50 p-2 ${warning ? 'text-amber-700' : 'text-slate-800'}`}><p className="text-slate-500">{label}</p><p className="font-semibold">{value.toFixed(2)}</p></div>
}
