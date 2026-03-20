// Invoices API
export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  price: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  clientName: string
  clientEmail: string
  amount: number
  date: string
  dueDate: string
  status: 'paid' | 'pending' | 'overdue'
  lineItems: InvoiceLineItem[]
  notes?: string
}

export interface CreateInvoiceRequest {
  clientId: string
  invoiceNumber: string
  amount: number
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2024-001',
    clientId: '1',
    clientName: 'Sarah Johnson',
    clientEmail: 'sarah.j@example.com',
    amount: 2500.0,
    date: '2024-02-01',
    dueDate: '2024-02-15',
    status: 'paid',
    lineItems: [
      { id: '1', description: 'Consultation Session', quantity: 5, price: 500, total: 2500 }
    ],
  },
  {
    id: '2',
    number: 'INV-2024-002',
    clientId: '2',
    clientName: 'Michael Chen',
    clientEmail: 'mchen@example.com',
    amount: 3750.5,
    date: '2024-02-05',
    dueDate: '2024-02-20',
    status: 'pending',
    lineItems: [
      { id: '1', description: 'Training Package', quantity: 1, price: 3750.5, total: 3750.5 }
    ],
  },
  {
    id: '3',
    number: 'INV-2024-003',
    clientId: '3',
    clientName: 'Emma Davis',
    clientEmail: 'emma.d@example.com',
    amount: 1200.0,
    date: '2024-01-20',
    dueDate: '2024-02-03',
    status: 'overdue',
    lineItems: [
      { id: '1', description: 'Support Services', quantity: 2, price: 600, total: 1200 }
    ],
  },
]

export const getInvoices = async (): Promise<Invoice[]> => {
  const res = await fetch('http://localhost:5146/api/invoices', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to load invoices')
  }

  const data = await res.json()

  return (data as any[]).map((invoice) => {
    const rawStatus = String(invoice.status ?? 'pending').toLowerCase()
    const status: Invoice['status'] = rawStatus === 'paid' || rawStatus === 'overdue' ? rawStatus : 'pending'
    const date = invoice.date ?? invoice.createdAt ?? new Date().toISOString()

    return {
      id: String(invoice.id ?? ''),
      number: String(invoice.number ?? invoice.invoiceNumber ?? ''),
      clientId: String(invoice.clientId ?? ''),
      clientName: String(invoice.clientName ?? ''),
      clientEmail: String(invoice.clientEmail ?? ''),
      amount: Number(invoice.amount ?? 0),
      date: String(date),
      dueDate: String(invoice.dueDate ?? date),
      status,
      lineItems: Array.isArray(invoice.lineItems) ? invoice.lineItems : [],
      notes: invoice.notes,
    }
  })
}

export const getInvoice = (id: string): Promise<Invoice | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const invoice = mockInvoices.find((inv) => inv.id === id)
      resolve(invoice || null)
    }, 300)
  })
}

export const createInvoice = async (data: CreateInvoiceRequest): Promise<Invoice> => {
  const res = await fetch('http://localhost:5146/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Failed to create invoice')

  return await res.json()
}

export const updateInvoiceStatus = (id: string, status: 'paid' | 'pending' | 'overdue'): Promise<Invoice> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const invoice = mockInvoices.find((inv) => inv.id === id)
      if (!invoice) {
        reject(new Error('Invoice not found'))
        return
      }
      invoice.status = status
      resolve(invoice)
    }, 500)
  })
}

export const downloadInvoice = (id: string): Promise<Blob> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Blob([`Invoice PDF content for ${id}`], { type: 'application/pdf' }))
    }, 500)
  })
}

export const payInvoice = (id: string): Promise<Invoice> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const invoice = mockInvoices.find((inv) => inv.id === id)
      if (!invoice) {
        reject(new Error('Invoice not found'))
        return
      }

      const paidInvoice = { ...invoice, status: 'paid' as const }
      resolve(paidInvoice)
    }, 1000)
  })
}
