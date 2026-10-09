import { useState } from "react"
import { useApi } from "../../hooks/useApi"
import * as categoriesApi from "../../api/categories"
import * as reasonsApi from "../../api/adjustmentReasons"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table"
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States"
import { PlusIcon, TrashIcon, TagIcon } from "../../components/ui/icons"
import { ApiError } from "../../api/client"
import { Link } from "react-router-dom"

export default function SettingsPage() {
  const { data: categories, error: catError, isLoading: catLoading, refetch: refetchCategories } = useApi(
    () => categoriesApi.listCategories(),
    [],
  )
  const { data: reasons, error: reasonError, isLoading: reasonLoading, refetch: refetchReasons } = useApi(
    () => reasonsApi.listAdjustmentReasons(),
    [],
  )

  const [newCategory, setNewCategory] = useState("")
  const [catSaving, setCatSaving] = useState(false)
  const [catFormError, setCatFormError] = useState<string | null>(null)

  const [newReason, setNewReason] = useState("")
  const [reasonSaving, setReasonSaving] = useState(false)
  const [reasonFormError, setReasonFormError] = useState<string | null>(null)

  async function addCategory() {
    if (!newCategory.trim()) return
    setCatSaving(true)
    setCatFormError(null)
    try {
      await categoriesApi.createCategory({ name: newCategory.trim() })
      setNewCategory("")
      refetchCategories()
    } catch (err) {
      setCatFormError(err instanceof ApiError ? err.message : "Unable to create category.")
    } finally {
      setCatSaving(false)
    }
  }

  async function deleteCategory(id: string) {
    try {
      await categoriesApi.deleteCategory(id)
      refetchCategories()
    } catch (err) {
      setCatFormError(err instanceof ApiError ? err.message : "Unable to delete category.")
    }
  }

  async function addReason() {
    if (!newReason.trim()) return
    setReasonSaving(true)
    setReasonFormError(null)
    try {
      await reasonsApi.createAdjustmentReason({ name: newReason.trim() })
      setNewReason("")
      refetchReasons()
    } catch (err) {
      setReasonFormError(err instanceof ApiError ? err.message : "Unable to create reason.")
    } finally {
      setReasonSaving(false)
    }
  }

  async function deleteReason(id: string) {
    try {
      await reasonsApi.deleteAdjustmentReason(id)
      refetchReasons()
    } catch (err) {
      setReasonFormError(err instanceof ApiError ? err.message : "Unable to delete reason.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage warehouses from the{" "}
          <Link to="/warehouses" className="text-brand-400 hover:text-brand-300">
            Warehouses & Locations
          </Link>{" "}
          page. Product categories and adjustment reasons are managed here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Product categories" />
          <CardBody className="flex gap-2">
            <Input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button onClick={addCategory} isLoading={catSaving}>
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </CardBody>
          {catFormError && <p className="px-5 pb-3 text-sm text-red-400">{catFormError}</p>}
          {catLoading && <LoadingState />}
          {catError && <ErrorState message={catError} onRetry={refetchCategories} />}
          {!catLoading && !catError && categories && categories.length === 0 && (
            <EmptyState icon={<TagIcon className="h-8 w-8" />} title="No categories yet" />
          )}
          {!catLoading && !catError && categories && categories.length > 0 && (
            <Table>
              <THead>
                <TH>Name</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {categories.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="text-right">
                      <button onClick={() => deleteCategory(c.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Adjustment reasons" />
          <CardBody className="flex gap-2">
            <Input placeholder="New reason name" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
            <Button onClick={addReason} isLoading={reasonSaving}>
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </CardBody>
          {reasonFormError && <p className="px-5 pb-3 text-sm text-red-400">{reasonFormError}</p>}
          {reasonLoading && <LoadingState />}
          {reasonError && <ErrorState message={reasonError} onRetry={refetchReasons} />}
          {!reasonLoading && !reasonError && reasons && reasons.length === 0 && (
            <EmptyState icon={<TagIcon className="h-8 w-8" />} title="No reasons yet" />
          )}
          {!reasonLoading && !reasonError && reasons && reasons.length > 0 && (
            <Table>
              <THead>
                <TH>Name</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {reasons.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-right">
                      <button onClick={() => deleteReason(r.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
