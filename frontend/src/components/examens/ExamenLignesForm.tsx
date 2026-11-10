import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Microscope, Plus, Trash } from "@phosphor-icons/react"
import { LigneDemandeExamen, CATEGORIES_EXAMEN } from "./types"

interface ExamenLignesFormProps {
  lignes: LigneDemandeExamen[]
  onAddLine: () => void
  onUpdateLine: (
    index: number,
    field: keyof LigneDemandeExamen,
    value: string
  ) => void
  onRemoveLine: (index: number) => void
}

export function ExamenLignesForm({
  lignes,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: ExamenLignesFormProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-xs flex items-center gap-1.5">
          <Microscope size={16} weight="duotone" className="text-primary" />
          Examens prescrits ({lignes.length}) *
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAddLine}
          className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus size={14} weight="bold" />
          Ajouter un examen
        </Button>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {lignes.map((ligne, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 relative shadow-2xs hover:border-border transition-colors"
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-foreground">
                  Examen n°{idx + 1}
                </span>
              </div>
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveLine(idx)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Supprimer cette ligne"
                >
                  <Trash size={14} weight="duotone" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Nom de l&apos;examen *
                </Label>
                <Input
                  required
                  placeholder="Ex : NFS + CRP, Radiographie pulmonaire..."
                  value={ligne.nom_examen}
                  onChange={(e) =>
                    onUpdateLine(idx, "nom_examen", e.target.value)
                  }
                  className="h-9 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Catégorie *</Label>
                <select
                  value={ligne.categorie}
                  onChange={(e) =>
                    onUpdateLine(
                      idx,
                      "categorie",
                      e.target.value as "BIOLOGIE" | "IMAGERIE" | "AUTRE"
                    )
                  }
                  className="flex w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {CATEGORIES_EXAMEN.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Instructions / Précautions
              </Label>
              <Input
                placeholder="Ex : À jeun le matin, vessie pleine, face et profil..."
                value={ligne.instructions || ""}
                onChange={(e) =>
                  onUpdateLine(idx, "instructions", e.target.value)
                }
                className="h-9 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
