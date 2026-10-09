import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { verifyOtp } from "../../api/auth"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { ApiError } from "../../api/client"
import { AuthShell } from "./AuthShell"

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const emailFromState = (location.state as { email?: string })?.email ?? ""
  const [email, setEmail] = useState(emailFromState)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await verifyOtp({ email, otp })
      navigate("/reset-password", { state: { resetToken: result.resetToken } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Enter your code" description="Check your email for the one-time verification code">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Verification code"
          name="otp"
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit code"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Verify code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/forgot-password" className="font-medium text-brand-400 hover:text-brand-300">
          Request a new code
        </Link>
      </p>
    </AuthShell>
  )
}
