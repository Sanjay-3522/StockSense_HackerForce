import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { getReorderRecommendations } from "../../api/intelligence"
import { listWarehouses } from "../../api/warehouses"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { SparklesIcon } from "../../components/ui/icons"

const STATUSES = [
  { value: "REORDER_RECOMMENDED", label: "Reorder recommended" },
  { value: "NOT_REQUIRED", label: "Not required" },
  { value: "INSUFFICIENT_DATA", label: "Insufficient data" },
]

const statusTone: Record<string, "danger" | "success" | "neutral"> = {
  REORDER_RECOMMENDED: "danger",
  NOT_REQUIRED: "success",
  INSUFFICIENT_DATA: "neutral",
}

export default function SmartReorderPage() {
  const [warehouseId, setWarehouseId] = useState("")
  const [status, setStatus] = useState("")

  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const {
    data: reorder,
    error,
    isLoading,
    refetch,
  } = useApi(() => getReorderRecommendations({ warehouseId: warehouseId || undefined, status: status || undefined }), [warehouseId, status])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Smart Reorder</h1>
        <p className="text-sm text-slate-500">
          Recommendations based on consumption trends and reorder rules. These are suggestions only — nothing is ordered
          or modified automatically.
        </p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Warehouse" placeholder="All warehouses" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select label="Status" placeholder="All statuses" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {isLoading && <LoadingState label="Calculating recommendations..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {reorder && reorder.state === "NO_DATA" && (
        <Card>
          <EmptyState icon={<SparklesIcon className="h-8 w-8" />} title="No data available" />
        </Card>
      )}

      {reorder && reorder.state === "READY" && (
        <>
          <Card>
            {reorder.items.length === 0 ? (
              <EmptyState title="No recommendations" />
            ) : (
              <Table>
                <THead>
                  <TH>Product</TH>
                  <TH>Warehouse</TH>
                  <TH className="text-right">Current stock</TH>
                  <TH className="text-right">Reorder threshold</TH>
                  <TH className="text-right">Suggested qty</TH>
                  <TH className="text-right">Days remaining</TH>
                  <TH>Status</TH>
                </THead>
                <TBody>
                  {reorder.items.map((item, idx) => (
                    <TR key={idx}>
                      <TD className="font-medium">{item.product.name}</TD>
                      <TD className="text-slate-400">{item.warehouse?.name ?? "—"}</TD>
                      <TD className="text-right">{item.currentStock}</TD>
                      <TD className="text-right">{item.reorderThreshold ?? "—"}</TD>
                      <TD className="text-right">{item.suggestedReorderQuantity ?? "—"}</TD>
                      <TD className="text-right">{item.estimatedDaysRemaining ?? "—"}</TD>
                      <TD>
                        <Badge tone={statusTone[item.recommendationStatus]}>{item.recommendationStatus.replaceAll("_", " ")}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
          {reorder.dataLimitations.length > 0 && (
            <Card>
              <CardHeader title="Data limitations" />
              <CardBody className="flex flex-col gap-1 text-xs text-slate-500">
                {reorder.dataLimitations.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
