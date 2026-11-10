import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ClockCountdown,
  Stethoscope,
  CalendarCheck,
  CaretRight,
  Eye,
  CheckCircle,
} from "@phosphor-icons/react"
import { MedecinDashboardData } from "./types"
import { MedecinStatsCards } from "./MedecinStatsCards"

interface MedecinDashboardViewProps {
  stats: MedecinDashboardData
}

export function MedecinDashboardView({ stats }: MedecinDashboardViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <MedecinStatsCards stats={stats} />

      {/* File d'attente et consultation du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Stethoscope size={20} weight="duotone" className="text-primary" />
                File active des patients du jour
                <span className="text-xs font-normal text-muted-foreground">
                  ({stats.patients_a_recevoir.length})
                </span>
              </CardTitle>
              <Link href="/consultations" className="text-xs text-primary hover:underline flex items-center gap-1">
                Historique des consultations <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.patients_a_recevoir.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center">
                <CalendarCheck size={40} weight="duotone" className="mb-2 text-muted-foreground/60" />
                Aucun patient à recevoir aujourd&apos;hui.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.patients_a_recevoir.map((item) => (
                  <div
                    key={item.rdv_id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      item.en_attente
                        ? "bg-amber-50/40 dark:bg-amber-950/10 border-l-4 border-l-amber-500"
                        : item.consultation_terminee
                        ? "bg-muted/10 opacity-75"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center justify-center min-w-[50px] p-2 rounded-lg bg-background border border-border text-center">
                        <span className="text-xs font-bold text-foreground">{item.heure}</span>
                        <span className="text-[10px] text-muted-foreground">{item.type_display}</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/patients/${item.patient_id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline text-sm sm:text-base"
                          >
                            {item.patient_nom}
                          </Link>
                          {item.en_attente && (
                            <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] py-0">
                              En salle d&apos;attente
                            </Badge>
                          )}
                          {item.consultation_terminee && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500 text-[10px] py-0">
                              Consulté
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.patient_age ? `${item.patient_age} ans` : "Âge non renseigné"} •{" "}
                          {item.patient_sexe === "F" ? "Féminin" : "Masculin"}
                          {item.motif ? ` • Motif : ${item.motif}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link href={`/patients/${item.patient_id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" title="Consulter le dossier médical">
                          <Eye size={14} weight="duotone" />
                          Dossier
                        </Button>
                      </Link>

                      {item.consultation_terminee ? (
                        <Link href="/consultations">
                          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5 text-muted-foreground">
                            <CheckCircle size={14} weight="duotone" className="text-emerald-500" />
                            Voir acte
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/rendezvous?search=${encodeURIComponent(item.patient_nom)}`}>
                          <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs">
                            <Stethoscope size={14} weight="duotone" />
                            Démarrer consultation
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonne latérale Praticien */}
        <div className="flex flex-col gap-6">
          {/* Prochaines Visites de Contrôle Programmées */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarCheck size={18} weight="duotone" className="text-cyan-600" />
                Suivis programmés à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.prochains_suivis.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Aucune visite de suivi planifiée prochainement.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stats.prochains_suivis.map((suivi) => (
                    <div key={suivi.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <Link
                          href={`/patients/${suivi.patient_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {suivi.patient_nom}
                        </Link>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {suivi.heure} • {suivi.motif}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {suivi.statut_display}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suivis Recommandés en attente de retour patient */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClockCountdown size={18} weight="duotone" className="text-purple-600" />
                Suivis recommandés actifs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.suivis_en_attente_retour.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Aucun suivi en attente de retour.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stats.suivis_en_attente_retour.map((item) => (
                    <div key={item.consultation_id} className="p-3 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/patients/${item.patient_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.patient_nom}
                        </Link>
                        {item.date_suivi_recommandee && (
                          <span className="text-[10px] font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                            Recommandé : {item.date_suivi_recommandee}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        Motif : {item.motif_suivi}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
