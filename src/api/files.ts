// Files API
export interface StorageFile {
  id: string
  name: string
  size: string
  type: string
  date: string
  category: 'document' | 'contract' | 'report' | 'other'
  description?: string
  url?: string
}

const mockFiles: StorageFile[] = [
  {
    id: '1',
    name: 'Service Agreement 2024.pdf',
    size: '2.4 MB',
    type: 'PDF',
    date: '2024-02-01',
    category: 'contract',
    description: 'Annual service agreement for 2024 with terms and conditions',
  },
  {
    id: '2',
    name: 'Q4 Financial Report.xlsx',
    size: '1.2 MB',
    type: 'Excel',
    date: '2024-01-31',
    category: 'report',
    description: 'Quarterly financial report covering October-December 2023',
  },
  {
    id: '3',
    name: 'Project Proposal Draft.docx',
    size: '512 KB',
    type: 'Word',
    date: '2024-01-28',
    category: 'document',
    description: 'Initial proposal draft for the Q1 2024 project initiative',
  },
  {
    id: '4',
    name: 'Invoice Summary.pdf',
    size: '850 KB',
    type: 'PDF',
    date: '2024-01-25',
    category: 'document',
    description: 'Summary of all invoices issued in January 2024',
  },
  {
    id: '5',
    name: 'Tax Return 2023.pdf',
    size: '3.1 MB',
    type: 'PDF',
    date: '2024-01-15',
    category: 'document',
    description: 'Complete tax return filing for fiscal year 2023',
  },
  {
    id: '6',
    name: 'Compliance Checklist.xlsx',
    size: '650 KB',
    type: 'Excel',
    date: '2024-01-10',
    category: 'report',
    description: 'Annual compliance checklist and audit requirements',
  },
  {
    id: '7',
    name: 'Partnership Agreement.pdf',
    size: '1.8 MB',
    type: 'PDF',
    date: '2023-12-28',
    category: 'contract',
    description: 'Strategic partnership agreement with renewal terms',
  },
  {
    id: '8',
    name: 'Meeting Minutes - December.docx',
    size: '420 KB',
    type: 'Word',
    date: '2023-12-20',
    category: 'document',
    description: 'Official meeting minutes from December board meeting',
  },
  {
    id: '9',
    name: 'Annual Budget Plan 2024.xlsx',
    size: '2.3 MB',
    type: 'Excel',
    date: '2023-12-15',
    category: 'report',
    description: 'Comprehensive budget plan and financial projections for 2024',
  },
]

export const getFiles = (): Promise<StorageFile[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockFiles)
    }, 500)
  })
}

export const uploadFile = (file: File, category: string): Promise<StorageFile> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type.split('/')[1] || 'File',
        date: new Date().toISOString().split('T')[0],
        category: (category as any) || 'other',
        description: 'Newly uploaded file',
      })
    }, 1000)
  })
}

export const deleteFile = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const fileExists = mockFiles.some((f) => f.id === id)
      if (!fileExists) {
        reject(new Error('File not found'))
        return
      }
      resolve()
    }, 500)
  })
}

export const downloadFile = (id: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const fileExists = mockFiles.some((f) => f.id === id)
      if (!fileExists) {
        reject(new Error('File not found'))
        return
      }
      resolve(new Blob(['File content'], { type: 'application/octet-stream' }))
    }, 500)
  })
}

export const shareFile = (id: string, email: string): Promise<{ success: boolean }> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email) {
        reject(new Error('Email is required'))
        return
      }
      resolve({ success: true })
    }, 800)
  })
}
