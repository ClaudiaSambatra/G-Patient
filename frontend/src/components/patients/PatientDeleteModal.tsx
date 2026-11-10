import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Patient } from "./types"

interface PatientDeleteModalProps {
  patient: Patient | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function PatientDeleteModal({
  patient,
  onClose,
  onConfirm,
  isPending,
}: PatientDeleteModalProps) {
  if (!patient) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-destructive bg-card p-6 shadow-2xl text-center">
        <Trash2 className="mx-auto size-12 text-destructive/80 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Confirmer la suppression</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Êtes-vous sûr de vouloir supprimer définitivement le dossier de{" "}
          <strong className="text-foreground">
            {patient.nom} {patient.prenom}
          </strong>{" "}
          ? Cette action est irréversible.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Suppression..." : "Oui, supprimer"}
          </Button>
        </div>
      </div>
    </div>
  )
}
