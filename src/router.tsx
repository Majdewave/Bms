import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleBasedRoute } from '@/components/RoleBasedRoute'
import { PermissionBasedRoute } from '@/components/PermissionBasedRoute'

import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import BillingSuccess from '@/pages/BillingSuccess'
import BillingPage from '@/pages/BillingPage'

import AdminLayout from '@/layouts/AdminLayout'
import ClientLayout from '@/layouts/ClientLayout'

/* ================= ADMIN PAGES ================= */

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminClients from '@/pages/admin/Clients'
import AdminClientProfile from '@/pages/admin/ClientProfile'
import EditClient from '@/pages/admin/EditClient'
import AdminAppointments from '@/pages/admin/Appointments'
import AdminInvoices from '@/pages/admin/Invoices'
import AdminReports from '@/pages/admin/Reports'
import AdminBusinessSettings from '@/pages/admin/BusinessSettings'
import AdminStaff from '@/pages/admin/Staff'
import AdminFeatures from '@/pages/admin/Features'

/* ================= STAFF PAGES ================= */

import StaffDashboard from '@/pages/staff/Dashboard'
import StaffAppointments from '@/pages/staff/Appointments'
import StaffClients from '@/pages/staff/Clients'

/* ================= CLIENT PAGES ================= */

import ClientDashboard from '@/pages/client/Dashboard'
import ClientAppointments from '@/pages/client/Appointments'
import ClientInvoices from '@/pages/client/Invoices'
import ClientFiles from '@/pages/client/Files'
import ClientProfile from '@/pages/client/Profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },

  {
    path: '/login',
    element: <Login />,
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
        path: 'dashboard',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminDashboard />
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
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminInvoices />
          </RoleBasedRoute>
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
])