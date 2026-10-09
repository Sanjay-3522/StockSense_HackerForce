import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Button } from "../../components/ui/Button"
import { ApiError } from "../../api/client"
import { AuthShell } from "./AuthShell"

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("WAREHOUSE_STAFF")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signup(name, email, password, role as "INVENTORY_MANAGER" | "WAREHOUSE_STAFF")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign up. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Create your account" description="Set up your StockSense workspace">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters, with a letter and a number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select label="Role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
          <option value="INVENTORY_MANAGER">Inventory Manager</option>
        </Select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
