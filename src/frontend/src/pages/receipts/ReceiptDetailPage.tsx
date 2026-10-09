import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useApi } from "../../hooks/useApi"
import * as receiptsApi from "../../api/receipts"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { ConfirmDialog } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { StatusBadge } from "../../components/ui/Badge"
import { LoadingState, ErrorState } from "../../components/ui/States"
import { ApiError } from "../../api/client"

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: receipt, error, isLoading, refetch } = useApi(() => receiptsApi.getReceipt(id!), [id])

  const [confirmValidate, setConfirmValidate] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)

  async function doValidate() {
    setIsWorking(true)
    setActionError(null)
    try {
      await receiptsApi.validateReceipt(id!)
      setConfirmValidate(false)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to validate receipt.")
    } finally {
      setIsWorking(false)
    }
  }

  async function doCancel() {
    setIsWorking(true)
    setActionError(null)
    try {
      await receiptsApi.cancelReceipt(id!)
      setConfirmCancel(false)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to cancel receipt.")
    } finally {
      setIsWorking(false)
    }
  }

  async function saveNotes() {
    if (notes === null) return
    setIsWorking(true)
    setActionError(null)
    try {
      await receiptsApi.updateReceipt(id!, { notes })
      setNotes(null)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to update receipt.")
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading receipt..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!receipt) return null

  const isDraftLike = receipt.status === "draft" || receipt.status === "waiting" || receipt.status === "ready"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/receipts")} className="text-sm text-slate-500 hover:text-slate-300">
            ← Back to receipts
          </button>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">{receipt.reference}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={receipt.status} />
          {isDraftLike && (
            <Button onClick={() => setConfirmValidate(true)} isLoading={isWorking}>
              Validate
            </Button>
          )}
          {receipt.status !== "done" && receipt.status !== "canceled" && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)} isLoading={isWorking}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Items" />
          <Table>
            <THead>
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH className="text-right">Quantity</TH>
            </THead>
            <TBody>
              {receipt.items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-medium">{it.product?.name ?? it.productId}</TD>
                  <TD className="text-slate-400">{it.product?.sku ?? "—"}</TD>
                  <TD className="text-right">{it.quantity}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Supplier</span>
              <span className="text-slate-200">{receipt.supplierName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Warehouse</span>
              <span className="text-slate-200">{receipt.warehouse?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location</span>
              <span className="text-slate-200">{receipt.location?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created by</span>
              <span className="text-slate-200">{receipt.createdBy ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-200">{new Date(receipt.createdAt).toLocaleString()}</span>
            </div>
            {receipt.validatedAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Validated</span>
                <span className="text-slate-200">{new Date(receipt.validatedAt).toLocaleString()}</span>
              </div>
            )}
            <div className="mt-2 border-t border-slate-800 pt-3">
              <Input
                label="Notes"
                value={notes ?? receipt.notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isDraftLike}
              />
              {isDraftLike && notes !== null && notes !== (receipt.notes ?? "") && (
                <Button size="sm" className="mt-2" onClick={saveNotes} isLoading={isWorking}>
                  Save notes
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmValidate}
        onClose={() => setConfirmValidate(false)}
        onConfirm={doValidate}
        title="Validate receipt"
        message="This will confirm the receipt and update stock quantities. Continue?"
        confirmLabel="Validate"
        isLoading={isWorking}
      />
      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Cancel receipt"
        message="This will cancel the receipt. This cannot be undone."
        confirmLabel="Cancel receipt"
        isDanger
        isLoading={isWorking}
      />
    </div>
  )
}
