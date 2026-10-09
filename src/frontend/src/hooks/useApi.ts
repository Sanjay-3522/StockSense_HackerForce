import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../api/client"

interface UseApiState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/**
 * Minimal fetch-on-mount(+deps) hook with loading/error state and a
 * `refetch` escape hatch. Intentionally small — no client-side caching or
 * business-logic recomputation; every value returned is exactly what the
 * API sent.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, error: null, isLoading: true })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, isLoading: false })
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again."
          setState({ data: null, error: message, isLoading: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => load(), [load])

  return { ...state, refetch: load }
}
