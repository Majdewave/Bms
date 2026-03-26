import { post, get } from './apiClient'

// Authentication API
export type UserRole = 'admin' | 'staff' | 'client'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  businessId?: string
  avatar?: string
  stampUrl?: string
  useStamp?: boolean
}

export interface LoginResponse {
  user: AuthUser
  token: string
}

// ...existing code...
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await post<{ token: string }>('/api/auth/login', credentials)

  localStorage.setItem('authToken', response.token)

  const user = await getCurrentUser()

  return {
    user: user as AuthUser,
    token: response.token,
  }
}

export const logout = (): Promise<void> => {
  return Promise.resolve()
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    return null
  }

  try {
    const user = await get<AuthUser>('/api/auth/me')
    return user
  } catch (error) {
    return null
  }
}
