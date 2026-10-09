import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { listStock } from "../../api/stock"
import { listProducts } from "../../api/products"
import { listWarehouses } from "../../api/warehouses"
import { listLocations } from "../../api/locations"
import { Card, CardBody } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { ScaleIcon } from "../../components/ui/icons"

export default function StockPage() {
  const [productId, setProductId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [locationId, setLocationId] = useState("")

  const { data: products } = useApi(() => listProducts(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const { data: locations } = useApi(
    () => listLocations(warehouseId ? { warehouseId } : {}),
    [warehouseId],
  )

  const {
    data: stock,
    error,
    isLoading,
    refetch,
  } = useApi(
    () => listStock({ productId: productId || undefined, warehouseId: warehouseId || undefined, locationId: locationId || undefined }),
    [productId, warehouseId, locationId],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Stock Overview</h1>
        <p className="text-sm text-slate-500">Current quantities by product, warehouse, and location.</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Product" placeholder="All products" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
          <Select
            label="Warehouse"
            placeholder="All warehouses"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value)
              setLocationId("")
            }}
          >
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select label="Location" placeholder="All locations" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        {isLoading && <LoadingState label="Loading stock..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && stock && stock.length === 0 && (
          <EmptyState icon={<ScaleIcon className="h-8 w-8" />} title="No stock records found" />
        )}
        {!isLoading && !error && stock && stock.length > 0 && (
          <Table>
            <THead>
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH>Warehouse</TH>
              <TH>Location</TH>
              <TH className="text-right">Quantity</TH>
            </THead>
            <TBody>
              {stock.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.product?.name ?? "—"}</TD>
                  <TD className="text-slate-400">{s.product?.sku ?? "—"}</TD>
                  <TD className="text-slate-400">{s.location?.warehouse?.name ?? "—"}</TD>
                  <TD className="text-slate-400">{s.location?.name ?? "—"}</TD>
                  <TD className="text-right">
                    {s.quantity <= 0 ? (
                      <Badge tone="danger">{s.quantity}</Badge>
                    ) : (
                      <span className="font-medium text-slate-100">{s.quantity}</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
