// Thin fetch wrapper shared by every domain module in `api/`.
//
// The backend's response envelope is INCONSISTENT BY DESIGN across the
// three merged modules (see v0_plans/light-build.md):
//   - Foundation endpoints wrap success responses as { success, data }.
//   - Operations + Intelligence endpoints return the raw JSON body.
//   - Every error (any module) is { success: false, message, code }.
// `apiFetch` normalizes only the error path (throws ApiError). Callers
// decide whether to unwrap `.data` (foundation) or use the body directly
// (operations/intelligence) via the `envelope` flag.

const TOKEN_KEY = "stocksense_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Set by AuthProvider so a 401 from any request can force a logout/redirect.
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}${buildQuery(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.()
    const message =
      (body && typeof body === "object" && "message" in body && String(body.message)) ||
      `Request failed with status ${res.status}`
    const code = body && typeof body === "object" && "code" in body ? String(body.code) : undefined
    throw new ApiError(message, res.status, code)
  }

  return body as T
}

// Foundation-style envelope: { success, data }
export async function apiFetchEnveloped<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const body = await apiFetch<{ success: boolean; data: T; message?: string }>(path, options)
  return body.data
}
