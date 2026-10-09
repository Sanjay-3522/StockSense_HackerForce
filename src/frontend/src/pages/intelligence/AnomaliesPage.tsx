import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { getAnomalies } from "../../api/intelligence"
import { listWarehouses } from "../../api/warehouses"
import { Card, CardBody } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { SeverityBadge, Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { AlertTriangleIcon } from "../../components/ui/icons"

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

export default function AnomaliesPage() {
  const [severity, setSeverity] = useState("")
  const [warehouseId, setWarehouseId] = useState("")

  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const {
    data: anomalies,
    error,
    isLoading,
    refetch,
  } = useApi(() => getAnomalies({ severity: severity || undefined, warehouseId: warehouseId || undefined }), [severity, warehouseId])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Anomalies</h1>
        <p className="text-sm text-slate-500">Unusual stock movements detected from the ledger.</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Severity" placeholder="All severities" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Warehouse" placeholder="All warehouses" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        {isLoading && <LoadingState label="Scanning for anomalies..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && anomalies && anomalies.items.length === 0 && (
          <EmptyState icon={<AlertTriangleIcon className="h-8 w-8" />} title="No anomalies detected" />
        )}
        {!isLoading && !error && anomalies && anomalies.items.length > 0 && (
          <Table>
            <THead>
              <TH>Product</TH>
              <TH>Type</TH>
              <TH>Operation</TH>
              <TH className="text-right">Observed</TH>
              <TH>Severity</TH>
              <TH>Reason</TH>
              <TH>Time</TH>
            </THead>
            <TBody>
              {anomalies.items.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.product.name}</TD>
                  <TD>
                    <Badge tone="purple">{a.anomalyType.replaceAll("_", " ")}</Badge>
                  </TD>
                  <TD className="text-slate-400">
                    {a.operation.type} · {a.operation.reference}
                  </TD>
                  <TD className="text-right">{a.observedMovement}</TD>
                  <TD>
                    <SeverityBadge severity={a.severity} />
                  </TD>
                  <TD className="max-w-xs text-slate-400">{a.reason}</TD>
                  <TD className="text-slate-400">{new Date(a.timestamp).toLocaleString()}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
