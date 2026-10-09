import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-center">
      <p className="text-5xl font-bold text-slate-700">404</p>
      <p className="text-sm text-slate-400">This page doesn&apos;t exist.</p>
      <Link to="/dashboard">
        <Button size="sm">Back to dashboard</Button>
      </Link>
    </div>
  )
}
