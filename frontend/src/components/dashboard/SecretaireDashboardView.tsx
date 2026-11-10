import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDots,
  ArrowClockwise,
  UserCheck,
  CreditCard,
  Users,
  CaretRight,
} from "@phosphor-icons/react"
import { SecretaireDashboardData } from "./types"
import { SecretaireStatsCards } from "./SecretaireStatsCards"

interface SecretaireDashboardViewProps {
  stats: SecretaireDashboardData
  onConfirmPresence: (rdvId: number) => void
  confirmingId: number | null
}

export function SecretaireDashboardView({
  stats,
  onConfirmPresence,
  confirmingId,
}: SecretaireDashboardViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Cartes Statistiques Métier */}
      <SecretaireStatsCards stats={stats} />

      {/* Planning des RDV du Jour & Derniers Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste RDV du Jour */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDots size={20} weight="duotone" className="text-primary" />
                Planning des rendez-vous du jour
                <span className="text-xs font-normal text-muted-foreground">
                  ({stats.rdv_jour_liste.length})
                </span>
              </CardTitle>
              <Link href="/rendezvous" className="text-xs text-primary hover:underline">
                Voir l&apos;agenda complet
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.rdv_jour_liste.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aucun rendez-vous prévu pour aujourd&apos;hui.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Heure</th>
                      <th className="py-2.5 px-4">Patient</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">Médecin</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Paiement</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stats.rdv_jour_liste.map((rdv) => (
                      <tr key={rdv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                          {rdv.heure}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/patients/${rdv.patient_id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {rdv.patient_nom}
                          </Link>
                          {rdv.type === "CONTROLE" && (
                            <span className="block text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                              Visite de suivi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[150px]">
                          {rdv.medecin_nom}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              rdv.statut === "CONFIRME"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : rdv.statut === "PLANIFIE"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                : rdv.statut === "TERMINE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {rdv.statut_display}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              rdv.statut_paiement === "PAYE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : rdv.statut_paiement === "GRATUIT"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                            }`}
                          >
                            {rdv.statut_paiement}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {rdv.statut === "PLANIFIE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onConfirmPresence(rdv.id)}
                              disabled={confirmingId === rdv.id}
                              className="h-7 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 gap-1"
                              title="Valider l'arrivée du patient indépendamment du paiement"
                            >
                              {confirmingId === rdv.id ? (
                                <ArrowClockwise size={12} className="animate-spin" />
                              ) : (
                                <UserCheck size={14} weight="duotone" />
                              )}
                              Confirmer présence
                            </Button>
                          ) : rdv.statut_paiement === "IMPAYE" ? (
                            <Link href={`/factures?search=${encodeURIComponent(rdv.patient_nom)}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-500/50 text-rose-700 hover:bg-rose-50 dark:text-rose-400 gap-1"
                              >
                                <CreditCard size={14} weight="duotone" />
                                Encaisser
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Derniers patients enregistrés */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users size={20} weight="duotone" className="text-primary" />
                Derniers inscrits
              </CardTitle>
              <Link href="/patients" className="text-xs text-primary hover:underline">
                Tous les patients
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.derniers_patients.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Aucun patient enregistré récemment.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.derniers_patients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {patient.nom} {patient.prenom}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.age ? `${patient.age} ans` : "Âge non précisé"} • {patient.sexe === "F" ? "Femme" : "Homme"}
                      </span>
                      {patient.contact && (
                        <span className="text-[11px] text-muted-foreground/80 font-mono">
                          {patient.contact}
                        </span>
                      )}
                    </div>
                    <CaretRight size={16} weight="bold" className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
