import axios from 'axios'

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  timestamp: string
}

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 发起 GET 请求，返回统一格式的 ApiResponse
 */
export async function get<T>(url: string): Promise<ApiResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(url)
  return response.data
}

/**
 * 发起 POST 请求，返回统一格式的 ApiResponse
 */
export async function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, body)
  return response.data
}

/**
 * 发起 PUT 请求，返回统一格式的 ApiResponse
 */
export async function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await apiClient.put<ApiResponse<T>>(url, body)
  return response.data
}

/**
 * 发起 multipart/form-data POST 请求，返回统一格式的 ApiResponse
 */
export async function postForm<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

const client = { get, post, put, postForm }
export default client
