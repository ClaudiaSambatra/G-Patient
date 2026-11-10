import { Button } from "@/components/ui/button"
import { Eye, XCircle, FileText, Stethoscope, Plus, RefreshCw } from "lucide-react"
import { Patient, Consultation, computeAgeFallback } from "./types"

interface PatientDetailModalProps {
  patient: Patient | null
  onClose: () => void
  isMedecin: boolean
  onOpenConsultationModal: () => void
  consultationsData?: Consultation[] | null
  isLoadingConsultations: boolean
}

export function PatientDetailModal({
  patient,
  onClose,
  isMedecin,
  onOpenConsultationModal,
  consultationsData,
  isLoadingConsultations,
}: PatientDetailModalProps) {
  if (!patient) return null

  const ageVal = patient.age ?? computeAgeFallback(patient.date_naissance)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Dossier médical — {patient.nom} {patient.prenom}
              </h3>
              <p className="text-xs text-muted-foreground">
                Fiche patient détaillée et historique des consultations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Synthèse État Civil & Données Vitales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div>
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Sexe</span>
              <span className="font-semibold text-sm text-foreground">
                {patient.sexe === "M" ? "Masculin" : "Féminin"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Naissance &amp; Âge</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-sm">
                  {new Date(patient.date_naissance).toLocaleDateString("fr-FR")}
                </span>
                {ageVal !== null && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                    {ageVal} ans
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Contact</span>
              <span className="font-semibold text-sm text-foreground truncate block">
                {patient.contact || "Non renseigné"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Groupe sanguin</span>
              <span className="font-bold text-sm text-red-600 dark:text-red-400">
                {patient.groupe_sanguin || "Non renseigné"}
              </span>
            </div>
          </div>

          {/* Disposition 2 colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne gauche (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Adresse de résidence
                </span>
                <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50">
                  {patient.adresse || "Non renseignée"}
                </p>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Antécédents médicaux
                </span>
                <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">
                  {patient.antecedents || "Aucun antécédent particulier"}
                </p>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Allergies signalées
                </span>
                <p className="text-sm bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded-lg border border-red-200 dark:border-red-900/40 whitespace-pre-wrap font-medium">
                  {patient.allergies || "Aucune allergie connue"}
                </p>
              </div>
            </div>

            {/* Colonne droite (7 cols) : Historique des Consultations */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold uppercase text-primary flex items-center gap-2">
                  <FileText className="size-4" /> Historique des Consultations
                </span>
                {isMedecin && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                    onClick={onOpenConsultationModal}
                  >
                    <Plus className="size-4 mr-1" /> Nouvelle consultation
                  </Button>
                )}
              </div>

              {isLoadingConsultations ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2 p-6">
                  <RefreshCw className="size-3.5 animate-spin" /> Chargement des consultations...
                </div>
              ) : !consultationsData || consultationsData.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border/80 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground italic">
                    Aucune consultation enregistrée pour ce patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {consultationsData.map((consult: Consultation) => (
                    <div
                      key={consult.id}
                      className="bg-muted/30 border border-border/60 rounded-xl p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{consult.motif || "Consultation de suivi"}</h4>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                          {new Date(consult.date_consultation).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Stethoscope className="size-3" /> {consult.medecin_nom}
                      </div>

                      {consult.observations && (
                        <div className="mb-2">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Observations / Constantes
                          </span>
                          <p className="text-xs mt-0.5 whitespace-pre-wrap">{consult.observations}</p>
                        </div>
                      )}

                      {consult.diagnostic && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-500">
                            Diagnostic
                          </span>
                          <p className="text-xs mt-0.5 whitespace-pre-wrap text-foreground font-medium">
                            {consult.diagnostic}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/60 pt-4">
            <span>Créé le: {new Date(patient.date_creation).toLocaleString("fr-FR")}</span>
            <span>Dernière maj: {new Date(patient.date_modification).toLocaleString("fr-FR")}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  )
}
