import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity } from "lucide-react"
import { EditConsultationFormState, computeBMI } from "./types"

interface ConsultationVitalsEditFieldsProps {
  editForm: EditConsultationFormState
  setEditForm: React.Dispatch<React.SetStateAction<EditConsultationFormState>>
}

export function ConsultationVitalsEditFields({
  editForm,
  setEditForm,
}: ConsultationVitalsEditFieldsProps) {
  const editBmi = computeBMI(
    editForm.constantes.poids,
    editForm.constantes.taille
  )

  return (
    <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="size-4 text-primary" /> Constantes physiologiques
        </Label>
        {editBmi && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${editBmi.color}`}
          >
            IMC : {editBmi.val} kg/m² — {editBmi.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            Température (°C)
          </span>
          <Input
            type="number"
            step="0.1"
            placeholder="37.0"
            value={editForm.constantes.temperature}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                constantes: {
                  ...prev.constantes,
                  temperature: e.target.value,
                },
              }))
            }
            className="h-9 text-xs"
          />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            Tension
          </span>
          <Input
            placeholder="120/80"
            value={editForm.constantes.tension_arterielle}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                constantes: {
                  ...prev.constantes,
                  tension_arterielle: e.target.value,
                },
              }))
            }
            className="h-9 text-xs"
          />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            Fréq. card. (bpm)
          </span>
          <Input
            type="number"
            placeholder="72"
            value={editForm.constantes.frequence_cardiaque}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                constantes: {
                  ...prev.constantes,
                  frequence_cardiaque: e.target.value,
                },
              }))
            }
            className="h-9 text-xs"
          />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            Poids (kg)
          </span>
          <Input
            type="number"
            step="0.1"
            placeholder="70.0"
            value={editForm.constantes.poids}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, poids: e.target.value },
              }))
            }
            className="h-9 text-xs"
          />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">
            Taille (cm)
          </span>
          <Input
            type="number"
            step="0.5"
            placeholder="175"
            value={editForm.constantes.taille}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, taille: e.target.value },
              }))
            }
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  )
}
