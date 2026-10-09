import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApi } from "../../hooks/useApi"
import * as transfersApi from "../../api/transfers"
import { listLocations } from "../../api/locations"
import { listProducts } from "../../api/products"
import { getNextReference } from "../../api/lookups"
import type { DocumentStatus, Product } from "../../types"
import { Card, CardBody } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { StatusBadge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { PlusIcon, SwitchIcon, TrashIcon, GridIcon, ClipboardIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"

const STATUSES: DocumentStatus[] = ["draft", "waiting", "ready", "done", "canceled"]

interface ItemRow {
  productId: string
  quantity: string
}

export default function TransfersListPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<"list" | "kanban">("list")
  const [statusFilter, setStatusFilter] = useState("")

  const [isModalOpen, setModalOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [sourceLocationId, setSourceLocationId] = useState("")
  const [destinationLocationId, setDestinationLocationId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", quantity: "" }])
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { data: locations } = useApi(() => listLocations(), [])
  const { data: products } = useApi(() => listProducts({ isActive: true }), [])

  const { data: transfers, error, isLoading, refetch } = useApi(() => transfersApi.listTransfers(), [])

  useEffect(() => {
    if (isModalOpen) {
      getNextReference("TRF").then((r) => setReference(r.reference)).catch(() => {})
    }
  }, [isModalOpen])

  function openCreate() {
    setSourceLocationId("")
    setDestinationLocationId("")
    setNotes("")
    setItems([{ productId: "", quantity: "" }])
    setFormError(null)
    setModalOpen(true)
  }

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  async function handleSubmit() {
    setFormError(null)
    const validItems = items.filter((it) => it.productId && it.quantity)
    if (!sourceLocationId || !destinationLocationId || validItems.length === 0) {
      setFormError("Source, destination, and at least one item are required.")
      return
    }
    if (sourceLocationId === destinationLocationId) {
      setFormError("Source and destination locations must be different.")
      return
    }
    setIsSaving(true)
    try {
      const transfer = await transfersApi.createTransfer({
        reference,
        source_location_id: sourceLocationId,
        destination_location_id: destinationLocationId,
        notes: notes || null,
        items: validItems.map((it) => ({ product_id: it.productId, quantity: Number(it.quantity) })),
      })
      setModalOpen(false)
      refetch()
      navigate(`/transfers/${transfer.id}`)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to create transfer.")
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = transfers?.filter((r) => !statusFilter || r.status === statusFilter) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Transfers</h1>
          <p className="text-sm text-slate-500">Move stock between locations.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" /> New transfer
        </Button>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full sm:w-56">
            <Select label="Status" placeholder="All statuses" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-1 rounded-md border border-slate-800 p-1">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm ${view === "list" ? "bg-slate-800 text-slate-100" : "text-slate-400"}`}>
              <ClipboardIcon className="h-4 w-4" /> List
            </button>
            <button onClick={() => setView("kanban")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm ${view === "kanban" ? "bg-slate-800 text-slate-100" : "text-slate-400"}`}>
              <GridIcon className="h-4 w-4" /> Kanban
            </button>
          </div>
        </CardBody>
      </Card>

      {isLoading && <LoadingState label="Loading transfers..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!isLoading && !error && filtered.length === 0 && (
        <Card>
          <EmptyState icon={<SwitchIcon className="h-8 w-8" />} title="No transfers found" action={<Button size="sm" onClick={openCreate}>New transfer</Button>} />
        </Card>
      )}

      {!isLoading && !error && filtered.length > 0 && view === "list" && (
        <Card>
          <Table>
            <THead>
              <TH>Reference</TH>
              <TH>Source</TH>
              <TH>Destination</TH>
              <TH>Status</TH>
              <TH>Items</TH>
              <TH>Created</TH>
            </THead>
            <TBody>
              {filtered.map((r) => (
                <TR key={r.id} onClick={() => navigate(`/transfers/${r.id}`)}>
                  <TD className="font-medium">{r.reference}</TD>
                  <TD className="text-slate-400">{r.sourceLocation?.name ?? "—"}</TD>
                  <TD className="text-slate-400">{r.destinationLocation?.name ?? "—"}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                  </TD>
                  <TD className="text-slate-400">{r.items?.length ?? 0}</TD>
                  <TD className="text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {!isLoading && !error && filtered.length > 0 && view === "kanban" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
              <div className="flex flex-col gap-2">
                {filtered
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <Card key={r.id} className="cursor-pointer hover:border-slate-700" onClick={() => navigate(`/transfers/${r.id}`)}>
                      <CardBody className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-slate-100">{r.reference}</p>
                        <p className="text-xs text-slate-500">
                          {r.sourceLocation?.name ?? "?"} → {r.destinationLocation?.name ?? "?"}
                        </p>
                        <p className="text-xs text-slate-500">{r.items?.length ?? 0} item(s)</p>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="New transfer"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              Create transfer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Source location"
              required
              placeholder="Select source"
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
            >
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.warehouse?.name ? `${l.warehouse.name} / ` : ""}
                  {l.name}
                </option>
              ))}
            </Select>
            <Select
              label="Destination location"
              required
              placeholder="Select destination"
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
            >
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.warehouse?.name ? `${l.warehouse.name} / ` : ""}
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
            <div className="flex flex-col gap-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label={idx === 0 ? "Product" : undefined}
                      placeholder="Select product"
                      value={it.productId}
                      onChange={(e) => updateItem(idx, { productId: e.target.value })}
                    >
                      {products?.map((p: Product) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      label={idx === 0 ? "Qty" : undefined}
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="mb-0.5 rounded-md p-2 text-slate-400 hover:bg-red-950 hover:text-red-400"
                    disabled={items.length === 1}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setItems((prev) => [...prev, { productId: "", quantity: "" }])}>
              <PlusIcon className="h-4 w-4" /> Add item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
