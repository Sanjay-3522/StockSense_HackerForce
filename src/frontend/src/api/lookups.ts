import { apiFetch } from "./client"

export const getNextReference = (prefix: "RCP" | "DLV" | "TRF" | "ADJ") =>
  apiFetch<{ reference: string }>("/lookups/reference", { query: { prefix } })

export const getLookupStock = (productId: string, locationId: string) =>
  apiFetch<{ quantity: number }>("/lookups/stock", { query: { product_id: productId, location_id: locationId } })
