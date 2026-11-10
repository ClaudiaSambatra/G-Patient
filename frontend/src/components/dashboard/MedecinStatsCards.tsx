import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarDots,
  ClockCountdown,
  Stethoscope,
  ClipboardText,
  Heartbeat,
  CalendarCheck,
} from "@phosphor-icons/react"
import { MedecinDashboardData } from "./types"

interface MedecinStatsCardsProps {
  stats: MedecinDashboardData
}

export function MedecinStatsCards({ stats }: MedecinStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
      {/* Mes RDV du jour */}
      <Card className="border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">RDV du jour</span>
            <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-xs">
              <CalendarDots size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {stats.rdv_du_jour}
          </span>
        </CardContent>
      </Card>

      {/* En salle d'attente (Focus praticien) */}
      <Card
        className={`border-border/80 shadow-xs transition-colors ${
          stats.patients_en_attente > 0
            ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
            : ""
        }`}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              En attente
              {stats.patients_en_attente > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
            </span>
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-xs">
              <ClockCountdown size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {stats.patients_en_attente}
          </span>
        </CardContent>
      </Card>

      {/* Consultations aujourd'hui */}
      <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Consultés ajd.</span>
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-xs">
              <Stethoscope size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.consultations_jour}
          </span>
        </CardContent>
      </Card>

      {/* Total Consultations (Historique) */}
      <Card className="border-border/80 shadow-xs hover:border-indigo-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total actes</span>
            <div className="size-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-xs">
              <ClipboardText size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {stats.total_consultations}
          </span>
        </CardContent>
      </Card>

      {/* Suivis recommandés actifs */}
      <Card className="border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-medium text-muted-foreground"
              title="Recommandations de suivi en attente de retour patient"
            >
              Suivis recommandés
            </span>
            <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shadow-xs">
              <Heartbeat size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
            {stats.suivis_recommandes_actifs}
          </span>
        </CardContent>
      </Card>

      {/* Suivis programmés à venir (RDVs de contrôle) */}
      <Card className="border-border/80 shadow-xs hover:border-cyan-500/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-medium text-muted-foreground"
              title="Visites de suivi déjà planifiées dans l'agenda"
            >
              Suivis à venir
            </span>
            <div className="size-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 shadow-xs">
              <CalendarCheck size={20} weight="duotone" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">
            {stats.suivis_programmes_a_venir}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
