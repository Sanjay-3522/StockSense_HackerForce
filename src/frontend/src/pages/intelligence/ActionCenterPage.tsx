import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import * as intelligenceApi from "../../api/intelligence"
import { Card, CardBody } from "../../components/ui/Card"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { Table, THead, TH, TBody, TR, TD, Pagination } from "../../components/ui/Table"
import { PriorityBadge, ActionStatusBadge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { ClipboardIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"

const PRIORITIES = ["CRITICAL", "NEEDS_REVIEW", "INFORMATION"]
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"]

export default function ActionCenterPage() {
  const [priority, setPriority] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    data: actions,
    error,
    isLoading,
    refetch,
  } = useApi(() => intelligenceApi.listActions({ priority: priority || undefined, status: status || undefined }, page, 20), [priority, status, page])

  async function markInProgress(id: string) {
    setWorkingId(id)
    setActionError(null)
    try {
      await intelligenceApi.updateActionStatus(id, "IN_PROGRESS")
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to update action.")
    } finally {
      setWorkingId(null)
    }
  }

  async function resolve(id: string) {
    setWorkingId(id)
    setActionError(null)
    try {
      await intelligenceApi.resolveAction(id)
      refetch()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to resolve action.")
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Action Center</h1>
        <p className="text-sm text-slate-500">Actionable inventory issues surfaced by StockSense intelligence.</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Priority" placeholder="All priorities" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select label="Status" placeholder="All statuses" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <Card>
        {isLoading && <LoadingState label="Loading actions..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && actions && actions.items.length === 0 && (
          <EmptyState icon={<ClipboardIcon className="h-8 w-8" />} title="No actions found" description="Nothing needs attention right now." />
        )}
        {!isLoading && !error && actions && actions.items.length > 0 && (
          <>
            <Table>
              <THead>
                <TH>Priority</TH>
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {actions.items.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <PriorityBadge priority={a.priority} />
                    </TD>
                    <TD>
                      <p className="font-medium text-slate-100">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.description}</p>
                    </TD>
                    <TD className="text-slate-400">{a.type}</TD>
                    <TD>
                      <ActionStatusBadge status={a.status} />
                    </TD>
                    <TD className="text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {a.status === "OPEN" && (
                          <Button size="sm" variant="outline" isLoading={workingId === a.id} onClick={() => markInProgress(a.id)}>
                            Start
                          </Button>
                        )}
                        {a.status !== "RESOLVED" && (
                          <Button size="sm" isLoading={workingId === a.id} onClick={() => resolve(a.id)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={actions.pagination.page} pageCount={actions.pagination.pageCount} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
