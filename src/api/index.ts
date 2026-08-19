import * as stripeApi from "./stripe";
export const stripeService = stripeApi;
// API Service Exports
import * as authApi from './auth'
import * as dashboardApi from './dashboard'
import * as appointmentsApi from './appointments'
import * as invoicesApi from './invoices'
import * as quotesApi from './quotes'
import * as filesApi from './files'
import * as profileApi from './profile'
import * as clientsApi from './clients'
import * as staffApi from './staff'
import * as clientPhotosApi from './clientPhotosService'
import * as departmentApi from './departmentService'
import * as whatsappApi from './whatsapp'
import * as imagingApi from './imaging'

// Export service objects
export const authService = authApi
export const dashboardService = dashboardApi
export const appointmentsService = appointmentsApi
export const invoicesService = invoicesApi
export const quotesService = quotesApi
export const filesService = filesApi
export const profileService = profileApi
export const clientsService = clientsApi
export const staffService = staffApi
export const clientPhotosService = clientPhotosApi
export const departmentService = departmentApi
export const whatsappService = whatsappApi
export const imagingService = imagingApi

// Export types
export type { LoginRequest, LoginResponse, AuthUser } from './auth'
export type { DashboardData, AdminDashboardStats, RecentActivity } from './dashboard'
export type { Appointment, AppointmentClient } from './appointments'
export type {
  CreateInvoiceLineItemRequest,
  CreateInvoiceRequest,
  Invoice,
  InvoiceLineItem,
} from './invoices'
export type {
  CreateQuoteLineItemRequest,
  CreateQuoteRequest,
  Quote,
  QuoteLineItem,
  QuoteStatus,
} from './quotes'
export type { StorageFile } from './files'
export type { UserProfile, PasswordChangeRequest } from './profile'
export type {
  Client,
  ClientDetails,
  ClientAppointment,
  ClientInvoice,
  ClientFile,
  DuplicateClientIdNumberCheckResponse,
  ClientNote,
} from './clients'
export type {
  StaffMember,
  StaffPermission,
  VisibleMenuItem,
  CreateStaffRequest,
  UpdateStaffRequest,
} from './staff'
export type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from './departmentService'
export type { WhatsAppStatus } from './whatsapp'
export type {
  ImagingStudySummary,
  ImagingStudyHierarchy,
  ImagingSeriesDetail,
  ImagingInstanceDetail,
} from './imaging'



