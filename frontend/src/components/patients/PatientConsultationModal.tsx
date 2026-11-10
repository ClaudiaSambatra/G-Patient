import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Stethoscope, XCircle } from "lucide-react"
import { Patient } from "./types"

interface PatientConsultationModalProps {
  isOpen: boolean
  patient: Patient | null
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  form: {
    motif: string
    observations: string
    diagnostic: string
  }
  setForm: React.Dispatch<
    React.SetStateAction<{
      motif: string
      observations: string
      diagnostic: string
    }>
  >
}

export function PatientConsultationModal({
  isOpen,
  patient,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
}: PatientConsultationModalProps) {
  if (!isOpen || !patient) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" /> Nouvelle consultation
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="mt-6 flex flex-col gap-5"
        >
          <div className="space-y-1">
            <Label>Patient</Label>
            <Input disabled value={`${patient.nom} ${patient.prenom}`} className="bg-muted/50" />
          </div>

          <div className="space-y-1">
            <Label>Motif de la consultation *</Label>
            <Input
              required
              placeholder="Ex: Fièvre, Douleurs abdominales..."
              value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Observations</Label>
            <Textarea
              className="min-h-[100px]"
              placeholder="Tension: 12/8, Température: 38°C..."
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Diagnostic</Label>
            <Textarea
              className="min-h-[80px]"
              placeholder="Ex: Angine bactérienne"
              value={form.diagnostic}
              onChange={(e) => setForm({ ...form, diagnostic: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
