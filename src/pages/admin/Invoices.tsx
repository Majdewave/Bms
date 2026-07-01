import { useEffect, useState } from 'react'
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { clientsService, invoicesService } from '@/api'
import { useTenant } from '@/contexts/TenantContext'
import type {
  Client,
  CreateInvoiceLineItemRequest,
  CreateInvoiceRequest,
  Invoice,
} from '@/api'
import { DEFAULT_VAT_RATE, calculateInvoiceTotals } from '@/api/invoices'
import { useTranslation } from 'react-i18next'
import { Check, Download, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type InvoiceFormLineItem = {
  id: string
  description: string
  quantity: string
  price: string
}

type InvoiceFormState = {
  clientId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  notes: string
  lineItems: InvoiceFormLineItem[]
}

const createLineItemId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `line-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const createEmptyLineItem = (): InvoiceFormLineItem => ({
  id: createLineItemId(),
  description: '',
  quantity: '1',
  price: '0',
})

const createDefaultInvoiceForm = (): InvoiceFormState => ({
  clientId: '',
  invoiceNumber: `INV-${Date.now()}`,
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  lineItems: [createEmptyLineItem()],
})

const isRtlLanguage = (language: string) => {
  const normalizedLanguage = language.toLowerCase()
  return normalizedLanguage.startsWith('he') || normalizedLanguage.startsWith('ar')
}

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}

const toIsoDate = (date: string) => new Date(`${date}T00:00:00`).toISOString()

export default function AdminInvoices() {
  const { t, i18n } = useTranslation()
  const { tenant } = useTenant()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(() => createDefaultInvoiceForm())

  const isRtl = isRtlLanguage(i18n.language)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invoicesData, clientsData] = await Promise.all([
        invoicesService.getInvoices(),
        clientsService.getClients(),
      ])

      setInvoices(Array.from(new Map(invoicesData.map((invoice) => [invoice.id, invoice])).values()))
      setClients(clientsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingInvoiceId(null)
    setInvoiceForm(createDefaultInvoiceForm())
  }

  const updateInvoiceField = <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const updateLineItem = (lineItemId: string, field: keyof Omit<InvoiceFormLineItem, 'id'>, value: string) => {
    setInvoiceForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((lineItem) =>
        lineItem.id === lineItemId ? { ...lineItem, [field]: value } : lineItem
      ),
    }))
  }

  const addLineItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, createEmptyLineItem()],
    }))
  }

  const removeLineItem = (lineItemId: string) => {
    setInvoiceForm((current) => {
      const nextLineItems = current.lineItems.filter((lineItem) => lineItem.id !== lineItemId)

      return {
        ...current,
        lineItems: nextLineItems.length > 0 ? nextLineItems : [createEmptyLineItem()],
      }
    })
  }

  const buildLineItemPayload = (lineItem: InvoiceFormLineItem): CreateInvoiceLineItemRequest => ({
    description: lineItem.description.trim(),
    quantity: toNumber(lineItem.quantity),
    price: toCurrency(toNumber(lineItem.price)),
  })

  const normalizedVatRate = (() => {
    const parsedVatRate = Number(tenant?.defaultVatRate)
    if (!Number.isFinite(parsedVatRate) || parsedVatRate <= 0 || parsedVatRate > 100) {
      return DEFAULT_VAT_RATE
    }

    return toCurrency(parsedVatRate)
  })()
  const lineItemPayload = invoiceForm.lineItems.map(buildLineItemPayload)
  const totals = calculateInvoiceTotals(lineItemPayload, normalizedVatRate)

  const validationMessages = [
    !invoiceForm.clientId ? t('admin.invoices.form.validationClient') : null,
    !invoiceForm.invoiceNumber.trim() ? t('admin.invoices.form.validationInvoiceNumber') : null,
    invoiceForm.lineItems.length === 0 ? t('admin.invoices.form.validationLineItems') : null,
    invoiceForm.lineItems.some((lineItem) => !lineItem.description.trim())
      ? t('admin.invoices.form.validationDescription')
      : null,
    invoiceForm.lineItems.some((lineItem) => toNumber(lineItem.quantity) <= 0)
      ? t('admin.invoices.form.validationQuantity')
      : null,
    invoiceForm.lineItems.some((lineItem) => toNumber(lineItem.price, -1) < 0)
      ? t('admin.invoices.form.validationPrice')
      : null,
  ].filter((message): message is string => Boolean(message))

  const isFormValid = validationMessages.length === 0

  const buildRequest = (): CreateInvoiceRequest => ({
    clientId: invoiceForm.clientId,
    invoiceNumber: invoiceForm.invoiceNumber.trim(),
    invoiceDate: toIsoDate(invoiceForm.invoiceDate),
    dueDate: invoiceForm.dueDate ? toIsoDate(invoiceForm.dueDate) : undefined,
    notes: invoiceForm.notes.trim() || undefined,
    lineItems: lineItemPayload,
  })

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isFormValid) {
      return
    }

    setSaving(true)

    try {
      const payload = buildRequest()

      if (editingInvoiceId) {
        await invoicesService.updateInvoice(editingInvoiceId, payload)
      } else {
        await invoicesService.createInvoice(payload)
      }

      await loadData()
      closeModal()
    } catch (error) {
      console.error('Failed to save invoice:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const blob = await invoicesService.downloadInvoice(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `${invoice.number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download invoice:', error)
    }
  }

  const handleEdit = (invoice: Invoice) => {
    const fallbackPrice = invoice.subtotal > 0 ? invoice.subtotal : invoice.totalAmount
    const nextLineItems = invoice.lineItems.length > 0
      ? invoice.lineItems.map((lineItem) => ({
          id: lineItem.id || createLineItemId(),
          description: lineItem.description,
          quantity: String(lineItem.quantity),
          price: String(lineItem.price),
        }))
      : [
          {
            id: createLineItemId(),
            description: t('admin.invoices.form.defaultDescription'),
            quantity: '1',
            price: String(fallbackPrice),
          },
        ]

    setInvoiceForm({
      clientId: invoice.clientId,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      notes: invoice.notes ?? '',
      lineItems: nextLineItems,
    })
    setEditingInvoiceId(invoice.id)
    setShowCreateModal(true)
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Delete this invoice?')) {
      return
    }

    try {
      await invoicesService.deleteInvoice(invoiceId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
    }
  }

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    const configuredCurrency = (tenant?.currency ?? 'ILS').toUpperCase()
    const currency = configuredCurrency === 'USD' || configuredCurrency === 'EUR' || configuredCurrency === 'ILS'
      ? configuredCurrency
      : 'ILS'

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return '-'
    }

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return '-'
    }

    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Container>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('admin.invoices.title')}
          description={t('admin.invoices.description')}
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('admin.invoices.create')}
            </button>
          }
        />

        <Card>
          <CardHeader title={t('admin.invoices.list')} />
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  placeholder={t('admin.invoices.search')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={`w-full py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {t('admin.invoices.filter')}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.number')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.client')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.amount')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.date')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.dueDate')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('admin.invoices.table.status')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {invoice.number}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.clientName}</p>
                            <p className="text-sm text-slate-500">{invoice.clientEmail}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {t(`admin.invoices.status.${invoice.status}`)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => handleDownloadInvoice(invoice)}>
                              <Download className="w-4 h-4 text-blue-600" />
                            </button>
                            <button type="button" onClick={() => handleEdit(invoice)}>
                              <Pencil className="w-4 h-4 text-green-600" />
                            </button>
                            <button type="button" onClick={() => handleDeleteInvoice(invoice.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">{t('common.noResults')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={closeModal}
              ></div>

              <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingInvoiceId ? t('admin.invoices.editTitle') : t('admin.invoices.createNew')}
                  </h2>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('admin.invoices.form.client')} *
                      </label>
                      <select
                        required
                        value={invoiceForm.clientId}
                        onChange={(event) => updateInvoiceField('clientId', event.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      >
                        <option value="">{t('admin.invoices.form.selectClient')}</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.fullName ? `${client.fullName} (${client.email || ''})` : client.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('admin.invoices.form.invoiceNumber')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={invoiceForm.invoiceNumber}
                        onChange={(event) => updateInvoiceField('invoiceNumber', event.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('admin.invoices.form.date')} *
                      </label>
                      <input
                        type="date"
                        required
                        value={invoiceForm.invoiceDate}
                        onChange={(event) => updateInvoiceField('invoiceDate', event.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('admin.invoices.form.dueDate')}
                      </label>
                      <input
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(event) => updateInvoiceField('dueDate', event.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">{t('admin.invoices.form.lineItems')}</h3>
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t('admin.invoices.form.addItem')}
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-white">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t('admin.invoices.form.description')}
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">
                                {t('admin.invoices.form.quantity')}
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">
                                {t('admin.invoices.form.price')}
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">
                                {t('admin.invoices.form.lineTotal')}
                              </th>
                              <th className="px-4 py-3 w-20"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceForm.lineItems.map((lineItem) => {
                              const lineTotal = toCurrency(toNumber(lineItem.quantity) * toNumber(lineItem.price))

                              return (
                                <tr key={lineItem.id} className="border-b border-slate-100 last:border-b-0">
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="text"
                                      value={lineItem.description}
                                      onChange={(event) => updateLineItem(lineItem.id, 'description', event.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={lineItem.quantity}
                                      onChange={(event) => updateLineItem(lineItem.id, 'quantity', event.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={lineItem.price}
                                      onChange={(event) => updateLineItem(lineItem.id, 'price', event.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <div className="h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center font-semibold text-slate-900">
                                      {formatCurrency(lineTotal)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <button
                                      type="button"
                                      onClick={() => removeLineItem(lineItem.id)}
                                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                      aria-label={t('admin.invoices.form.removeItem')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                      <p className="text-sm text-slate-600">
                        VAT: <span className="font-semibold text-slate-900">{totals.vatRate}%</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Currency: <span className="font-semibold text-slate-900">{(tenant?.currency ?? 'ILS').toUpperCase()}</span>
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{t('admin.invoices.form.subtotal')}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{`${t('admin.invoices.form.vatAmount')} (${totals.vatRate}%)`}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(totals.vatAmount)}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-base font-semibold text-slate-900">
                            {t('admin.invoices.form.totalAmount')}
                          </span>
                          <span className="text-2xl font-bold text-slate-900">
                            {formatCurrency(totals.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.invoices.form.notes')}
                    </label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(event) => updateInvoiceField('notes', event.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                      placeholder={t('admin.invoices.form.notesPlaceholder')}
                    />
                  </div>

                  {validationMessages.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
                      {validationMessages.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !isFormValid}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          {t('common.saving')}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t('admin.invoices.form.submit')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
