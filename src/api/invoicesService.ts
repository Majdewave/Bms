// Mock Invoices Service
export interface Invoice {
  id: string
  number: string
  amount: number
  date: string
  dueDate: string
  status: 'paid' | 'pending' | 'overdue'
  description?: string
}

class InvoicesService {
  async getInvoices(): Promise<Invoice[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            number: 'INV-2024-001',
            amount: 2500.0,
            date: '2024-02-01',
            dueDate: '2024-02-15',
            status: 'paid',
          },
          {
            id: '2',
            number: 'INV-2024-002',
            amount: 3750.5,
            date: '2024-02-05',
            dueDate: '2024-02-20',
            status: 'pending',
          },
          {
            id: '3',
            number: 'INV-2024-003',
            amount: 1200.0,
            date: '2024-01-20',
            dueDate: '2024-02-03',
            status: 'overdue',
          },
        ])
      }, 500)
    })
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          number: 'INV-2024-001',
          amount: 2500.0,
          date: '2024-02-01',
          dueDate: '2024-02-15',
          status: 'paid',
        })
      }, 300)
    })
  }

  async createInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          ...invoice,
        })
      }, 500)
    })
  }

  async downloadInvoice(id: string): Promise<Blob> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(new Blob(['Invoice PDF content'], { type: 'application/pdf' }))
      }, 500)
    })
  }
}

export const invoicesService = new InvoicesService()
