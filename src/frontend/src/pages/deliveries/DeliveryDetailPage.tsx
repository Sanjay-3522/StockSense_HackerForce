import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useApi } from "../../hooks/useApi"
import * as deliveriesApi from "../../api/deliveries"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { ConfirmDialog } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { StatusBadge } from "../../components/ui/Badge"
import { LoadingState, ErrorState } from "../../components/ui/States"
import { ApiError } from "../../api/client"

type ConfirmKind = "pick" | "pack" | "validate" | "cancel" | null

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: delivery, error, isLoading, refetch } = useApi(() => deliveriesApi.getDelivery(id!), [id])

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function runAction(kind: Exclude<ConfirmKind, null>) {
    setIsWorking(true)
    setActionError(null)
    try {
      if (kind === "pick") await deliveriesApi.pickDelivery(id!)
      if (kind === "pack") await deliveriesApi.packDelivery(id!)
      if (kind === "validate") await deliveriesApi.validateDelivery(id!)
      if (kind === "cancel") await deliveriesApi.cancelDelivery(id!)
      setConfirmKind(null)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Unable to ${kind} delivery.`)
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading delivery..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!delivery) return null

  const confirmCopy: Record<Exclude<ConfirmKind, null>, { title: string; message: string; danger?: boolean }> = {
    pick: { title: "Pick delivery", message: "Mark all items as picked for this delivery?" },
    pack: { title: "Pack delivery", message: "Mark all items as packed for this delivery?" },
    validate: { title: "Validate delivery", message: "This will confirm the delivery and deduct stock. Continue?" },
    cancel: { title: "Cancel delivery", message: "This will cancel the delivery. This cannot be undone.", danger: true },
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/deliveries")} className="text-sm text-slate-500 hover:text-slate-300">
            ← Back to deliveries
          </button>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">{delivery.reference}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={delivery.status} />
          {delivery.status !== "done" && delivery.status !== "canceled" && (
            <>
              <Button variant="outline" onClick={() => setConfirmKind("pick")} isLoading={isWorking}>
                Pick
              </Button>
              <Button variant="outline" onClick={() => setConfirmKind("pack")} isLoading={isWorking}>
                Pack
              </Button>
              <Button onClick={() => setConfirmKind("validate")} isLoading={isWorking}>
                Validate
              </Button>
              <Button variant="danger" onClick={() => setConfirmKind("cancel")} isLoading={isWorking}>
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
              <TH className="text-right">Requested</TH>
              <TH className="text-right">Picked</TH>
              <TH className="text-right">Packed</TH>
            </THead>
            <TBody>
              {delivery.items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-medium">{it.product?.name ?? it.productId}</TD>
                  <TD className="text-right">{it.requestedQty}</TD>
                  <TD className="text-right">{it.pickedQty}</TD>
                  <TD className="text-right">{it.packedQty}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer</span>
              <span className="text-slate-200">{delivery.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Warehouse</span>
              <span className="text-slate-200">{delivery.warehouse?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location</span>
              <span className="text-slate-200">{delivery.location?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created by</span>
              <span className="text-slate-200">{delivery.createdBy ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-200">{new Date(delivery.createdAt).toLocaleString()}</span>
            </div>
            {delivery.notes && (
              <div className="border-t border-slate-800 pt-3">
                <p className="text-slate-500">Notes</p>
                <p className="mt-1 text-slate-200">{delivery.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {confirmKind && (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirmKind(null)}
          onConfirm={() => runAction(confirmKind)}
          title={confirmCopy[confirmKind].title}
          message={confirmCopy[confirmKind].message}
          isDanger={confirmCopy[confirmKind].danger}
          isLoading={isWorking}
        />
      )}
    </div>
  )
}
