import * as apiClient from "./apiClient";

export interface BusinessService {
  id: string;
  name: string;
  defaultDurationMinutes: number;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentColor?: string | null;
  consentTemplateId?: string | null;
  consentTemplateContent?: string | null;
}

export interface SaveBusinessServiceRequest {
  name: string;
  defaultDurationMinutes: number;
  departmentId: string;
}

export const servicesService = {
  async getServices(): Promise<BusinessService[]> {
    return apiClient.get("/api/services");
  },

  async create(data: SaveBusinessServiceRequest) {
    return apiClient.post("/api/services", data);
  },

  async update(id: string, data: SaveBusinessServiceRequest) {
    return apiClient.put(`/api/services/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.del(`/api/services/${id}`);
  }
};