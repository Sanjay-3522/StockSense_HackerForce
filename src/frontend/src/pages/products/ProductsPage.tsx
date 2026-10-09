import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import { useDebounce } from "../../hooks/useDebounce"
import * as productsApi from "../../api/products"
import * as reorderRulesApi from "../../api/reorderRules"
import { listCategories } from "../../api/categories"
import { listWarehouses } from "../../api/warehouses"
import { listLocations } from "../../api/locations"
import type { Product, ReorderRule } from "../../types"
import { Card, CardBody } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { Modal, ConfirmDialog } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { PlusIcon, EditIcon, TrashIcon, SearchIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"

interface FormState {
  name: string
  sku: string
  description: string
  categoryId: string
  unit: string
  barcode: string
  isActive: boolean
  initialStock: string
  initialStockLocationId: string
  reorderPoint: string
  reorderQuantity: string
  reorderWarehouseId: string
  reorderLocationId: string
}

const emptyForm: FormState = {
  name: "",
  sku: "",
  description: "",
  categoryId: "",
  unit: "",
  barcode: "",
  isActive: true,
  initialStock: "",
  initialStockLocationId: "",
  reorderPoint: "",
  reorderQuantity: "",
  reorderWarehouseId: "",
  reorderLocationId: "",
}

export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [categoryFilter, setCategoryFilter] = useState("")

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: categories } = useApi(() => listCategories(), [])
  const { data: warehouses } = useApi(() => listWarehouses({ isActive: true }), [])
  const { data: locations } = useApi(
    () => listLocations(form.reorderWarehouseId ? { warehouseId: form.reorderWarehouseId } : {}),
    [form.reorderWarehouseId, isModalOpen],
  )
  const { data: allLocations } = useApi(() => listLocations(), [isModalOpen])

  const {
    data: products,
    error,
    isLoading,
    refetch,
  } = useApi(
    () => productsApi.listProducts({ search: debouncedSearch || undefined, categoryId: categoryFilter || undefined }),
    [debouncedSearch, categoryFilter],
  )

  const { data: existingRules } = useApi(
    () => (editing ? reorderRulesApi.listReorderRules({ productId: editing.id }) : Promise.resolve<ReorderRule[]>([])),
    [editing?.id],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description ?? "",
      categoryId: p.categoryId,
      unit: p.unit,
      barcode: p.barcode ?? "",
      isActive: p.isActive,
      initialStock: "",
      initialStockLocationId: "",
      reorderPoint: "",
      reorderQuantity: "",
      reorderWarehouseId: "",
      reorderLocationId: "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!form.name || !form.sku || !form.categoryId || !form.unit) {
      setFormError("Name, SKU, category, and unit are required.")
      return
    }
    setIsSaving(true)
    try {
      let product: Product
      if (editing) {
        product = await productsApi.updateProduct(editing.id, {
          name: form.name,
          sku: form.sku,
          description: form.description || undefined,
          categoryId: form.categoryId,
          unit: form.unit,
          barcode: form.barcode || undefined,
          isActive: form.isActive,
        })
      } else {
        product = await productsApi.createProduct({
          name: form.name,
          sku: form.sku,
          description: form.description || undefined,
          categoryId: form.categoryId,
          unit: form.unit,
          barcode: form.barcode || undefined,
          isActive: form.isActive,
          initialStock: form.initialStock ? Number(form.initialStock) : undefined,
          initialStockLocationId: form.initialStockLocationId || undefined,
        })
      }

      if (form.reorderPoint && form.reorderQuantity) {
        await reorderRulesApi.createReorderRule({
          productId: product.id,
          warehouseId: form.reorderWarehouseId || undefined,
          locationId: form.reorderLocationId || undefined,
          reorderPoint: Number(form.reorderPoint),
          reorderQuantity: Number(form.reorderQuantity),
        })
      }

      setModalOpen(false)
      refetch()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to save product.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await productsApi.deleteProduct(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to delete product.")
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Products</h1>
          <p className="text-sm text-slate-500">Manage your product catalog, SKUs, and reordering rules.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" /> New product
        </Button>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search by name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Category"
              placeholder="All categories"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {isLoading && <LoadingState label="Loading products..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && products && products.length === 0 && (
          <EmptyState
            icon={<SearchIcon className="h-8 w-8" />}
            title="No products found"
            description="Try adjusting your search or create a new product."
            action={<Button size="sm" onClick={openCreate}>New product</Button>}
          />
        )}
        {!isLoading && !error && products && products.length > 0 && (
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>SKU</TH>
              <TH>Category</TH>
              <TH>Unit</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {products.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-slate-400">{p.sku}</TD>
                  <TD className="text-slate-400">{p.category?.name ?? "—"}</TD>
                  <TD className="text-slate-400">{p.unit}</TD>
                  <TD>
                    <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        aria-label={`Edit ${p.name}`}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400"
                        aria-label={`Delete ${p.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit product" : "New product"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              required
              placeholder="Select category"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              label="Unit of measure"
              required
              placeholder="e.g. pcs, kg, box"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            <Select
              label="Status"
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {!editing && (
            <div className="rounded-md border border-slate-800 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Initial stock (optional)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Initial quantity"
                  type="number"
                  min={0}
                  value={form.initialStock}
                  onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                />
                <Select
                  label="Location"
                  placeholder="Select location"
                  value={form.initialStockLocationId}
                  onChange={(e) => setForm({ ...form, initialStockLocationId: e.target.value })}
                >
                  {allLocations?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.warehouse?.name ? `${l.warehouse.name} / ` : ""}
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div className="rounded-md border border-slate-800 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reordering rule</p>
            {editing && existingRules && existingRules.length > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                Existing rule: reorder at {existingRules[0].reorderPoint}, order {existingRules[0].reorderQuantity}. Manage
                rules from the product&apos;s reorder rule record; saving below creates an additional rule.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Reorder point"
                type="number"
                min={0}
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
              />
              <Input
                label="Reorder quantity"
                type="number"
                min={0}
                value={form.reorderQuantity}
                onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })}
              />
              <Select
                label="Warehouse (optional)"
                placeholder="Any warehouse"
                value={form.reorderWarehouseId}
                onChange={(e) => setForm({ ...form, reorderWarehouseId: e.target.value, reorderLocationId: "" })}
              >
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Location (optional)"
                placeholder="Any location"
                value={form.reorderLocationId}
                onChange={(e) => setForm({ ...form, reorderLocationId: e.target.value })}
              >
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDanger
        isLoading={isDeleting}
      />
    </div>
  )
}
