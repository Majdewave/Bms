import { UserRole } from '@/contexts/AuthContext'

/**
 * Permission system for role-based access control
 * Defines what actions each role can perform
 */

export type Permission =
  | 'manage_clients' // Add, edit, delete clients
  | 'manage_client_activation' // Activate/block clients
  | 'send_client_links' // Send login/reset links
  | 'manage_staff' // Add, edit, delete staff users
  | 'manage_business_settings' // Business settings, system configuration
  | 'manage_appointments' // All appointment management
  | 'manage_invoices' // All invoice management
  | 'view_reports' // View system reports

/**
 * Permission matrix: which roles have which permissions
 */
export const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  admin: [
    'manage_clients',
    'manage_client_activation',
    'send_client_links',
    'manage_staff',
    'manage_business_settings',
    'manage_appointments',
    'manage_invoices',
    'view_reports',
  ],
  staff: [
    'manage_clients', // Can add, edit, delete clients
    'manage_client_activation', // Can activate/block clients
    'send_client_links', // Can send login/reset links
    'manage_appointments', // Can manage their clients' appointments
  ],
  client: [],
}

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(user: { role: UserRole, permissions?: Permission[] } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.includes(permission) ?? false;
}

/**
 * Check if a user role has any of the given permissions
 */
export const hasAnyPermission = (role: UserRole, permissions: Permission[]): boolean => {
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Check if a user role has all of the given permissions
 */
export const hasAllPermissions = (role: UserRole, permissions: Permission[]): boolean => {
  return permissions.every((permission) => hasPermission(role, permission))
}
