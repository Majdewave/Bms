const BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://clienta.digitalpenpro.com'

type RequestOptions = RequestInit & {
  isFormData?: boolean
}

const isAuthRelatedEndpoint = (url: string): boolean => {
  return url.startsWith('/api/auth') || url.startsWith('/api/account')
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
  const authToken = localStorage.getItem('authToken')

  const isFormDataRequest = options.isFormData === true || options.body instanceof FormData

  let headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers as Record<string, string>),
  };
  // Remove Content-Type for FormData, browser will set multipart boundary
  if (isFormDataRequest) {
    delete headers['Content-Type'];
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include'
  };

  // Log full request details
  console.log(`[API Request] ${options.method || 'GET'} ${BASE_URL}${url}`)
  console.log('[API Request Headers]', headers)
  if (fetchOptions.body) {
    console.log('[API Request Body]', fetchOptions.body)
  }
  console.log("BASE_URL:", BASE_URL);

  const response = await fetch(`${BASE_URL}${url}`, fetchOptions)

  // Handle 401 Unauthorized only for auth-related endpoints
  if (response.status === 401) {
    if (isAuthRelatedEndpoint(url)) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
    }
    throw new ApiError('Unauthorized', 401)
  }

  // Handle non-ok responses
  if (!response.ok) {
    if (response.status === 403) {
      // Return a structured forbidden response
      return { forbidden: true } as T;
    }
    let errorMessage = `Request failed with status ${response.status}`
    let errorData: any
    try {
      const text = await response.text()
      // Log response status and text for non-ok responses
      console.error(`[API Error] Status: ${response.status}`)
      console.error(`[API Error] Response:`, text)
      try {
        errorData = JSON.parse(text)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // Response is not JSON
        errorMessage = text || errorMessage
      }
    } catch {
      // Could not read response body
    }
    throw new ApiError(errorMessage, response.status, errorData)
  }

  // Handle empty responses (204 No Content, etc.)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  // Parse JSON response
  try {
    return await response.json()
  } catch {
    // If JSON parsing fails, return empty object
    return {} as T
  }
}

async function requestBlob(
  url: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const authToken = localStorage.getItem('authToken')

  let headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  const response = await fetch(`${BASE_URL}${url}`, fetchOptions)

  if (response.status === 401) {
    if (isAuthRelatedEndpoint(url)) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
    }
    throw new ApiError('Unauthorized', 401)
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
  console.log('[POST Request] URL:', url)
  console.log('[POST Request] Body (before stringify):', body)
  const isFormDataRequest = isFormData === true || body instanceof FormData
  let requestBody: any = body;
  if (!isFormDataRequest) {
    requestBody = JSON.stringify(body ?? {});
    console.log('[POST Request] Body (after stringify):', requestBody);
  }
  return request<T>(url, {
    method: 'POST',
    body: requestBody,
    ...(isFormDataRequest ? { isFormData: true } : {})
  });
}

export async function put<T>(url: string, body?: any, isFormData?: boolean): Promise<T> {
  console.log('[PUT Request] URL:', url)
  console.log('[PUT Request] Body (before stringify):', body)
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

export { ApiError }
