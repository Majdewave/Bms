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

export const getInvoices = (): Promise<Invoice[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockInvoices)
    }, 500)
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

export const createInvoice = (invoice: Omit<Invoice, 'id' | 'number'>): Promise<Invoice> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(mockInvoices.length + 1).padStart(3, '0')}`
      const newInvoice: Invoice = {
        id: Math.random().toString(36).substr(2, 9),
        number: invoiceNumber,
        ...invoice,
      }
      mockInvoices.push(newInvoice)
      resolve(newInvoice)
    }, 800)
  })
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
      resolve(new Blob(['Invoice PDF content'], { type: 'application/pdf' }))
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
