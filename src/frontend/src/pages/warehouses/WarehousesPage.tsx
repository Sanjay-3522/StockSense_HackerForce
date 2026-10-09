import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import * as warehousesApi from "../../api/warehouses"
import * as locationsApi from "../../api/locations"
import type { Warehouse, Location } from "../../types"
import { Card, CardHeader } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { Modal, ConfirmDialog } from "../../components/ui/Modal"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { Badge } from "../../components/ui/Badge"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { PlusIcon, EditIcon, TrashIcon, WarehouseIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"

interface WarehouseForm {
  code: string
  name: string
  address: string
  isActive: boolean
}
const emptyWarehouseForm: WarehouseForm = { code: "", name: "", address: "", isActive: true }

interface LocationForm {
  warehouseId: string
  code: string
  name: string
  zone: string
  isActive: boolean
}
const emptyLocationForm: LocationForm = { warehouseId: "", code: "", name: "", zone: "", isActive: true }

export default function WarehousesPage() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)

  const [whModalOpen, setWhModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [whForm, setWhForm] = useState<WarehouseForm>(emptyWarehouseForm)
  const [whError, setWhError] = useState<string | null>(null)
  const [whSaving, setWhSaving] = useState(false)
  const [whDeleteTarget, setWhDeleteTarget] = useState<Warehouse | null>(null)

  const [locModalOpen, setLocModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [locForm, setLocForm] = useState<LocationForm>(emptyLocationForm)
  const [locError, setLocError] = useState<string | null>(null)
  const [locSaving, setLocSaving] = useState(false)
  const [locDeleteTarget, setLocDeleteTarget] = useState<Location | null>(null)

  const {
    data: warehouses,
    error: whListError,
    isLoading: whLoading,
    refetch: refetchWarehouses,
  } = useApi(() => warehousesApi.listWarehouses(), [])

  const {
    data: locations,
    error: locListError,
    isLoading: locLoading,
    refetch: refetchLocations,
  } = useApi(
    () => (selectedWarehouseId ? locationsApi.listLocations({ warehouseId: selectedWarehouseId }) : Promise.resolve<Location[]>([])),
    [selectedWarehouseId],
  )

  function openCreateWarehouse() {
    setEditingWarehouse(null)
    setWhForm(emptyWarehouseForm)
    setWhError(null)
    setWhModalOpen(true)
  }
  function openEditWarehouse(w: Warehouse) {
    setEditingWarehouse(w)
    setWhForm({ code: w.code, name: w.name, address: w.address ?? "", isActive: w.isActive })
    setWhError(null)
    setWhModalOpen(true)
  }
  async function submitWarehouse() {
    if (!whForm.code || !whForm.name) {
      setWhError("Code and name are required.")
      return
    }
    setWhSaving(true)
    setWhError(null)
    try {
      if (editingWarehouse) {
        await warehousesApi.updateWarehouse(editingWarehouse.id, whForm)
      } else {
        await warehousesApi.createWarehouse(whForm)
      }
      setWhModalOpen(false)
      refetchWarehouses()
    } catch (err) {
      setWhError(err instanceof ApiError ? err.message : "Unable to save warehouse.")
    } finally {
      setWhSaving(false)
    }
  }
  async function deleteWarehouse() {
    if (!whDeleteTarget) return
    try {
      await warehousesApi.deleteWarehouse(whDeleteTarget.id)
      if (selectedWarehouseId === whDeleteTarget.id) setSelectedWarehouseId(null)
      setWhDeleteTarget(null)
      refetchWarehouses()
    } catch (err) {
      setWhError(err instanceof ApiError ? err.message : "Unable to delete warehouse.")
      setWhDeleteTarget(null)
    }
  }

  function openCreateLocation() {
    if (!selectedWarehouseId) return
    setEditingLocation(null)
    setLocForm({ ...emptyLocationForm, warehouseId: selectedWarehouseId })
    setLocError(null)
    setLocModalOpen(true)
  }
  function openEditLocation(l: Location) {
    setEditingLocation(l)
    setLocForm({ warehouseId: l.warehouseId, code: l.code, name: l.name, zone: l.zone ?? "", isActive: l.isActive })
    setLocError(null)
    setLocModalOpen(true)
  }
  async function submitLocation() {
    if (!locForm.code || !locForm.name) {
      setLocError("Code and name are required.")
      return
    }
    setLocSaving(true)
    setLocError(null)
    try {
      if (editingLocation) {
        await locationsApi.updateLocation(editingLocation.id, locForm)
      } else {
        await locationsApi.createLocation(locForm)
      }
      setLocModalOpen(false)
      refetchLocations()
    } catch (err) {
      setLocError(err instanceof ApiError ? err.message : "Unable to save location.")
    } finally {
      setLocSaving(false)
    }
  }
  async function deleteLocation() {
    if (!locDeleteTarget) return
    try {
      await locationsApi.deleteLocation(locDeleteTarget.id)
      setLocDeleteTarget(null)
      refetchLocations()
    } catch (err) {
      setLocError(err instanceof ApiError ? err.message : "Unable to delete location.")
      setLocDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Warehouses & Locations</h1>
          <p className="text-sm text-slate-500">Manage warehouses and their internal storage locations.</p>
        </div>
        <Button onClick={openCreateWarehouse}>
          <PlusIcon className="h-4 w-4" /> New warehouse
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Warehouses" />
          {whLoading && <LoadingState />}
          {whListError && <ErrorState message={whListError} onRetry={refetchWarehouses} />}
          {!whLoading && !whListError && warehouses && warehouses.length === 0 && (
            <EmptyState icon={<WarehouseIcon className="h-8 w-8" />} title="No warehouses yet" />
          )}
          {!whLoading && !whListError && warehouses && warehouses.length > 0 && (
            <Table>
              <THead>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {warehouses.map((w) => (
                  <TR
                    key={w.id}
                    onClick={() => setSelectedWarehouseId(w.id)}
                    className={selectedWarehouseId === w.id ? "bg-brand-600/10" : ""}
                  >
                    <TD className="font-medium">{w.code}</TD>
                    <TD>{w.name}</TD>
                    <TD>
                      <Badge tone={w.isActive ? "success" : "neutral"}>{w.isActive ? "Active" : "Inactive"}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditWarehouse(w)
                          }}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setWhDeleteTarget(w)
                          }}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400"
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

        <Card>
          <CardHeader
            title={selectedWarehouseId ? `Locations` : "Locations"}
            description={selectedWarehouseId ? undefined : "Select a warehouse to view its locations"}
            action={
              selectedWarehouseId && (
                <Button size="sm" onClick={openCreateLocation}>
                  <PlusIcon className="h-4 w-4" /> New location
                </Button>
              )
            }
          />
          {!selectedWarehouseId && (
            <EmptyState icon={<WarehouseIcon className="h-8 w-8" />} title="No warehouse selected" description="Click a warehouse on the left." />
          )}
          {selectedWarehouseId && locLoading && <LoadingState />}
          {selectedWarehouseId && locListError && <ErrorState message={locListError} onRetry={refetchLocations} />}
          {selectedWarehouseId && !locLoading && !locListError && locations && locations.length === 0 && (
            <EmptyState title="No locations yet" description="Add a location to this warehouse." />
          )}
          {selectedWarehouseId && !locLoading && !locListError && locations && locations.length > 0 && (
            <Table>
              <THead>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Zone</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {locations.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium">{l.code}</TD>
                    <TD>{l.name}</TD>
                    <TD className="text-slate-400">{l.zone ?? "—"}</TD>
                    <TD>
                      <Badge tone={l.isActive ? "success" : "neutral"}>{l.isActive ? "Active" : "Inactive"}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditLocation(l)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setLocDeleteTarget(l)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400">
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
      </div>

      <Modal
        isOpen={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title={editingWarehouse ? "Edit warehouse" : "New warehouse"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setWhModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWarehouse} isLoading={whSaving}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {whError && <p className="text-sm text-red-400">{whError}</p>}
          <Input label="Code" required value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value })} />
          <Input label="Name" required value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} />
          <Input label="Address" value={whForm.address} onChange={(e) => setWhForm({ ...whForm, address: e.target.value })} />
          <Select
            label="Status"
            value={whForm.isActive ? "active" : "inactive"}
            onChange={(e) => setWhForm({ ...whForm, isActive: e.target.value === "active" })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Modal>

      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={editingLocation ? "Edit location" : "New location"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLocModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLocation} isLoading={locSaving}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {locError && <p className="text-sm text-red-400">{locError}</p>}
          <Input label="Code" required value={locForm.code} onChange={(e) => setLocForm({ ...locForm, code: e.target.value })} />
          <Input label="Name" required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} />
          <Input label="Zone" value={locForm.zone} onChange={(e) => setLocForm({ ...locForm, zone: e.target.value })} />
          <Select
            label="Status"
            value={locForm.isActive ? "active" : "inactive"}
            onChange={(e) => setLocForm({ ...locForm, isActive: e.target.value === "active" })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!whDeleteTarget}
        onClose={() => setWhDeleteTarget(null)}
        onConfirm={deleteWarehouse}
        title="Delete warehouse"
        message={`Delete warehouse "${whDeleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDanger
      />
      <ConfirmDialog
        isOpen={!!locDeleteTarget}
        onClose={() => setLocDeleteTarget(null)}
        onConfirm={deleteLocation}
        title="Delete location"
        message={`Delete location "${locDeleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDanger
      />
    </div>
  )
}
