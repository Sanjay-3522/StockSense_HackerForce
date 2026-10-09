import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { explainStockChange } from "../../api/intelligence"
import { listProducts } from "../../api/products"
import { listWarehouses } from "../../api/warehouses"
import { listLocations } from "../../api/locations"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"

export default function ExplainStockChangePage() {
  const [productId, setProductId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [submitted, setSubmitted] = useState<{ productId: string; warehouseId?: string; locationId?: string; from?: string; to?: string } | null>(null)

  const { data: products } = useApi(() => listProducts(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const { data: locations } = useApi(() => listLocations(warehouseId ? { warehouseId } : {}), [warehouseId])

  const {
    data: result,
    error,
    isLoading,
  } = useApi(
    () =>
      submitted
        ? explainStockChange({
            productId: submitted.productId,
            warehouseId: submitted.warehouseId,
            locationId: submitted.locationId,
            from: submitted.from,
            to: submitted.to,
          })
        : Promise.resolve(null),
    [submitted],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    setSubmitted({
      productId,
      warehouseId: warehouseId || undefined,
      locationId: locationId || undefined,
      from: from || undefined,
      to: to || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Explain Stock Change</h1>
        <p className="text-sm text-slate-500">See the real ledger movements that explain a change in stock.</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
            <Select label="Product" required placeholder="Select product" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </Select>
            <Select label="Warehouse" placeholder="Any" value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setLocationId("") }}>
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Select label="Location" placeholder="Any" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <div className="flex items-end gap-2">
              <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button type="submit">Explain</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {isLoading && <LoadingState label="Explaining stock change..." />}
      {error && <ErrorState message={error} />}

      {result && result.state === "NO_DATA" && (
        <Card>
          <EmptyState title="No data" description="No movements were found for this product in the given range." />
        </Card>
      )}

      {result && result.state !== "NO_DATA" && (
        <>
          <Card>
            <CardHeader
              title={result.product.name}
              description={result.explanation}
              action={<Badge tone={result.state === "EXPLAINED" ? "success" : result.state === "PARTIALLY_EXPLAINED" ? "warning" : "danger"}>{result.state.replace("_", " ")}</Badge>}
            />
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Opening</p>
                <p className="text-lg font-semibold text-slate-100">{result.openingQuantity ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Incoming</p>
                <p className="text-lg font-semibold text-emerald-400">+{result.incomingQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Outgoing</p>
                <p className="text-lg font-semibold text-red-400">-{result.outgoingQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-lg font-semibold text-slate-100">{result.currentQuantity}</p>
              </div>
            </CardBody>
            {result.comparisonNote && <CardBody className="pt-0 text-xs text-slate-500">{result.comparisonNote}</CardBody>}
            {result.limitation && <CardBody className="pt-0 text-xs text-amber-400">{result.limitation}</CardBody>}
          </Card>

          <Card>
            <CardHeader title="Movements" />
            {result.movements.length === 0 ? (
              <EmptyState title="No movements in this range" />
            ) : (
              <Table>
                <THead>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Reference</TH>
                  <TH className="text-right">Change</TH>
                </THead>
                <TBody>
                  {result.movements.map((m) => (
                    <TR key={m.id}>
                      <TD className="text-slate-400">{new Date(m.createdAt).toLocaleString()}</TD>
                      <TD>
                        <Badge tone="info">{m.operationType}</Badge>
                      </TD>
                      <TD className="font-medium">{m.reference}</TD>
                      <TD className={`text-right font-medium ${m.quantityChange < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
