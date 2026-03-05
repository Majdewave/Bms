const BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000'

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
  options: RequestInit = {}
): Promise<T> {
  const authToken = localStorage.getItem('authToken')

  let headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers as Record<string, string>),
  };
  // Remove Content-Type if isFormData is true
  if ((options as any).isFormData) {
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

  // Handle 401 Unauthorized - remove token
  if (response.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/'
    throw new ApiError('Unauthorized', 401)
  }

  // Handle non-ok responses
  if (!response.ok) {
    if (response.status === 403) {
      console.warn("Forbidden request:", url)
      return null as T
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

export async function get<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: 'GET',
  })
}

export async function post<T>(url: string, body?: any, isFormData?: boolean): Promise<T> {
  console.log('[POST Request] URL:', url)
  console.log('[POST Request] Body (before stringify):', body)
  let requestBody: any = body;
  if (!isFormData) {
    requestBody = JSON.stringify(body ?? {});
    console.log('[POST Request] Body (after stringify):', requestBody);
  }
  return request<T>(url, {
    method: 'POST',
    body: requestBody,
    ...(isFormData ? { isFormData: true } : {})
  });
}

export async function put<T>(url: string, body?: any): Promise<T> {
  console.log('[PUT Request] URL:', url)
  console.log('[PUT Request] Body (before stringify):', body)
  const bodyString = JSON.stringify(body ?? {})
  console.log('[PUT Request] Body (after stringify):', bodyString)
  
  return request<T>(url, {
    method: 'PUT',
    body: bodyString
  })
}

export async function del<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: 'DELETE',
  })
}

export { ApiError }
