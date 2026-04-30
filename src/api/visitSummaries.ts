import { get, post } from './apiClient';

export interface VisitSummary {
  id: string;
  clientId: string;
  staffId?: string | null;
  examination: string;
  diagnosis: string;
  recommendations: string;
  createdAt?: string;
}

export const visitSummariesService = {
  create: async (payload: Omit<VisitSummary, 'id' | 'createdAt'>) => {
    return await post<VisitSummary>('/api/VisitSummary', payload);
  },

  getById: async (id: string) => {
    return await get<VisitSummary>(`/api/VisitSummary/${id}`);
  },

  getByClientId: async (clientId: string) => {
    return await get<VisitSummary[]>(`/api/VisitSummary/client/${clientId}`);
  },

  openPdf: (id: string) => {
    const base = (import.meta as any).env.VITE_API_URL;
    window.open(`${base}/api/VisitSummary/${id}/pdf`, '_blank');
  }
};