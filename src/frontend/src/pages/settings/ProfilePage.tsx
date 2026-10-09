import { useAuth } from "../../context/AuthContext"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { useNavigate } from "react-router-dom"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500">Your StockSense account details.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader title="Account" />
        <CardBody className="flex flex-col gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-slate-200">
              {user?.name?.slice(0, 1).toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-medium text-slate-100">{user?.name}</p>
              <p className="text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-3">
            <span className="text-slate-500">Role</span>
            <span className="text-slate-200">{user?.role?.replaceAll("_", " ")}</span>
          </div>
          <div className="border-t border-slate-800 pt-3">
            <Button
              variant="danger"
              onClick={() => {
                logout()
                navigate("/login")
              }}
            >
              Log out
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
