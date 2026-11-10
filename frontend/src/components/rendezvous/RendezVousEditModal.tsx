"use client"

import { Edit, XCircle, AlertCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Patient, Medecin, RdvFormState } from "./types"

interface RendezVousEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  form: RdvFormState
  setForm: React.Dispatch<React.SetStateAction<RdvFormState>>
  formError: string | null
  patientsData: Patient[]
  medecinsData: Medecin[]
  isSelectedDoctorAbsentToday: boolean
}

export function RendezVousEditModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
  formError,
  patientsData,
  medecinsData,
  isSelectedDoctorAbsentToday,
}: RendezVousEditModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Edit className="size-5 text-primary" /> Modifier le rendez-vous
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Patient *</Label>
            <select
              required
              value={form.patient}
              onChange={(e) => setForm({ ...form, patient: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner un patient</option>
              {patientsData.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Médecin *</Label>
            <select
              required
              value={form.medecin}
              onChange={(e) => setForm({ ...form, medecin: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner un médecin</option>
              {medecinsData.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {m.nom} {m.prenom} - {m.specialite} [{m.absent_aujourdhui ? "Absent" : "Présent"}]
                </option>
              ))}
            </select>
            {isSelectedDoctorAbsentToday && (
              <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0" />
                Ce médecin est absent aujourd&apos;hui. Déplacement impossible à la date du jour.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Heure *</Label>
              <Input
                type="time"
                required
                value={form.heure}
                onChange={(e) => setForm({ ...form, heure: e.target.value })}
              />
            </div>
          </div>

          {form.type === "CONTROLE" && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <Label>Motif du suivi</Label>
              <Input
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder="Ex : Suivi post-traitement, évolution clinique..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || isSelectedDoctorAbsentToday}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isPending ? "Modification..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
