import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { getOverview } from "../../api/intelligence"
import { listProducts } from "../../api/products"
import { listCategories } from "../../api/categories"
import { listWarehouses } from "../../api/warehouses"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { SparklesIcon } from "../../components/ui/icons"

export default function InventoryOverviewPage() {
  const [productId, setProductId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")

  const { data: products } = useApi(() => listProducts(), [])
  const { data: categories } = useApi(() => listCategories(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])

  const { data: overview, error, isLoading, refetch } = useApi(
    () => getOverview({ productId: productId || undefined, categoryId: categoryId || undefined, warehouseId: warehouseId || undefined }),
    [productId, categoryId, warehouseId],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Inventory Overview</h1>
        <p className="text-sm text-slate-500">Summary of stock distribution and attention items.</p>
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
          <Select label="Category" placeholder="All categories" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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

      {isLoading && <LoadingState label="Loading overview..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {overview && overview.state === "NO_DATA" && (
        <Card>
          <EmptyState icon={<SparklesIcon className="h-8 w-8" />} title="No data available" description="There isn't enough inventory data yet to build an overview." />
        </Card>
      )}

      {overview && overview.state === "READY" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardBody>
                <p className="text-xs text-slate-500">Total inventory</p>
                <p className="text-xl font-semibold text-slate-100">{overview.totals.inventoryQuantity}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-slate-500">Products tracked</p>
                <p className="text-xl font-semibold text-slate-100">{overview.totals.products}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-slate-500">Out of stock</p>
                <p className="text-xl font-semibold text-red-400">{overview.totals.outOfStockProducts}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-slate-500">Low stock</p>
                <p className="text-xl font-semibold text-amber-400">{overview.totals.lowStockProducts}</p>
                {overview.totals.lowStockState === "NO_REORDER_RULES_CONFIGURED" && (
                  <p className="mt-1 text-xs text-slate-500">No reorder rules configured</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Inventory by warehouse" />
              <Table>
                <THead>
                  <TH>Warehouse</TH>
                  <TH className="text-right">Quantity</TH>
                </THead>
                <TBody>
                  {overview.inventoryByWarehouse.map((w) => (
                    <TR key={w.id}>
                      <TD>{w.name}</TD>
                      <TD className="text-right">{w.quantity}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Inventory by category" />
              <Table>
                <THead>
                  <TH>Category</TH>
                  <TH className="text-right">Quantity</TH>
                </THead>
                <TBody>
                  {overview.inventoryByCategory.map((c) => (
                    <TR key={c.id}>
                      <TD>{c.name}</TD>
                      <TD className="text-right">{c.quantity}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          </div>

          <Card>
            <CardHeader title="Products requiring attention" />
            {overview.productsRequiringAttention.length === 0 ? (
              <EmptyState title="Nothing needs attention" />
            ) : (
              <Table>
                <THead>
                  <TH>Product</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH>Reason</TH>
                </THead>
                <TBody>
                  {overview.productsRequiringAttention.map((item, idx) => (
                    <TR key={idx}>
                      <TD className="font-medium">{item.product.name}</TD>
                      <TD className="text-right">{item.quantity}</TD>
                      <TD>
                        <Badge tone="warning">{item.reason}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          {overview.notes.length > 0 && (
            <Card>
              <CardBody className="flex flex-col gap-1 text-xs text-slate-500">
                {overview.notes.map((n, i) => (
                  <p key={i}>{n}</p>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
