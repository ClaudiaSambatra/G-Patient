import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Flask, User, Stethoscope, X } from "@phosphor-icons/react"
import { Consultation, LigneDemandeExamen } from "./types"
import { ExamenLignesForm } from "./ExamenLignesForm"

interface ExamenCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  consultations?: Consultation[]
  formConsultation: string
  setFormConsultation: (v: string) => void
  formRenseignements: string
  setFormRenseignements: (v: string) => void
  formLignes: LigneDemandeExamen[]
  onAddLine: () => void
  onUpdateLine: (
    index: number,
    field: keyof LigneDemandeExamen,
    value: string
  ) => void
  onRemoveLine: (index: number) => void
}

export function ExamenCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  consultations,
  formConsultation,
  setFormConsultation,
  formRenseignements,
  setFormRenseignements,
  formLignes,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: ExamenCreateModalProps) {
  if (!isOpen) return null

  const selectedC = consultations?.find(
    (c) => String(c.id) === String(formConsultation)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Flask size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Nouvelle demande d&apos;examens médicaux
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Consultation Selector */}
          <div className="space-y-1.5">
            <Label
              htmlFor="exam-consultation"
              className="font-semibold text-xs text-foreground"
            >
              Consultation *
            </Label>
            <select
              id="exam-consultation"
              required
              value={formConsultation}
              onChange={(e) => setFormConsultation(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">
                -- Sélectionner une consultation du patient --
              </option>
              {(consultations || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.patient_nom} {c.patient_prenom} — {c.motif || "Consultation"} (
                  {new Date(c.date_consultation).toLocaleDateString("fr-FR")})
                  {c.medecin_nom ? ` [Dr. ${c.medecin_nom}]` : ""}
                </option>
              ))}
            </select>

            {selectedC && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-muted/40 border border-border/70 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User size={15} weight="duotone" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {selectedC.patient_nom} {selectedC.patient_prenom}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      • Consultation du{" "}
                      {new Date(selectedC.date_consultation).toLocaleDateString(
                        "fr-FR"
                      )}
                    </span>
                  </div>
                </div>
                {selectedC.medecin_nom && (
                  <div className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Stethoscope
                      size={14}
                      weight="duotone"
                      className="text-primary"
                    />
                    Dr. {selectedC.medecin_nom}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Renseignements cliniques */}
          <div className="space-y-1.5">
            <Label
              htmlFor="exam-renseignements"
              className="font-semibold text-xs text-foreground"
            >
              Renseignements cliniques
            </Label>
            <Textarea
              id="exam-renseignements"
              rows={2}
              placeholder="Ex : Bilan préopératoire, suspicion de pneumopathie, fièvre inexpliquée..."
              value={formRenseignements}
              onChange={(e) => setFormRenseignements(e.target.value)}
              className="rounded-xl text-xs sm:text-sm min-h-[64px]"
            />
          </div>

          {/* Lignes d'examens dynamiques */}
          <ExamenLignesForm
            lignes={formLignes}
            onAddLine={onAddLine}
            onUpdateLine={onUpdateLine}
            onRemoveLine={onRemoveLine}
          />

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5"
            >
              <Flask size={16} weight="duotone" />
              {isPending ? "Création en cours..." : "Valider la prescription"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
