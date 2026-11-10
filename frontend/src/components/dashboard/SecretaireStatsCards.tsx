import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  UserPlus,
  CalendarDots,
  ClockCountdown,
  WarningCircle,
  ClipboardText,
  Receipt,
  CreditCard,
} from "@phosphor-icons/react"
import { SecretaireDashboardData } from "./types"

interface SecretaireStatsCardsProps {
  stats: SecretaireDashboardData
}

export function SecretaireStatsCards({ stats }: SecretaireStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-4">
      {/* Total Patients */}
      <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Patients enregistrés</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.total_patients}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <Users size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Nouveaux Patients du Jour */}
      <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Nouveaux ajd.</span>
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              +{stats.nouveaux_patients_jour}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <UserPlus size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* RDV du jour */}
      <Card className="border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">RDV du jour</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.rdv_du_jour}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
            <CalendarDots size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Patients en attente */}
      <Card className={`border-border/80 shadow-xs transition-colors ${
        stats.patients_en_attente > 0 ? "border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10" : ""
      }`}>
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              En salle d&apos;attente
              {stats.patients_en_attente > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
            </span>
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1">
              {stats.patients_en_attente}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
            <ClockCountdown size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* RDV à confirmer */}
      <Card className="border-border/80 shadow-xs hover:border-sky-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">À confirmer</span>
            <span className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-1">
              {stats.rdv_a_confirmer}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
            <WarningCircle size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Consultations réalisées */}
      <Card className="border-border/80 shadow-xs hover:border-indigo-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Consultations ajd.</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.consultations_realisees_jour}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <ClipboardText size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Factures du jour */}
      <Card className="border-border/80 shadow-xs hover:border-slate-400 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Factures émises</span>
            <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {stats.factures_du_jour}
            </span>
          </div>
          <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-foreground shadow-xs">
            <Receipt size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>

      {/* Paiements encaissés aujourd'hui */}
      <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Encaissé aujourd&apos;hui</span>
            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.paiements_du_jour.toLocaleString("fr-FR")} Ar
            </span>
          </div>
          <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <CreditCard size={24} weight="duotone" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
