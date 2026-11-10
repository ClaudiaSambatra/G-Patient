import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  ClipboardText,
  CreditCard,
  Warning,
  CalendarDots,
  Receipt,
  UserCheck,
} from "@phosphor-icons/react"
import { AdminDashboardData } from "./types"

interface AdminStatsCardsProps {
  stats: AdminDashboardData
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-4">
      {/* Total Patients */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Patients inscrits</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.total_patients}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <Users size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Total Consultations */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Total Consultations</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.total_consultations}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-xs">
            <ClipboardText size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Total Encaissé */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Recettes encaissées</span>
            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.total_encaisse.toLocaleString("fr-FR")} Ar
            </span>
          </div>
          <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-xs">
            <CreditCard size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Reste à recouvrer / Impayés */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Reste à recouvrer</span>
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
              {stats.total_impaye.toLocaleString("fr-FR")} Ar
            </span>
          </div>
          <div className="size-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-xs">
            <Warning size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Taux de Recouvrement */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Taux recouvrement</span>
            <span className="text-sm font-bold text-foreground">{stats.taux_recouvrement}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, stats.taux_recouvrement))}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Total Rendez-vous */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Total RDV</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.total_rdv}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-xs">
            <CalendarDots size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Factures impayées (nombre) */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Factures impayées</span>
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
              {stats.factures_impayees}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-xs">
            <Receipt size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Corps Médical Présent */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Médecins présents ajd.</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.medecins_presents_jour} / {stats.medecins_actifs}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shadow-xs">
            <UserCheck size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
