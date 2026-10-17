import Upgrade from './pages/Upgrade';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Success from "./pages/Success";
import AdminDrugs from '@/pages/admin/AdminDrugs'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleBasedRoute } from '@/components/RoleBasedRoute'
import { PermissionBasedRoute } from '@/components/PermissionBasedRoute'
import { FeatureBasedRoute } from '@/components/FeatureBasedRoute'

import Login from '@/pages/Login'
import QueueDisplayPage from '@/pages/QueueDisplay'
import Unauthorized from '@/pages/Unauthorized'
import BillingSuccess from '@/pages/BillingSuccess'
import BillingPage from '@/pages/BillingPage'

import AdminLayout from '@/layouts/AdminLayout'
import BusinessLayout from '@/layouts/BusinessLayout'
import BusinessDashboard from '@/pages/business/BusinessDashboard'
import BusinessProjectsPage from '@/pages/business/BusinessProjectsPage'
import BusinessFilesPage from '@/pages/business/BusinessFilesPage'
import BusinessBillingPage from '@/pages/business/BusinessBillingPage'
import BusinessPaymentsPage from '@/pages/business/BusinessPaymentsPage'
import { BusinessProductRoute } from '@/components/BusinessProductRoute'
import { BusinessPmRoute } from '@/components/BusinessPmRoute'
import ProductAreaRoute from '@/components/ProductAreaRoute'
import ProjectClientWorkspace from '@/pm/ProjectClientWorkspace'
import AdminBillingPage from '@/pages/admin/BillingPage'
import ClientLayout from '@/layouts/ClientLayout'
import InterpreterLayout from '@/layouts/InterpreterLayout'
import InterpreterRequests from '@/pages/interpreter/Requests'
import InterpreterCase from '@/pages/interpreter/Case'
import InterpreterProfile from '@/pages/interpreter/Profile'

/* ================= ADMIN PAGES ================= */

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminClients from '@/pages/admin/Clients'
import ClientProfileEntry from '@/pages/admin/ClientProfileEntry'
import EditClient from '@/pages/admin/EditClient'
import AdminAppointments from '@/pages/admin/Appointments'
import AdminInvoices from '@/pages/admin/Invoices'
import AdminQuotes from '@/pages/admin/Quotes'
import QuoteDetails from '@/pages/admin/QuoteDetails'
import AdminReports from '@/pages/admin/Reports'
import AdminBusinessSettings from '@/pages/admin/BusinessSettings'
import AdminWhatsApp from '@/pages/admin/WhatsApp'
import AdminStaff from '@/pages/admin/Staff'
import AdminFeatures from '@/pages/admin/Features'

/* ================= STAFF PAGES ================= */

import StaffDashboard from '@/pages/staff/Dashboard'
import StaffAppointments from '@/pages/staff/Appointments'
import StaffClients from '@/pages/staff/Clients'

import VisitSummaryEntry from '@/pages/staff/VisitSummaryEntry'

/* ================= CLIENT PAGES ================= */

import ClientDashboard from '@/pages/client/Dashboard'
import ClientAppointments from '@/pages/client/Appointments'
import ClientInvoices from '@/pages/client/Invoices'
import ClientFiles from '@/pages/client/Files'
import ClientProfile from '@/pages/client/Profile'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import { useTenant } from '@/contexts/TenantContext'
import { PlatformProtectedRoute } from '@/platform/components/PlatformProtectedRoute'
import PlatformLayout from '@/platform/layouts/PlatformLayout'
import PlatformBusinessesPage from '@/platform/pages/PlatformBusinessesPage'
import PlatformBusinessDetailsPage from '@/platform/pages/PlatformBusinessDetailsPage'
import PlatformDashboardPage from '@/platform/pages/PlatformDashboardPage'
import PlatformLoginPage from '@/platform/pages/PlatformLoginPage'
import PlatformPendingApprovalsPage from '@/platform/pages/PlatformPendingApprovalsPage'
import PlatformUsersPage from '@/platform/pages/PlatformUsersPage'
import PlatformSettingsPage from '@/platform/pages/PlatformSettingsPage'
import Register from './pages/Register';

import PrivacyPolicy from '@/pages/legal/PrivacyPolicy'
import TermsOfService from '@/pages/legal/TermsOfService'
import LegalNotice from '@/pages/legal/LegalNotice'
import ProjectBillingPlanPage from '@/pm/ProjectBillingPlanPage'
import PaymentConfirmationPage from '@/pages/public/PaymentConfirmationPage'

const QuotesEntryRedirect = () => {
  const { user } = useAuth()
  const { productType, productResolved } = useTenant()
  const { features } = useFeatures()
  const { departmentFeatures } = useDepartmentFeatures()

  if (!productResolved || !features || !departmentFeatures) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>
  }

  if (productType === 'business') return <Navigate to="/business/quotes" replace />

  if (!features.quotesEnabled || !departmentFeatures.quotesEnabled) {
    return <Navigate to="/unauthorized" replace />
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/quotes" replace />
  }

  return <Navigate to="/admin/quotes" replace />
}

