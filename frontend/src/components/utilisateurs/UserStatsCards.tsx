import { Users, Stethoscope, Briefcase, Shield, CheckCircle2 } from "lucide-react"
import { UserStatsResponse } from "./types"

interface UserStatsCardsProps {
  statsData?: UserStatsResponse
}

export function UserStatsCards({ statsData }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {/* Total */}
      <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-primary/40">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Total</span>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Users className="size-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-foreground">
          {statsData?.total ?? 0}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Comptes enregistrés</div>
      </div>

      {/* Médecins */}
      <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-emerald-200">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Médecins</span>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
            <Stethoscope className="size-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {statsData?.medecins ?? 0}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Corps médical</div>
      </div>

      {/* Secrétaires */}
      <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-amber-200">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Secrétaires</span>
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
            <Briefcase className="size-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
          {statsData?.secretaires ?? 0}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Accueil &amp; Réception</div>
      </div>

      {/* Administrateurs */}
      <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-accent/40">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Admins</span>
          <div className="rounded-lg bg-accent/10 p-2 text-accent">
            <Shield className="size-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-accent">
          {statsData?.admins ?? 0}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Accès complet</div>
      </div>

      {/* Actifs */}
      <div className="group col-span-2 sm:col-span-1 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-cyan-200">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Actifs</span>
          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
          {statsData?.actifs ?? 0}
          <span className="text-xs font-normal text-muted-foreground ml-1.5">
            / {statsData?.inactifs ?? 0} inactif(s)
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Comptes opérationnels</div>
      </div>
    </div>
  )
}
