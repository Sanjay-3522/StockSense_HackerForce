import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { forgotPassword } from "../../api/auth"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { ApiError } from "../../api/client"
import { AuthShell } from "./AuthShell"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await forgotPassword({ email })
      navigate("/verify-otp", { state: { email } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send reset code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Forgot your password?" description="We'll send a one-time code to your email">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Send reset code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{" "}
        <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
