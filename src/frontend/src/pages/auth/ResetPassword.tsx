import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { resetPassword } from "../../api/auth"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { ApiError } from "../../api/client"
import { AuthShell } from "./AuthShell"

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const resetToken = (location.state as { resetToken?: string })?.resetToken ?? ""
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!resetToken) {
      setError("Reset session expired. Please request a new code.")
      return
    }
    setIsLoading(true)
    try {
      await resetPassword({ resetToken, newPassword })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" description="You can now sign in with your new password">
        <Button className="w-full" onClick={() => navigate("/login")}>
          Go to sign in
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password" description="Choose a new password for your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          name="newPassword"
          required
          minLength={8}
          hint="At least 8 characters, with a letter and a number"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          name="confirm"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
