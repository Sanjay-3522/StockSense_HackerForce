import { apiFetchEnveloped } from "./client"
import type { Location } from "../types"

export interface LocationInput {
  warehouseId: string
  code: string
  name: string
  zone?: string
  isActive?: boolean
}

export const listLocations = (filters: { warehouseId?: string; isActive?: boolean } = {}) =>
  apiFetchEnveloped<Location[]>("/locations", { query: filters })

export const getLocation = (id: string) => apiFetchEnveloped<Location>(`/locations/${id}`)

export const createLocation = (data: LocationInput) =>
  apiFetchEnveloped<Location>("/locations", { method: "POST", body: data })

export const updateLocation = (id: string, data: Partial<LocationInput>) =>
  apiFetchEnveloped<Location>(`/locations/${id}`, { method: "PUT", body: data })

export const deleteLocation = (id: string) =>
  apiFetchEnveloped<Location>(`/locations/${id}`, { method: "DELETE" })
