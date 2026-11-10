import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RotateCcw, ShieldAlert } from "lucide-react"
import { EditConsultationFormState } from "./types"
import { ConsultationVitalsEditFields } from "./ConsultationVitalsEditFields"

interface ConsultationEditFormProps {
  editForm: EditConsultationFormState
  setEditForm: React.Dispatch<React.SetStateAction<EditConsultationFormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
}

export function ConsultationEditForm({
  editForm,
  setEditForm,
  onSubmit,
  onCancel,
  isPending,
}: ConsultationEditFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5 text-sm">
      {/* Avertissement Traçabilité Médicale */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
          <ShieldAlert className="size-5 text-amber-600 shrink-0" />
          <span>Modification réglementée du dossier médical</span>
        </div>
        <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
          Conformément aux exigences de traçabilité médico-légale, toute modification
          d&apos;une consultation validée fait l&apos;objet d&apos;un enregistrement horodaté
          dans l&apos;audit trail avec consignation de l&apos;auteur et des anciennes valeurs.
        </p>
        <div className="pt-2">
          <Label
            htmlFor="edit-motif-correction"
            className="text-xs font-bold text-amber-950 dark:text-amber-200"
          >
            Motif obligatoire de la correction / addenda *
          </Label>
          <Input
            id="edit-motif-correction"
            required
            placeholder="Ex : Réévaluation diagnostique après examen radiologique, ajustement du traitement..."
            value={editForm.motif_correction}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                motif_correction: e.target.value,
              }))
            }
            className="mt-1 bg-background"
          />
        </div>
      </div>

      {/* Motif & Diagnostic */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-motif">Motif de consultation *</Label>
          <Input
            id="edit-motif"
            required
            value={editForm.motif}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, motif: e.target.value }))
            }
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="edit-diag">Diagnostic *</Label>
          <textarea
            id="edit-diag"
            required
            rows={3}
            value={editForm.diagnostic}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, diagnostic: e.target.value }))
            }
            className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium"
          />
        </div>
      </div>

      {/* Constantes Physiologiques */}
      <ConsultationVitalsEditFields
        editForm={editForm}
        setEditForm={setEditForm}
      />

      {/* Observations & Compte-rendu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-obs">Observations cliniques</Label>
          <textarea
            id="edit-obs"
            rows={3}
            value={editForm.observations}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                observations: e.target.value,
              }))
            }
            className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <Label htmlFor="edit-cr">Compte-rendu médical</Label>
          <textarea
            id="edit-cr"
            rows={3}
            value={editForm.compte_rendu}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                compte_rendu: e.target.value,
              }))
            }
            className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Section Recommandation de suivi */}
      <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-suivi-recommande"
            checked={editForm.suivi_recommande}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                suivi_recommande: e.target.checked,
              }))
            }
            className="size-4 rounded border-border text-primary focus:ring-primary"
          />
          <Label
            htmlFor="edit-suivi-recommande"
            className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="size-3.5 text-primary" /> Recommander une visite
            de suivi au patient
          </Label>
        </div>

        {editForm.suivi_recommande && (
          <div className="space-y-3 pt-2 border-t border-border/60 animate-in fade-in duration-200">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Date de suivi recommandée
              </Label>
              <Input
                type="date"
                value={editForm.date_suivi_recommandee}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    date_suivi_recommandee: e.target.value,
                    date_controle_recommandee: e.target.value,
                  }))
                }
                className="max-w-xs bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Date indicative choisie librement par le médecin. Aucun créneau
                n&apos;est réservé, aucune facture créée, le patient revient quand il
                le souhaite.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Motif du suivi recommandé
              </Label>
              <Input
                value={editForm.motif_suivi}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    motif_suivi: e.target.value,
                  }))
                }
                placeholder="Ex : Contrôle NFS, surveillance tensionnelle, vérification cicatrisation..."
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Information médicale visible par la secrétaire et les confrères
                lors du retour du patient.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions du formulaire */}
      <div className="flex justify-end gap-3 pt-5 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isPending || !editForm.motif_correction.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
        >
          {isPending ? "Enregistrement..." : "Enregistrer la modification"}
        </Button>
      </div>
    </form>
  )
}
