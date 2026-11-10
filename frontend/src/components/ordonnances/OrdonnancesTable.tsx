import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileSignature,
  RefreshCw,
  Calendar,
  User,
  Stethoscope,
  Printer,
  Pencil,
  Ban,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Ordonnance, getAge } from "./types"

interface OrdonnancesTableProps {
  filteredOrdonnances: Ordonnance[]
  isLoading: boolean
  expandedOrdId: number | null
  setExpandedOrdId: (id: number | null) => void
  isDoctor: boolean
  currentUserId?: number
  onPrint: (ord: Ordonnance) => void
  onOpenHistory: (ord: Ordonnance) => void
  onOpenEdit: (ord: Ordonnance) => void
  onOpenCancel: (ord: Ordonnance) => void
}

export function OrdonnancesTable({
  filteredOrdonnances,
  isLoading,
  expandedOrdId,
  setExpandedOrdId,
  isDoctor,
  currentUserId,
  onPrint,
  onOpenHistory,
  onOpenEdit,
  onOpenCancel,
}: OrdonnancesTableProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Registre officiel des ordonnances
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {filteredOrdonnances.length} ordonnances
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
            Chargement des ordonnances...
          </div>
        ) : filteredOrdonnances.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <FileSignature className="mx-auto size-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">Aucune ordonnance trouvée</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les ordonnances rédigées lors des consultations apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-6">N° Ordonnance</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Médecin Prescripteur</th>
                  <th className="py-3 px-4">Prescription</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredOrdonnances.map((ord) => {
                  const isExpanded = expandedOrdId === ord.id
                  const isAuthorDoctor = isDoctor && currentUserId === ord.medecin_id
                  const canModify =
                    isAuthorDoctor &&
                    ord.statut !== "ANNULEE" &&
                    ord.facture_statut !== "PAYEE"

                  return (
                    <tr
                      key={ord.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      {/* Numéro officiel */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {ord.numero}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-foreground text-xs font-medium">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {ord.patient_nom} {ord.patient_prenom}
                          </span>
                        </div>
                        {ord.patient_date_naissance && (
                          <span className="text-[11px] text-muted-foreground pl-5">
                            {getAge(ord.patient_date_naissance)}
                          </span>
                        )}
                      </td>

                      {/* Médecin */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-foreground font-medium text-xs">
                          <Stethoscope className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{ord.medecin_nom}</span>
                        </div>
                        {ord.medecin_specialite && (
                          <span className="text-[11px] text-muted-foreground pl-5 block">
                            {ord.medecin_specialite}
                          </span>
                        )}
                      </td>

                      {/* Résumé Prescription */}
                      <td className="py-3 px-4">
                        <div className="max-w-[240px]">
                          {ord.lignes && ord.lignes.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {ord.lignes.slice(0, 2).map((l, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block text-[11px] bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border/60"
                                  >
                                    {l.medicament} {l.dosage || ""}
                                  </span>
                                ))}
                                {ord.lignes.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{ord.lignes.length - 2} autres
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  setExpandedOrdId(isExpanded ? null : ord.id)
                                }
                                className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="size-3" />
                                ) : (
                                  <ChevronDown className="size-3" />
                                )}
                                {isExpanded
                                  ? "Masquer détails"
                                  : "Voir lignes détaillées"}
                              </button>
                            </div>
                          ) : (
                            <div
                              className="line-clamp-2 text-xs font-medium text-foreground"
                              title={ord.medicaments}
                            >
                              {ord.medicaments}
                            </div>
                          )}

                          {/* Accordéon lignes structurées */}
                          {isExpanded && ord.lignes && (
                            <div className="mt-2 p-2 rounded-lg bg-card border border-border text-xs space-y-1.5 shadow-sm">
                              {ord.lignes.map((l, idx) => (
                                <div
                                  key={idx}
                                  className="border-b border-border/40 pb-1 last:border-none last:pb-0"
                                >
                                  <span className="font-semibold text-primary">
                                    {idx + 1}. {l.medicament}
                                  </span>
                                  {l.dosage && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ({l.dosage})
                                    </span>
                                  )}
                                  <div className="text-[11px] text-muted-foreground">
                                    {l.dose_par_prise} • {l.frequence} • {l.duree}
                                  </div>
                                  {l.instructions && (
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                      💡 {l.instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Imprimer */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrint(ord)}
                            title="Imprimer l'ordonnance A4"
                            className="h-8 w-8 p-0 border-border bg-card hover:bg-muted text-foreground"
                          >
                            <Printer className="size-3.5 text-primary" />
                          </Button>

                          {/* Historique d'audit */}
                          {ord.statut === "MODIFIEE" &&
                            ord.historique &&
                            ord.historique.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenHistory(ord)}
                                title="Consulter l'historique d'audit des modifications"
                                className="h-8 w-8 p-0 border-border bg-card hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600"
                              >
                                <History className="size-3.5" />
                              </Button>
                            )}

                          {/* Modifier (Médecin prescripteur uniquement) */}
                          {canModify && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenEdit(ord)}
                              title="Corriger l'ordonnance"
                              className="h-8 w-8 p-0 border-border bg-card hover:bg-muted text-foreground"
                            >
                              <Pencil className="size-3.5 text-blue-600" />
                            </Button>
                          )}

                          {/* Annuler (Médecin prescripteur uniquement) */}
                          {canModify && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenCancel(ord)}
                              title="Annuler formellement l'ordonnance"
                              className="h-8 w-8 p-0 border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/30 text-destructive"
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
