import * as stripeApi from "./stripe";
export const stripeService = stripeApi;
// API Service Exports
import * as authApi from './auth'
import * as dashboardApi from './dashboard'
import * as appointmentsApi from './appointments'
import * as invoicesApi from './invoices'
import * as filesApi from './files'
import * as profileApi from './profile'
import * as clientsApi from './clients'
import * as staffApi from './staff'
import * as clientPhotosApi from './clientPhotosService'


// Export service objects
export const authService = authApi
export const dashboardService = dashboardApi
export const appointmentsService = appointmentsApi
export const invoicesService = invoicesApi
export const filesService = filesApi
export const profileService = profileApi
export const clientsService = clientsApi
export const staffService = staffApi
export const clientPhotosService = clientPhotosApi



// Export types
export type { LoginRequest, LoginResponse, AuthUser } from './auth'
export type { DashboardData, AdminDashboardStats, RecentActivity } from './dashboard'
export type { Appointment, AppointmentClient } from './appointments'
export type { Invoice } from './invoices'
export type { StorageFile } from './files'
export type { UserProfile, PasswordChangeRequest } from './profile'
export type {
  Client,
  ClientDetails,
  ClientAppointment,
  ClientInvoice,
  ClientFile,
  ClientNote,
} from './clients'
export type {
  StaffMember,
  StaffPermission,
  VisibleMenuItem,
  CreateStaffRequest,
  UpdateStaffRequest,
} from './staff'



