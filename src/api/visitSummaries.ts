import { del, get, post, put } from './apiClient';

export interface VisitSummary {
  id: string;
  clientId: string;
  appointmentId?: string | null;
  staffId?: string | null;
  examination: string;
  diagnosis: string;
  recommendations: string;
  createdAt?: string;
}

export type CreateVisitSummaryRequest = Omit<VisitSummary, 'id' | 'createdAt'> & {
  appointmentId: string;
}

export const visitSummariesService = {
  create: async (payload: CreateVisitSummaryRequest) => {
    return await post<VisitSummary>('/api/VisitSummary', payload);
  },

  getById: async (id: string) => {
    return await get<VisitSummary>(`/api/VisitSummary/${id}`);
  },

  getByClientId: async (clientId: string) => {
    return await get<VisitSummary[]>(`/api/VisitSummary/client/${clientId}`);
  },


  update: async (id: string, data: Partial<VisitSummary>) => {
    return await put(`/api/VisitSummary/${id}`, data);
    },

    delete: async (id: string) => {
    return await del(`/api/VisitSummary/${id}`);
    },

  async openPdf(id: string) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('אין הרשאה');
    return;
  }
  try {
        const baseUrl =
        (import.meta as any).env.VITE_API_URL || 'http://localhost:5146';

        const response = await fetch(
        `${baseUrl}/api/VisitSummary/${id}/pdf`,
        {
            headers: {
            Authorization: `Bearer ${token}`
            }
        }
        );

    if (!response.ok) {
      const text = await response.text();
      console.error('PDF ERROR:', text);
      alert('שגיאה בטעינת PDF');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `visit-summary-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert('שגיאה בפתיחת PDF');
  }
}
};