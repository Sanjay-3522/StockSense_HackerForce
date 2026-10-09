import type React from "react"
import { useState } from "react"
import { useApi } from "../hooks/useApi"
import { getDashboard } from "../api/dashboard"
import { listWarehouses } from "../api/warehouses"
import { listLocations } from "../api/locations"
import { listCategories } from "../api/categories"
import { Card, CardBody, CardHeader } from "../components/ui/Card"
import { Select } from "../components/ui/Select"
import { LoadingState, ErrorState } from "../components/ui/States"
import { BoxIcon, WarehouseIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, SwitchIcon, AlertTriangleIcon } from "../components/ui/icons"

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.JSX.Element }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600/15 text-brand-400">
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-100">{value}</p>
        </div>
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const [warehouseId, setWarehouseId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [categoryId, setCategoryId] = useState("")

  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const { data: locations } = useApi(
    () => listLocations(warehouseId ? { warehouseId } : {}),
    [warehouseId],
  )
  const { data: categories } = useApi(() => listCategories(), [])

  const {
    data: summary,
    error,
    isLoading,
    refetch,
  } = useApi(() => getDashboard({ warehouseId, locationId, categoryId }), [warehouseId, locationId, categoryId])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500">A live snapshot of your inventory operations.</p>
      </div>

      <Card>
        <CardHeader title="Filters" description="Narrow the KPIs below by warehouse, location, or category" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Select
            label="Location"
            placeholder="All locations"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select
            label="Product Category"
            placeholder="All categories"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {isLoading && <LoadingState label="Loading dashboard..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Active Products" value={summary.counts.activeProducts} icon={<BoxIcon className="h-5 w-5" />} />
            <KpiCard
              label="Low / Out of Stock"
              value={summary.counts.lowStockRecords + summary.counts.outOfStockRecords}
              icon={<AlertTriangleIcon className="h-5 w-5" />}
            />
            <KpiCard label="Active Warehouses" value={summary.counts.activeWarehouses} icon={<WarehouseIcon className="h-5 w-5" />} />
            <KpiCard label="Active Locations" value={summary.counts.activeLocations} icon={<WarehouseIcon className="h-5 w-5" />} />
            <KpiCard
              label="Products in Stock"
              value={summary.counts.totalProductsInStock}
              icon={<ArrowDownTrayIcon className="h-5 w-5" />}
            />
            <KpiCard label="Out of Stock Records" value={summary.counts.outOfStockRecords} icon={<ArrowUpTrayIcon className="h-5 w-5" />} />
          </div>

          <Card>
            <CardHeader title="Recent Warehouses" />
            <CardBody className="flex flex-col gap-2">
              {summary.recentWarehouses.length === 0 && (
                <p className="text-sm text-slate-500">No warehouses yet.</p>
              )}
              {summary.recentWarehouses.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 text-sm">
                  <span className="text-slate-200">
                    {w.name} <span className="text-slate-500">({w.code})</span>
                  </span>
                  <span className={w.isActive ? "text-emerald-400" : "text-slate-500"}>
                    {w.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="flex gap-4 text-xs text-slate-500">
            <SwitchIcon className="h-4 w-4" />
            <span>
              Note: pending receipts, deliveries, and scheduled transfers are tracked on their respective list pages
              (Kanban view) — the dashboard summary endpoint reports stock-level KPIs.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
