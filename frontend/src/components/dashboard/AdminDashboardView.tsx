import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendUp,
  CalendarDots,
  Stethoscope,
  Heartbeat,
  CreditCard,
  UserPlus,
  CaretRight,
} from "@phosphor-icons/react"
import { AdminDashboardData } from "./types"
import { AdminStatsCards } from "./AdminStatsCards"

interface AdminDashboardViewProps {
  stats: AdminDashboardData
}

export function AdminDashboardView({ stats }: AdminDashboardViewProps) {
  const maxCons = Math.max(1, ...stats.evolution_consultations.map((d) => d.total))

  return (
    <div className="flex flex-col gap-6">
      {/* 8 Indicateurs Globaux Clinique & Finances */}
      <AdminStatsCards stats={stats} />

      {/* Graphiques visuels d'analyse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution des consultations sur 14 jours */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendUp size={20} weight="duotone" className="text-primary" />
                Évolution des consultations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-48 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2">
              {stats.evolution_consultations.map((item, idx) => {
                const heightPercent = maxCons > 0 ? (item.total / maxCons) * 100 : 0
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.total}
                    </span>
                    <div
                      className="w-full bg-primary/20 dark:bg-primary/30 rounded-t-sm group-hover:bg-primary transition-colors relative flex items-end justify-center min-h-[4px]"
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                    >
                      {item.total > 0 && (
                        <div className="absolute top-1 size-1 rounded-full bg-white opacity-80" />
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-mono">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Répartition des statuts de Rendez-vous */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDots size={20} weight="duotone" className="text-primary" />
              Répartition des rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-3">
              {stats.repartition_rdv.map((item) => (
                <div key={item.statut} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-semibold text-foreground">
                      {item.count} ({stats.total_rdv > 0 ? Math.round((item.count / stats.total_rdv) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${stats.total_rdv > 0 ? (item.count / stats.total_rdv) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activité par médecin & Dernières activités clinique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tableau Activité des Médecins */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Stethoscope size={20} weight="duotone" className="text-primary" />
                Corps Médical &amp; Activité
              </CardTitle>
              <Link href="/utilisateurs" className="text-xs text-primary hover:underline">
                Gestion praticiens
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {stats.activite_medecins.map((med) => (
                <div key={med.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm">{med.medecin}</span>
                    <span className="text-xs text-muted-foreground">{med.specialite}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground block">
                        {med.consultations} consultation{med.consultations > 1 ? "s" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {med.rdv_jour} RDV ajd.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        med.absent
                          ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20"
                          : "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                      }`}
                    >
                      {med.absent ? "Absent" : "Présent"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dernières activités de la clinique */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heartbeat size={20} weight="duotone" className="text-primary" />
              Activités récentes de l&apos;établissement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.dernieres_activites.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Aucune activité récente enregistrée.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.dernieres_activites.map((act) => (
                  <Link
                    key={act.id}
                    href={act.lien}
                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                          act.type === "CONSULTATION"
                            ? "bg-indigo-500/10 text-indigo-600"
                            : act.type === "PAIEMENT"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {act.type === "CONSULTATION" ? (
                          <Stethoscope size={18} weight="duotone" />
                        ) : act.type === "PAIEMENT" ? (
                          <CreditCard size={18} weight="duotone" />
                        ) : (
                          <UserPlus size={18} weight="duotone" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {act.titre}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{act.description}</span>
                      </div>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
