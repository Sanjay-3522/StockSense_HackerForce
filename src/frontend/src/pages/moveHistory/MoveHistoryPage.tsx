import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { useDebounce } from "../../hooks/useDebounce"
import { getMovements } from "../../api/intelligence"
import { listProducts } from "../../api/products"
import { listWarehouses } from "../../api/warehouses"
import { Card, CardBody } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Table, THead, TH, TBody, TR, TD, Pagination } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { HistoryIcon } from "../../components/ui/icons"

const OPERATION_TYPES = ["receipt", "delivery", "transfer", "adjustment"]

export default function MoveHistoryPage() {
  const [productId, setProductId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [operationType, setOperationType] = useState("")
  const [reference, setReference] = useState("")
  const debouncedReference = useDebounce(reference, 300)
  const [page, setPage] = useState(1)

  const { data: products } = useApi(() => listProducts(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])

  const {
    data: movements,
    error,
    isLoading,
    refetch,
  } = useApi(
    () =>
      getMovements(
        {
          productId: productId || undefined,
          warehouseId: warehouseId || undefined,
          operationType: operationType || undefined,
          reference: debouncedReference || undefined,
        },
        page,
        20,
      ),
    [productId, warehouseId, operationType, debouncedReference, page],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Move History</h1>
        <p className="text-sm text-slate-500">Full stock movement ledger across all operations.</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Input label="Reference" placeholder="Search reference" value={reference} onChange={(e) => { setReference(e.target.value); setPage(1) }} />
          <Select label="Product" placeholder="All products" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1) }}>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
          <Select label="Warehouse" placeholder="All warehouses" value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1) }}>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select label="Operation type" placeholder="All types" value={operationType} onChange={(e) => { setOperationType(e.target.value); setPage(1) }}>
            {OPERATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        {isLoading && <LoadingState label="Loading movements..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && movements && movements.items.length === 0 && (
          <EmptyState icon={<HistoryIcon className="h-8 w-8" />} title="No movements found" />
        )}
        {!isLoading && !error && movements && movements.items.length > 0 && (
          <>
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Reference</TH>
                <TH>Product</TH>
                <TH className="text-right">Change</TH>
                <TH className="text-right">Before → After</TH>
                <TH>User</TH>
              </THead>
              <TBody>
                {movements.items.map((m) => (
                  <TR key={m.id}>
                    <TD className="text-slate-400">{new Date(m.createdAt).toLocaleString()}</TD>
                    <TD>
                      <Badge tone="info">{m.operationType}</Badge>
                    </TD>
                    <TD className="font-medium">{m.reference}</TD>
                    <TD className="text-slate-400">{m.product?.name ?? m.sku}</TD>
                    <TD className={`text-right font-medium ${m.quantityChange < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </TD>
                    <TD className="text-right text-slate-400">
                      {m.quantityBefore} → {m.quantityAfter}
                    </TD>
                    <TD className="text-slate-400">{m.userEmail ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={movements.pagination.page} pageCount={movements.pagination.pageCount} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
