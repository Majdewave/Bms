import { useState, useEffect } from 'react'
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { invoicesService } from '@/api'
import type { Invoice } from '@/api'
import { useTranslation } from 'react-i18next'
import { Download, DollarSign, Calendar, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function ClientInvoices() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const data = await invoicesService.getInvoices()
      setInvoices(data)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const blob = await invoicesService.downloadInvoice(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download invoice:', error)
    }
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-50 text-red-800 border-red-200'
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200'
    }
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)
  const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <Container>
      <PageHeader
        title={t('client.invoices.title')}
        description={t('client.invoices.subtitle')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{t('client.invoices.summary.total')}</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{t('client.invoices.summary.paid')}</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{t('client.invoices.summary.pending')}</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader title={t('client.invoices.list')} />
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t('client.invoices.noInvoices')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border border-slate-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-mono text-lg font-semibold text-slate-900">{invoice.number}</h3>
                        <p className="text-sm text-slate-500">
                          {t('client.invoices.issued')}: {formatDate(invoice.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border mt-2 ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {t(`admin.invoices.status.${invoice.status}`)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {t('client.invoices.due')}: <span className="font-semibold text-slate-900">{formatDate(invoice.dueDate)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {t('client.invoices.items')}: <span className="font-semibold text-slate-900">{invoice.lineItems.length}</span>
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mt-4 space-y-2">
                    {invoice.lineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                        <div>
                          <p className="font-medium text-slate-900">{item.description}</p>
                          <p className="text-slate-500">
                            {item.quantity} × {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => handleDownloadPDF(invoice)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('client.invoices.downloadPDF')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}
