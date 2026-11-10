import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PencilSimple, WarningCircle, X } from "@phosphor-icons/react"
import { DemandeExamen, LigneDemandeExamen } from "./types"
import { ExamenLignesForm } from "./ExamenLignesForm"

export interface EditModalState {
  isOpen: boolean
  demande: DemandeExamen | null
  motif_correction: string
  renseignements_cliniques: string
  lignes: LigneDemandeExamen[]
}

interface ExamenEditModalProps {
  editModal: EditModalState
  setEditModal: React.Dispatch<React.SetStateAction<EditModalState>>
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function ExamenEditModal({
  editModal,
  setEditModal,
  onSubmit,
  isPending,
}: ExamenEditModalProps) {
  if (!editModal.isOpen || !editModal.demande) return null

  const handleAddLine = () =>
    setEditModal((prev) => ({
      ...prev,
      lignes: [
        ...prev.lignes,
        { nom_examen: "", categorie: "BIOLOGIE", instructions: "" },
      ],
    }))

  const handleUpdateLine = (
    index: number,
    field: keyof LigneDemandeExamen,
    value: string
  ) =>
    setEditModal((prev) => {
      const next = [...prev.lignes]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, lignes: next }
    })

  const handleRemoveLine = (index: number) =>
    setEditModal((prev) => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index),
    }))

  const handleClose = () =>
    setEditModal({
      isOpen: false,
      demande: null,
      motif_correction: "",
      renseignements_cliniques: "",
      lignes: [],
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PencilSimple size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Modifier la demande {editModal.demande.numero}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <Label
              htmlFor="edit-motif"
              className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5 text-xs"
            >
              <WarningCircle
                size={16}
                weight="duotone"
                className="text-amber-600"
              />
              Motif obligatoire de la modification *
            </Label>
            <Textarea
              id="edit-motif"
              required
              rows={2}
              placeholder="Ex : Précision du cliché radiologique, ajout d'un bilan complémentaire..."
              value={editModal.motif_correction}
              onChange={(e) =>
                setEditModal((prev) => ({
                  ...prev,
                  motif_correction: e.target.value,
                }))
              }
              className="bg-background text-xs sm:text-sm rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="edit-renseignements"
              className="font-semibold text-xs text-foreground"
            >
              Renseignements cliniques
            </Label>
            <Textarea
              id="edit-renseignements"
              rows={2}
              value={editModal.renseignements_cliniques}
              onChange={(e) =>
                setEditModal((prev) => ({
                  ...prev,
                  renseignements_cliniques: e.target.value,
                }))
              }
              className="rounded-xl text-xs sm:text-sm min-h-[64px]"
            />
          </div>

          <ExamenLignesForm
            lignes={editModal.lignes}
            onAddLine={handleAddLine}
            onUpdateLine={handleUpdateLine}
            onRemoveLine={handleRemoveLine}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5"
            >
              <PencilSimple size={16} weight="duotone" />
              {isPending
                ? "Modification..."
                : "Valider les modifications"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
