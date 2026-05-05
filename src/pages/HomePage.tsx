import { useAuth } from "@/contexts/auth-context"
import AdminDashboard from "./dashboard/AdminDashboard"
import InvestorDashboard from "./dashboard/InvestorDashboard"
import ClientDashboard from "./dashboard/ClientDashboard"

export default function HomePage() {
  const { user } = useAuth()

  if (!user) return null

  const isAdmin = user.role === "admin" || user.isOwner

  if (isAdmin) return <AdminDashboard />
  if (user.role === "investor") return <InvestorDashboard />
  return <ClientDashboard />
}
