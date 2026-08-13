import { del, get, post, put } from './apiClient';

export interface VisitSummary {
  id: string;
  clientId: string;
  appointmentId?: string | null;
  staffId?: string | null;
  examination: string;
  diagnosis: string;
  recommendations: string;
  visitDate?: string;
  createdAt?: string;
}

export type CreateVisitSummaryRequest = Omit<VisitSummary, 'id' | 'createdAt'> & {
  appointmentId: string;
}

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value
    }
  }
  return undefined
}

const pickNullableString = (...values: unknown[]): string | null | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value
    }
    if (value === null) {
      return null
    }
  }
  return undefined
}

const normalizeVisitSummary = (raw: any): VisitSummary => {
  const item = raw?.data ?? raw
  const createdAt = pickString(item?.createdAt, item?.CreatedAt)
  const fallbackId = pickString(
    item?.id,
    item?.Id,
    item?.visitSummaryId,
    item?.VisitSummaryId,
    item?.summaryId,
    item?.SummaryId,
  )

  return {
    id: fallbackId || '',
    clientId: pickString(item?.clientId, item?.ClientId) || '',
    appointmentId: pickNullableString(item?.appointmentId, item?.AppointmentId) ?? null,
    staffId: pickNullableString(item?.staffId, item?.StaffId) ?? null,
    examination: pickString(item?.examination, item?.Examination, item?.exam, item?.Exam) || '',
    diagnosis: pickString(item?.diagnosis, item?.Diagnosis) || '',
    recommendations:
      pickString(
        item?.recommendations,
        item?.Recommendations,
        item?.treatmentRecommendations,
        item?.TreatmentRecommendations,
      ) || '',
    visitDate: pickString(item?.visitDate, item?.VisitDate, item?.date, item?.Date, createdAt),
    createdAt,
  }
}

export const visitSummariesService = {
  create: async (payload: CreateVisitSummaryRequest) => {
    const response = await post<any>('/api/VisitSummary', payload)
    return normalizeVisitSummary(response)
  },

  getById: async (id: string) => {
    const cacheBust = Date.now()
    const response = await get<any>(`/api/VisitSummary/${id}?_=${cacheBust}`)
    return normalizeVisitSummary(response)
  },

  getByClientId: async (clientId: string) => {
    const response = await get<any>(`/api/VisitSummary/client/${clientId}`)
    const list = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.items)
      ? response.items
      : []

    return list.map(normalizeVisitSummary)
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