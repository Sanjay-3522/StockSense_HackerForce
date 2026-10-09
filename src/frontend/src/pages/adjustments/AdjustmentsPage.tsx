import { useEffect, useState } from "react"
import { useApi } from "../../hooks/useApi"
import * as adjustmentsApi from "../../api/adjustments"
import { listAdjustmentReasons } from "../../api/adjustmentReasons"
import { listProducts } from "../../api/products"
import { listLocations } from "../../api/locations"
import { getNextReference, getLookupStock } from "../../api/lookups"
import { Card } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { PlusIcon, ScaleIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"

export default function AdjustmentsPage() {
  const [isModalOpen, setModalOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [productId, setProductId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [physicalQty, setPhysicalQty] = useState("")
  const [recordedQty, setRecordedQty] = useState<number | null>(null)
  const [reasonId, setReasonId] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { data: products } = useApi(() => listProducts({ isActive: true }), [])
  const { data: locations } = useApi(() => listLocations(), [])
  const { data: reasons } = useApi(() => listAdjustmentReasons(), [])

  const { data: adjustments, error, isLoading, refetch } = useApi(() => adjustmentsApi.listAdjustments(), [])

  useEffect(() => {
    if (isModalOpen) {
      getNextReference("ADJ").then((r) => setReference(r.reference)).catch(() => {})
    }
  }, [isModalOpen])

  useEffect(() => {
    if (productId && locationId) {
      getLookupStock(productId, locationId)
        .then((r) => setRecordedQty(r.quantity))
        .catch(() => setRecordedQty(null))
    } else {
      setRecordedQty(null)
    }
  }, [productId, locationId])

  function openCreate() {
    setProductId("")
    setLocationId("")
    setPhysicalQty("")
    setRecordedQty(null)
    setReasonId("")
    setNotes("")
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!productId || !locationId || physicalQty === "") {
      setFormError("Product, location, and physical quantity are required.")
      return
    }
    setIsSaving(true)
    try {
      await adjustmentsApi.createAdjustment({
        reference,
        product_id: productId,
        location_id: locationId,
        reason_id: reasonId || null,
        physical_qty: Number(physicalQty),
        notes: notes || null,
      })
      setModalOpen(false)
      refetch()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to create adjustment.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Adjustments</h1>
          <p className="text-sm text-slate-500">Reconcile recorded stock with physical counts.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" /> New adjustment
        </Button>
      </div>

      <Card>
        {isLoading && <LoadingState label="Loading adjustments..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && adjustments && adjustments.length === 0 && (
          <EmptyState icon={<ScaleIcon className="h-8 w-8" />} title="No adjustments yet" action={<Button size="sm" onClick={openCreate}>New adjustment</Button>} />
        )}
        {!isLoading && !error && adjustments && adjustments.length > 0 && (
          <Table>
            <THead>
              <TH>Reference</TH>
              <TH>Product</TH>
              <TH>Location</TH>
              <TH className="text-right">Recorded</TH>
              <TH className="text-right">Physical</TH>
              <TH className="text-right">Difference</TH>
              <TH>Reason</TH>
              <TH>Created</TH>
            </THead>
            <TBody>
              {adjustments.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.reference}</TD>
                  <TD className="text-slate-400">{a.product?.name ?? a.productId}</TD>
                  <TD className="text-slate-400">{a.location?.name ?? a.locationId}</TD>
                  <TD className="text-right">{a.recordedQty}</TD>
                  <TD className="text-right">{a.physicalQty}</TD>
                  <TD className={`text-right font-medium ${a.difference < 0 ? "text-red-400" : a.difference > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                    {a.difference > 0 ? `+${a.difference}` : a.difference}
                  </TD>
                  <TD className="text-slate-400">{a.reasonName ?? "—"}</TD>
                  <TD className="text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="New adjustment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              Confirm adjustment
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <Select label="Product" required placeholder="Select product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
          <Select label="Location" required placeholder="Select location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.warehouse?.name ? `${l.warehouse.name} / ` : ""}
                {l.name}
              </option>
            ))}
          </Select>
          {recordedQty !== null && (
            <p className="text-xs text-slate-500">
              Recorded quantity: <span className="text-slate-300">{recordedQty}</span>
            </p>
          )}
          <Input
            label="Physical quantity"
            type="number"
            required
            value={physicalQty}
            onChange={(e) => setPhysicalQty(e.target.value)}
          />
          {recordedQty !== null && physicalQty !== "" && (
            <p className="text-xs text-slate-500">
              Difference:{" "}
              <span className={Number(physicalQty) - recordedQty < 0 ? "text-red-400" : "text-emerald-400"}>
                {Number(physicalQty) - recordedQty > 0 ? "+" : ""}
                {Number(physicalQty) - recordedQty}
              </span>
            </p>
          )}
          <Select label="Reason" placeholder="Select reason" value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            {reasons?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