const LegacyBillingRoute = ({ children }: { children: React.ReactNode }) => {
  const { productType, productResolved } = useTenant()
  const { user } = useAuth()

  if (user && !productResolved) return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>
  if (productType === 'business') return <Navigate to="/business/billing" replace />
  return <>{children}</>
}

const ErrorFallback = () => (
  <div style={{ padding: 32, textAlign: 'center', color: '#b91c1c' }}>
    <h2>×©×’×™××” ×‘×˜×¢×™× ×ª ×”×“×£</h2>
    <p>×™×™×ª×›×Ÿ ×©×”×“×£ ×œ× ×§×™×™× ××• ×©×™×©× ×” ×‘×¢×™×” ×–×ž× ×™×ª.</p>
    <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 24px', background: '#f87171', color: 'white', border: 'none', borderRadius: 4 }}>
      ×¨×¢× ×Ÿ ×“×£
    </button>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/success',
    element: <LegacyBillingRoute><Success /></LegacyBillingRoute>,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/register',
    element: <React.Suspense fallback={<div>Loading...</div>}><Register /></React.Suspense>,
  },

  {
    path: '/login',
    element: <Login />,
  },
  {
  path: '/privacy',
  element: <PrivacyPolicy />,
  },

  {
    path: '/terms',
    element: <TermsOfService />,
  },

  {
    path: '/legal',
    element: <LegalNotice />,
  },

  {
    path: '/queue-display/:token',
    element: <QueueDisplayPage />,
  },

  {
    path: '/payment-confirmation/:token',
    element: <PaymentConfirmationPage />,
  },

  {
    path: '/platform/login',
    element: <PlatformLoginPage />,
  },

  {
    path: '/platform',
    element: (
      <PlatformProtectedRoute>
        <PlatformLayout />
      </PlatformProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: <PlatformDashboardPage />,
      },
      {
        path: 'businesses',
        element: <PlatformBusinessesPage />,
      },
      {
        path: 'businesses/:tenantId',
        element: <PlatformBusinessDetailsPage />,
      },
      {
        path: 'pending-approvals',
        element: <PlatformPendingApprovalsPage />,
      },
      {
        path: 'pending-approvals/:tenantId',
        element: <PlatformBusinessDetailsPage />,
      },
      {
        path: 'users',
        element: <PlatformUsersPage />,
      },
      {
        path: 'settings',
        element: <PlatformSettingsPage />,
      },
    ],
  },

  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  
  {
  path: '/account/accept-invite',
  element: <AcceptInvite />,
  },

  {
    path: '/upgrade',
    element: <LegacyBillingRoute><Upgrade /></LegacyBillingRoute>,
  },

  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },

  {
    path: '/billing/success',
    element: <LegacyBillingRoute><BillingSuccess /></LegacyBillingRoute>,
  },

  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <LegacyBillingRoute><BillingPage /></LegacyBillingRoute>
      </ProtectedRoute>
    ),
  },

  {
    path: '/quotes',
    element: (
      <ProtectedRoute>
        <QuotesEntryRedirect />
      </ProtectedRoute>
    ),
  },

  /* ================= ADMIN ================= */

  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <ProductAreaRoute><AdminLayout /></ProductAreaRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      
      {
        path: 'drugs',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminDrugs />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'dashboard',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'billing',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminBillingPage />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'clients',
        element: (
          <PermissionBasedRoute requiredPermission="manage_clients">
            <AdminClients />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients/:id',
        element: (
          <PermissionBasedRoute requiredPermission="manage_clients">
            <ClientProfileEntry />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients/:clientId/projects/:projectId/billing',
        element: (
          <PermissionBasedRoute requiredPermission="manage_projects">
            <ProjectBillingPlanPage />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients/:clientId/edit',
        element: (
          <PermissionBasedRoute requiredPermission="manage_clients">
            <EditClient />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'appointments',
        element: (
          <PermissionBasedRoute requiredPermission="manage_appointments">
            <AdminAppointments />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'invoices',
        element: (
          <PermissionBasedRoute requiredPermission="manage_invoices">
            <AdminInvoices />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'quotes',
        element: (
          <PermissionBasedRoute requiredPermission="manage_quotes">
            <AdminQuotes />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'quotes/:id',
        element: (
          <PermissionBasedRoute requiredPermission="manage_quotes">
            <QuoteDetails />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'reports',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminReports />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'settings',
        element: (
          <PermissionBasedRoute requiredPermission="manage_business_settings">
            <AdminBusinessSettings />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'settings/whatsapp',
        element: (
          <FeatureBasedRoute
            feature="whatsAppEnabled"
            departmentFeature="whatsAppEnabled"
          >
            <PermissionBasedRoute requiredPermission="manage_whatsapp">
              <AdminWhatsApp />
            </PermissionBasedRoute>
          </FeatureBasedRoute>
        ),
      },

      {
        path: 'staff',
        element: (
          <PermissionBasedRoute requiredPermission="manage_staff">
            <AdminStaff />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'features',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminFeatures />
          </RoleBasedRoute>
        ),
      },
    ],
  },

  /* ================= BUSINESS (explicit Business tenants only) ================= */

  {
    path: '/business',
    element: (
      <ProtectedRoute>
        <BusinessProductRoute>
          <RoleBasedRoute allowedRoles={['admin', 'staff']}>
            <BusinessLayout />
          </RoleBasedRoute>
        </BusinessProductRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <BusinessDashboard /> },
      {
        path: 'clients',
        element: (
          <BusinessPmRoute>
            <PermissionBasedRoute requiredPermission="manage_clients">
              <AdminClients />
            </PermissionBasedRoute>
          </BusinessPmRoute>
        ),
      },
      {
        path: 'projects',
        element: (
          <BusinessPmRoute>
            <PermissionBasedRoute requiredPermission="manage_projects">
              <BusinessProjectsPage />
            </PermissionBasedRoute>
          </BusinessPmRoute>
        ),
      },
      {
        path: 'projects/:id',
        element: (
          <BusinessPmRoute>
            <PermissionBasedRoute requiredPermission="manage_clients">
              <ProjectClientWorkspace />
            </PermissionBasedRoute>
          </BusinessPmRoute>
        ),
      },
      {
        path: 'projects/:clientId/projects/:projectId/billing',
        element: (
          <BusinessPmRoute>
            <PermissionBasedRoute requiredPermission="manage_projects">
              <ProjectBillingPlanPage />
            </PermissionBasedRoute>
          </BusinessPmRoute>
        ),
      },
      {
        path: 'quotes',
        element: (
          <PermissionBasedRoute requiredPermission="manage_quotes">
            <AdminQuotes />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'quotes/:id',
        element: (
          <PermissionBasedRoute requiredPermission="manage_quotes">
            <QuoteDetails />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <PermissionBasedRoute requiredPermission="manage_invoices">
            <AdminInvoices />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'payments',
        element: (
          <PermissionBasedRoute requiredPermission="manage_invoices">
            <BusinessPaymentsPage />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'files',
        element: (
          <PermissionBasedRoute requiredPermission="manage_files">
            <BusinessFilesPage />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'team',
        element: <AdminStaff />,
      },
      {
        path: 'settings',
        element: (
          <PermissionBasedRoute requiredPermission="manage_business_settings">
            <AdminBusinessSettings />
          </PermissionBasedRoute>
        ),
      },
      {
        path: 'billing',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <BusinessBillingPage />
          </RoleBasedRoute>
        ),
      },
    ],
  },

  /* ================= STAFF ================= */

  {
    path: '/staff',
    element: (
      <ProtectedRoute>
        <ProductAreaRoute><AdminLayout /></ProductAreaRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },

      {
        path: 'dashboard',
        element: (
          <RoleBasedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'appointments',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_appointments"
          >
            <StaffAppointments />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_clients"
          >
            <StaffClients />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients/:id',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_clients"
          >
            <ClientProfileEntry />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'clients/:clientId/projects/:projectId/billing',
        element: (
          <PermissionBasedRoute allowedRoles={['staff']} requiredPermission="manage_projects">
            <ProjectBillingPlanPage />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'invoices',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_invoices"
          >
            <AdminInvoices />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'quotes',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_quotes"
          >
            <AdminQuotes />
          </PermissionBasedRoute>
        ),
      },

      {
        path: 'quotes/:id',
        element: (
          <PermissionBasedRoute
            allowedRoles={['staff']}
            requiredPermission="manage_quotes"
          >
            <QuoteDetails />
          </PermissionBasedRoute>
        ),
      },

        // Visit Summary Form
        {
          path: 'visit-summary/:clientId',
          element: <VisitSummaryEntry />,
        },
    ],
  },

  /* ================= INTERPRETER ================= */

  {
    path: '/interpreter',
    element: (
      <ProtectedRoute>
        <RoleBasedRoute allowedRoles={['interpreter']}>
          <InterpreterLayout />
        </RoleBasedRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="requests" replace /> },

      {
        path: 'requests',
        element: <InterpreterRequests />,
      },

      {
        path: 'requests/:requestId',
        element: <InterpreterCase />,
      },
      {
        path: 'profile',
        element: <InterpreterProfile />,
      },
    ],
  },

  /* ================= CLIENT ================= */

  {
    path: '/client',
    element: (
      <ProtectedRoute>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },

      {
        path: 'dashboard',
        element: (
          <RoleBasedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'appointments',
        element: (
          <RoleBasedRoute allowedRoles={['client']}>
            <ClientAppointments />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'invoices',
        element: (
          <RoleBasedRoute allowedRoles={['client']}>
            <ClientInvoices />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'files',
        element: (
          <RoleBasedRoute allowedRoles={['client']}>
            <ClientFiles />
          </RoleBasedRoute>
        ),
      },

      {
        path: 'profile',
        element: (
          <RoleBasedRoute allowedRoles={['client']}>
            <ClientProfile />
          </RoleBasedRoute>
        ),
      },
    ],
  },
], {
  // fallback error element for all routes
  errorElement: <ErrorFallback />,
})

