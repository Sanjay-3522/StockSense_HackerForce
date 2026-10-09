import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useApi } from "../../hooks/useApi"
import * as transfersApi from "../../api/transfers"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { ConfirmDialog } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { StatusBadge } from "../../components/ui/Badge"
import { LoadingState, ErrorState } from "../../components/ui/States"
import { ApiError } from "../../api/client"

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: transfer, error, isLoading, refetch } = useApi(() => transfersApi.getTransfer(id!), [id])

  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function doComplete() {
    setIsWorking(true)
    setActionError(null)
    try {
      await transfersApi.completeTransfer(id!)
      setConfirmComplete(false)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to complete transfer.")
    } finally {
      setIsWorking(false)
    }
  }

  async function doCancel() {
    setIsWorking(true)
    setActionError(null)
    try {
      await transfersApi.cancelTransfer(id!)
      setConfirmCancel(false)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to cancel transfer.")
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading transfer..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!transfer) return null

  const canAct = transfer.status !== "done" && transfer.status !== "canceled"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/transfers")} className="text-sm text-slate-500 hover:text-slate-300">
            ← Back to transfers
          </button>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">{transfer.reference}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={transfer.status} />
          {canAct && (
            <>
              <Button onClick={() => setConfirmComplete(true)} isLoading={isWorking}>
                Complete
              </Button>
              <Button variant="danger" onClick={() => setConfirmCancel(true)} isLoading={isWorking}>
                Cancel
              </Button>
            </>
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
              <TH className="text-right">Quantity</TH>
            </THead>
            <TBody>
              {transfer.items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-medium">{it.product?.name ?? it.productId}</TD>
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
              <span className="text-slate-500">Source location</span>
              <span className="text-slate-200">{transfer.sourceLocation?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination location</span>
              <span className="text-slate-200">{transfer.destinationLocation?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created by</span>
              <span className="text-slate-200">{transfer.createdBy ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-200">{new Date(transfer.createdAt).toLocaleString()}</span>
            </div>
            {transfer.notes && (
              <div className="border-t border-slate-800 pt-3">
                <p className="text-slate-500">Notes</p>
                <p className="mt-1 text-slate-200">{transfer.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        onConfirm={doComplete}
        title="Complete transfer"
        message="This will move stock from the source to the destination location. Continue?"
        confirmLabel="Complete"
        isLoading={isWorking}
      />
      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Cancel transfer"
        message="This will cancel the transfer. This cannot be undone."
        confirmLabel="Cancel transfer"
        isDanger
        isLoading={isWorking}
      />
    </div>
  )
}
