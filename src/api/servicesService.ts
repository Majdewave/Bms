import * as apiClient from "./apiClient";

export interface BusinessService {
  id: string;
  name: string;
  defaultDurationMinutes: number;
  consentTemplateId?: string | null;
  consentTemplateContent?: string | null;
}

export const servicesService = {
  async getServices(): Promise<BusinessService[]> {
    return apiClient.get("/api/services");
  },

  async create(data: Partial<BusinessService>) {
    return apiClient.post("/api/services", data);
  },

  async update(id: string, data: Partial<BusinessService>) {
    return apiClient.put(`/api/services/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.del(`/api/services/${id}`);
  }
};