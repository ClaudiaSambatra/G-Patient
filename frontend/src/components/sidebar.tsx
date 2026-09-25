"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Users,
  Shield,
  Stethoscope,
  LogOut,
  Activity,
  UserCheck,
  Building2,
  Calendar as CalendarIcon,
  FileText,
  FileSignature,
  CreditCard,
  BarChart3,
  Pill,
} from "lucide-react"

export interface CurrentUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: "ADMIN" | "MEDECIN" | "SECRETAIRE" | "PATIENT"
  role_display: string
  telephone: string
  is_superuser: boolean
  is_active: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
    retry: false,
  })

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
    }
    router.push("/login")
  }

  const isAdmin = user?.role === "ADMIN" || user?.is_superuser

  return (
    <aside className="w-64 h-full border-r border-border/60 bg-background/85 backdrop-blur-md transition-all flex flex-col">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/60">
        <Link
          href="/patients"
          className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
          id="nav-brand-logo"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
            <Activity className="size-5 transition-transform group-hover:rotate-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Gestion Patients
              <span className="rounded-full bg-blue-50 px-1.5 py-0 text-[9px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Pro
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Building2 className="size-2.5" /> CHU Antananarivo
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        <Link
          href="/patients"
          id="nav-link-patients"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/patients"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="size-4.5" />
          Patients
        </Link>

        <Link
          href="/rendezvous"
          id="nav-link-rendezvous"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/rendezvous"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CalendarIcon className="size-4.5" />
          Rendez-vous
        </Link>

        <Link
          href="/consultations"
          id="nav-link-consultations"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/consultations"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="size-4.5" />
          Consultations
        </Link>

        <Link
          href="/ordonnances"
          id="nav-link-ordonnances"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/ordonnances"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileSignature className="size-4.5" />
          Ordonnances
        </Link>

        <Link
          href="/factures"
          id="nav-link-factures"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/factures"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CreditCard className="size-4.5" />
          Facturation
        </Link>

        <Link
          href="/pharmacie"
          id="nav-link-pharmacie"
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
            pathname === "/pharmacie"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Pill className="size-4.5" />
          Pharmacie
        </Link>

        {isAdmin && (
          <Link
            href="/statistiques"
            id="nav-link-statistiques"
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              pathname === "/statistiques"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-4.5" />
            Statistiques
          </Link>
        )}

        {isAdmin && (
          <Link
            href="/utilisateurs"
            id="nav-link-utilisateurs"
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              pathname === "/utilisateurs"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Shield className="size-4.5 text-indigo-200" />
            <span className="flex-1">Utilisateurs</span>
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Admin
            </span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border/60">
        {user && (
          <div className="flex items-center gap-3 mb-4 px-2" id="nav-user-badge">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-xs">
              {(user.first_name?.[0] || user.username[0] || "U").toUpperCase()}
              {(user.last_name?.[0] || "").toUpperCase()}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-xs font-semibold text-foreground leading-tight truncate w-full">
                {user.full_name || user.username}
              </span>
              <span className="flex items-center gap-1 text-[10px] leading-tight font-medium text-muted-foreground mt-0.5">
                {user.role === "ADMIN" && (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                    <Shield className="size-2.5" /> Admin
                  </span>
                )}
                {user.role === "MEDECIN" && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <Stethoscope className="size-2.5" /> Médecin
                  </span>
                )}
                {user.role === "SECRETAIRE" && (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <UserCheck className="size-2.5" /> Secrétaire
                  </span>
                )}
                {user.role === "PATIENT" && <span>Patient</span>}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          id="nav-btn-logout"
          title="Se déconnecter"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
