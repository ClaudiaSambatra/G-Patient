import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, Calendar, Phone, RefreshCw, Eye, Edit3, Trash2 } from "lucide-react"
import { Patient, PatientListResponse, computeAgeFallback } from "./types"

interface PatientsTableProps {
  data?: PatientListResponse
  isLoading: boolean
  isAdmin: boolean
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  onViewPatient: (p: Patient) => void
  onEditPatient: (p: Patient) => void
  onDeletePatient: (p: Patient) => void
}

export function PatientsTable({
  data,
  isLoading,
  isAdmin,
  page,
  setPage,
  onViewPatient,
  onEditPatient,
  onDeletePatient,
}: PatientsTableProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6">
        <CardTitle className="text-base font-semibold">Répertoire des dossiers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
            Chargement des patients...
          </div>
        ) : data?.results.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Users className="mx-auto size-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">Aucun patient trouvé</p>
            <p className="text-xs mt-1">Ajoutez un nouveau patient pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-6">Nom &amp; Prénom</th>
                  <th className="py-3 px-4">Âge / Sexe</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Groupe</th>
                  <th className="py-3 px-4">Allergies</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data?.results.map((p) => {
                  const ageVal = p.age ?? computeAgeFallback(p.date_naissance)
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 pl-6 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                            {p.nom[0]}
                            {p.prenom[0]}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">
                              {p.nom} {p.prenom}
                            </p>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-normal">
                              <Calendar className="size-3" />
                              {new Date(p.date_naissance).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-muted-foreground">
                          {p.sexe === "M" ? "H" : "F"} • {ageVal !== null ? `${ageVal} ans` : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {p.contact ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="size-3.5 text-muted-foreground/70" />
                            <span>{p.contact}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/50">Non renseigné</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.groupe_sanguin ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-600/20">
                            {p.groupe_sanguin}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate text-muted-foreground">
                        {p.allergies ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                            {p.allergies}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune</span>
                        )}
                      </td>
                      <td className="py-3 pr-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onViewPatient(p)}
                            title="Voir détails"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            onClick={() => onEditPatient(p)}
                            title="Modifier"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                          >
                            <Edit3 className="size-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => onDeletePatient(p)}
                              title="Supprimer"
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/50 cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 pt-4 pb-4 text-sm text-muted-foreground">
              <div>Page {page}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data || data.results.length < 20}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
