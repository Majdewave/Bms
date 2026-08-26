
import { updateLastActivity, getLastActivity, isSessionExpired, resetSession } from './sessionManager'
import { logout as doLogout } from './auth'
import { toast } from 'react-toastify';
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
let isTrialRedirecting = false;

const navigateWithinApp = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const BASE_URL = getApiBaseUrl()

type RequestOptions = RequestInit & {
  isFormData?: boolean
  expectNoContent?: boolean
}

const isAuthRelatedEndpoint = (url: string): boolean => {
  return url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register')
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  // Idle timeout check
  if (isSessionExpired()) {
    await doLogout()
    navigateWithinApp('/login')
    throw new Error('Session expired due to inactivity')
  }

  // Update last activity
  updateLastActivity()

  const authToken = localStorage.getItem('token')
  const isFormDataRequest = options.isFormData === true || options.body instanceof FormData
  let headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept-Language': localStorage.getItem('language') || 'en',
    ...(options.headers as Record<string, string>),
  };
  if (isFormDataRequest) {
    delete headers['Content-Type'];
  }
  if (authToken && !isAuthRelatedEndpoint(url)) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include'
  };
  // Log full request details
  if (fetchOptions.body) {
  }

  let response = await fetch(`${BASE_URL}${url}`, fetchOptions)

  // Auto-refresh on 401
  if (response.status === 401 && !isAuthRelatedEndpoint(url)) {
    try {
      // Try refresh
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (refreshRes.ok) {
        // Assume new token is set via httpOnly cookie or similar
        // Retry original request
        response = await fetch(`${BASE_URL}${url}`, fetchOptions)
        if (response.status !== 401) {
          // Success on retry, continue
        } else {
          // Still 401 after refresh, logout
          await doLogout()
          navigateWithinApp('/login')
          throw new ApiError('Unauthorized after refresh', 401)
        }
      } else {
        // Refresh failed, logout
        await doLogout()
        navigateWithinApp('/login')
        throw new ApiError('Session expired', 401)
      }
    } catch (e) {
      await doLogout()
      navigateWithinApp('/login')
      throw new ApiError('Session expired', 401)
    }
  }

  if (!response.ok) {
    if (response.status === 402) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {}
      if (
        errorData?.error === "trial_expired" &&
        !isTrialRedirecting &&
        window.location.pathname !== "/upgrade"
      ) {
        isTrialRedirecting = true;
        const plan = errorData.plan || "התוכנית שלך";
        const date = errorData.trialEndedAt
          ? new Date(errorData.trialEndedAt).toLocaleDateString("he-IL")
          : "";
        const message = `⛔ ${plan} הסתיים${date ? ` בתאריך ${date}` : ""}. יש לשדרג כדי להמשיך.`;
        if (!toast.isActive("trial-expired")) {
          toast.error(message, {
            toastId: "trial-expired",
            autoClose: 2500,
            pauseOnHover: false,
            closeOnClick: true,
          });
        }
        localStorage.removeItem("token");
        setTimeout(() => {
          const tenantId = localStorage.getItem("tenantId");
          navigateWithinApp(`/upgrade?tenantId=${tenantId}`);
        }, 3500);
        return Promise.reject(new ApiError("Trial expired", 402, errorData));
      }
    }
    if (response.status === 403) {
      let errorMessage = `Request failed with status ${response.status}`
      let errorData: any = {}
      try {
        const text = await response.text()
        if (text) {
          try {
            errorData = JSON.parse(text)
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch {
            errorMessage = text
          }
        }
      } catch {
        // ignore parse errors and keep fallback message
      }

      if (isAuthRelatedEndpoint(url)) {
        throw new ApiError(errorMessage, 403, errorData)
      }

      return { forbidden: true, ...errorData } as T;
    }
    let errorMessage = `Request failed with status ${response.status}`
    let errorData: any
    try {
      const text = await response.text()
      console.error(`[API Error] Status: ${response.status}`)
      console.error(`[API Error] Response:`, text)
      try {
        errorData = JSON.parse(text)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = text || errorMessage
      }
    } catch {}
    throw new ApiError(errorMessage, response.status, errorData)
  }

  if (options.expectNoContent && response.status !== 204) {
    throw new ApiError(`Expected 204 response, received ${response.status}`, response.status)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }
  try {
    return await response.json()
  } catch {
    return {} as T
  }
}

async function requestBlob(
  url: string,
  options: RequestOptions = {}
): Promise<Blob> {

  let headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  const isAuthRelatedEndpoint = (url: string): boolean => {
  return url.startsWith('/api/auth');
};

const authToken = localStorage.getItem('token');

if (authToken && !isAuthRelatedEndpoint(url)) {
  headers['Authorization'] = `Bearer ${authToken}`;
}


  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  const response = await fetch(`${BASE_URL}${url}`, fetchOptions)

if (response.status === 401) {
  console.warn('401 Unauthorized for:', url);
  throw new ApiError('Unauthorized', 401);
}

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status)
  }

  return await response.blob()
}

export async function get<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: 'GET',
  })
}

export async function getBlob(url: string): Promise<Blob> {
  return requestBlob(url, {
    method: 'GET',
  })
}

export async function post<T>(url: string, body?: any, isFormData?: boolean): Promise<T> {
  const isFormDataRequest = isFormData === true || body instanceof FormData
  let requestBody: any = body;
  if (!isFormDataRequest) {
    requestBody = JSON.stringify(body ?? {});
  }
  return request<T>(url, {
    method: 'POST',
    body: requestBody,
    ...(isFormDataRequest ? { isFormData: true } : {})
  });
}

export async function put<T>(url: string, body?: any, isFormData?: boolean): Promise<T> {
  const isFormDataRequest = isFormData === true || body instanceof FormData
  const requestBody = isFormDataRequest ? body : JSON.stringify(body ?? {})

  if (!isFormDataRequest) {
    console.log('[PUT Request] Body (after stringify):', requestBody)
  }
  
  return request<T>(url, {
    method: 'PUT',
    body: requestBody,
    ...(isFormDataRequest ? { isFormData: true } : {})
  })
}

export async function del<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: 'DELETE',
  })
}

export async function delNoContent(url: string): Promise<void> {
  await request<void>(url, {
    method: 'DELETE',
    expectNoContent: true,
  })
}

export { ApiError }
