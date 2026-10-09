import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { ApiError } from "../../api/client"
import { AuthShell } from "./AuthShell"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard"
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" description="Sign in to your StockSense workspace">
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
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-medium text-brand-400 hover:text-brand-300">
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}
