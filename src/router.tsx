import Upgrade from './pages/Upgrade';
import ResetPassword from './pages/ResetPassword';
import Success from "./pages/Success";
import AdminDrugs from '@/pages/admin/AdminDrugs'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleBasedRoute } from '@/components/RoleBasedRoute'
import { PermissionBasedRoute } from '@/components/PermissionBasedRoute'

import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import BillingSuccess from '@/pages/BillingSuccess'
import BillingPage from '@/pages/BillingPage'

import AdminLayout from '@/layouts/AdminLayout'
import AdminBillingPage from '@/pages/admin/BillingPage'
import ClientLayout from '@/layouts/ClientLayout'

/* ================= ADMIN PAGES ================= */

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminClients from '@/pages/admin/Clients'
import AdminClientProfile from '@/pages/admin/ClientProfile'
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
import Register from './pages/Register';

const QuotesEntryRedirect = () => {
  const { user } = useAuth()
  const { features } = useFeatures()
  const { departmentFeatures } = useDepartmentFeatures()

  if (!features || !departmentFeatures) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>
  }

  if (!features.quotesEnabled || !departmentFeatures.quotesEnabled) {
    return <Navigate to="/unauthorized" replace />
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/quotes" replace />
  }

  return <Navigate to="/admin/quotes" replace />
}

const ErrorFallback = () => (
  <div style={{ padding: 32, textAlign: 'center', color: '#b91c1c' }}>
    <h2>שגיאה בטעינת הדף</h2>
    <p>ייתכן שהדף לא קיים או שישנה בעיה זמנית.</p>
    <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 24px', background: '#f87171', color: 'white', border: 'none', borderRadius: 4 }}>
      רענן דף
    </button>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/success',
    element: <Success />,
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
    path: '/reset-password',
    element: <ResetPassword />,
  },

  {
    path: '/upgrade',
    element: <Upgrade />,
  },

  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },

  {
    path: '/billing/success',
    element: <BillingSuccess />,
  },

  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <BillingPage />
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
        <AdminLayout />
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
            <AdminClientProfile />
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
          <PermissionBasedRoute requiredPermission="manage_whatsapp">
            <AdminWhatsApp />
          </PermissionBasedRoute>
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

  /* ================= STAFF ================= */

  {
    path: '/staff',
    element: (
      <ProtectedRoute>
        <AdminLayout />
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
            <AdminClientProfile />
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