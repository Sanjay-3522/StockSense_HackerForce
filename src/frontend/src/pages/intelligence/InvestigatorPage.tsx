import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { investigate } from "../../api/intelligence"
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
import { ApiError } from "../../api/client"

const stateTone: Record<string, "success" | "warning" | "danger"> = {
  EXPLAINED: "success",
  PARTIALLY_EXPLAINED: "warning",
  UNEXPLAINED: "danger",
}

export default function InvestigatorPage() {
  const [productId, setProductId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [recordedQuantity, setRecordedQuantity] = useState("")
  const [physicalQuantity, setPhysicalQuantity] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const [result, setResult] = useState<Awaited<ReturnType<typeof investigate>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: products } = useApi(() => listProducts(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const { data: locations } = useApi(() => listLocations(warehouseId ? { warehouseId } : {}), [warehouseId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || recordedQuantity === "" || physicalQuantity === "") return
    setIsLoading(true)
    setError(null)
    try {
      const data = await investigate({
        productId,
        warehouseId: warehouseId || undefined,
        locationId: locationId || undefined,
        recordedQuantity: Number(recordedQuantity),
        physicalQuantity: Number(physicalQuantity),
        from: from || undefined,
        to: to || undefined,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to run investigation.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Inventory Investigator</h1>
        <p className="text-sm text-slate-500">Compare recorded vs physical stock and trace the difference.</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Input label="Recorded quantity" type="number" required value={recordedQuantity} onChange={(e) => setRecordedQuantity(e.target.value)} />
            <Input label="Physical quantity" type="number" required value={physicalQuantity} onChange={(e) => setPhysicalQuantity(e.target.value)} />
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" isLoading={isLoading} className="w-full">
                Investigate
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {error && <ErrorState message={error} />}
      {isLoading && <LoadingState label="Investigating..." />}

      {result && (
        <>
          <Card>
            <CardHeader
              title="Result"
              description={result.explanation}
              action={<Badge tone={stateTone[result.state]}>{result.state.replace("_", " ")}</Badge>}
            />
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <p className="text-xs text-slate-500">Recorded</p>
                <p className="text-lg font-semibold text-slate-100">{result.recordedQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Physical</p>
                <p className="text-lg font-semibold text-slate-100">{result.physicalQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Difference</p>
                <p className={`text-lg font-semibold ${result.difference < 0 ? "text-red-400" : "text-emerald-400"}`}>{result.difference}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Traced</p>
                <p className="text-lg font-semibold text-slate-100">{result.tracedQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Unexplained</p>
                <p className="text-lg font-semibold text-amber-400">{result.unexplainedQuantity}</p>
              </div>
            </CardBody>
            {result.limitation && <CardBody className="pt-0 text-xs text-amber-400">{result.limitation}</CardBody>}
          </Card>

          <Card>
            <CardHeader title="Related operations" />
            {result.relatedOperations.length === 0 ? (
              <EmptyState title="No related operations found" />
            ) : (
              <Table>
                <THead>
                  <TH>Type</TH>
                  <TH>Reference</TH>
                  <TH className="text-right">Change</TH>
                </THead>
                <TBody>
                  {result.relatedOperations.map((op, idx) => (
                    <TR key={idx}>
                      <TD>
                        <Badge tone="info">{op.operationType}</Badge>
                      </TD>
                      <TD className="font-medium">{op.reference}</TD>
                      <TD className={`text-right font-medium ${op.quantityChange < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {op.quantityChange > 0 ? `+${op.quantityChange}` : op.quantityChange}
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
