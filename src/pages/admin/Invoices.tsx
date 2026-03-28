import { useState, useEffect } from 'react'
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { invoicesService, clientsService } from '@/api'
import type { Invoice } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Download,
  Search,
  Filter,
  X,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react'

export default function AdminInvoices() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    invoiceNumber: `INV-${Date.now()}`,
    amount: 0,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invoicesData, clientsData] = await Promise.all([
        invoicesService.getInvoices(),
        clientsService.getClients(),
      ])
      setInvoices(
        Array.from(new Map(invoicesData.map((invoice) => [invoice.id, invoice])).values())
      )
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
    setNewInvoice({
      clientId: '',
      invoiceNumber: `INV-${Date.now()}`,
      amount: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: '',
    })
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingInvoiceId) {
        const token = localStorage.getItem('token')
        const payload = {
          clientId: newInvoice.clientId,
          invoiceNumber: newInvoice.invoiceNumber,
          amount: newInvoice.amount,
          invoiceDate: new Date(newInvoice.invoiceDate).toISOString(),
          dueDate: new Date(newInvoice.dueDate).toISOString(),
          notes: newInvoice.notes,
        }

        console.log('UPDATE PAYLOAD:', payload)

        const res = await fetch(`http://localhost:5146/api/invoices/${editingInvoiceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update invoice')
      } else {
        const invoice = await invoicesService.createInvoice({
          clientId: newInvoice.clientId,
          invoiceNumber: newInvoice.invoiceNumber,
          amount: newInvoice.amount,
          invoiceDate: new Date(newInvoice.invoiceDate).toISOString(),
          dueDate: newInvoice.dueDate ? new Date(newInvoice.dueDate).toISOString() : undefined,
          notes: newInvoice.notes,
        })
        console.log('CREATED FROM SERVER:', invoice)
      }

      await loadData()
      closeModal()
    } catch (error) {
      console.error('Failed to save invoice:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (invoiceId: string, status: 'paid' | 'pending' | 'overdue') => {
    try {
      const updated = await invoicesService.updateInvoiceStatus(invoiceId, status)
      setInvoices(invoices.map(inv => inv.id === invoiceId ? updated : inv))
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const downloadInvoice = async (id: string) => {
    try {
      console.log('DOWNLOAD CLICKED:', id)

      const token = localStorage.getItem('token')

      const res = await fetch(`http://localhost:5146/api/invoices/${id}/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        console.error('FAILED:', res.status)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${id}.pdf`
      a.click()

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download invoice:', error)
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setNewInvoice({
      clientId: invoice.clientId,
      invoiceNumber: invoice.number,
      amount: invoice.amount,
      invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      notes: invoice.notes ?? '',
    })
    setEditingInvoiceId(invoice.id)
    setShowCreateModal(true)
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`http://localhost:5146/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { console.error('DELETE FAILED:', res.status); return }
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Container>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.invoices.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
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
                          {formatCurrency(invoice.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={invoice.status}
                          onChange={(e) => handleStatusChange(invoice.id, e.target.value as any)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <option value="paid">{t('admin.invoices.status.paid')}</option>
                          <option value="pending">{t('admin.invoices.status.pending')}</option>
                          <option value="overdue">{t('admin.invoices.status.overdue')}</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => downloadInvoice(invoice.id)}>
                            <Download className="w-4 h-4 text-blue-600" />
                          </button>
                          <button type="button" onClick={() => handleEdit(invoice)}>
                            <Pencil className="w-4 h-4 text-green-600" />
                          </button>
                          <button type="button" onClick={() => deleteInvoice(invoice.id)}>
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

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closeModal}
            ></div>

            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{editingInvoiceId ? 'Edit Invoice' : t('admin.invoices.createNew')}</h2>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Client */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.invoices.form.client')} *
                    </label>
                    <select
                      required
                      value={newInvoice.clientId}
                      onChange={(e) => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    >
                      <option value="">{t('admin.invoices.form.selectClient')}</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.fullName
                            ? `${client.fullName} (${client.email || ''})`
                          : client.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newInvoice.invoiceNumber}
                      onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.invoices.form.date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={newInvoice.invoiceDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.invoices.form.dueDate')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('admin.invoices.form.notes')}
                  </label>
                  <textarea
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                    placeholder={t('admin.invoices.form.notesPlaceholder')}
                  />
                </div>

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
                    disabled={saving}
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
    </Container>
  )
}
