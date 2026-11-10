"use client"

import { Calendar as CalendarIcon, XCircle, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Patient, Medecin, RdvFormState } from "./types"

interface RendezVousCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  form: RdvFormState
  setForm: React.Dispatch<React.SetStateAction<RdvFormState>>
  formError: string | null
  patientsData: Patient[]
  medecinsData: Medecin[]
  selectedMedecinInForm?: Medecin
  isSelectedDoctorAbsentToday: boolean
  isControleEligible: boolean
}

export function RendezVousCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
  formError,
  patientsData,
  medecinsData,
  selectedMedecinInForm,
  isSelectedDoctorAbsentToday,
  isControleEligible,
}: RendezVousCreateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" /> Planifier un nouveau rendez-vous
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
            <div className="flex items-center justify-between">
              <Label>Médecin *</Label>
              {selectedMedecinInForm && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    selectedMedecinInForm.absent_aujourdhui
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  }`}
                >
                  {selectedMedecinInForm.absent_aujourdhui ? "Absent aujourd'hui" : "Présent"}
                </span>
              )}
            </div>
            <select
              required
              value={form.medecin}
              onChange={(e) => setForm({ ...form, medecin: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner un médecin</option>
              {medecinsData.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {m.nom} {m.prenom} - {m.specialite} [
                  {m.absent_aujourdhui ? "Absent aujourd'hui" : "Présent"}]
                </option>
              ))}
            </select>

            {isSelectedDoctorAbsentToday && (
              <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0" />
                Ce médecin est absent aujourd&apos;hui. Veuillez sélectionner une autre date ou un autre médecin.
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

          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type de visite *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                  form.type === "CONSULTATION"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="rdv_type_create"
                  value="CONSULTATION"
                  checked={form.type === "CONSULTATION"}
                  onChange={() => setForm({ ...form, type: "CONSULTATION", motif: "" })}
                  className="accent-primary"
                />
                <span className="font-bold">Consultation</span>
              </label>

              <label
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                  !isControleEligible
                    ? "opacity-50 cursor-not-allowed border-dashed bg-muted/30"
                    : form.type === "CONTROLE"
                    ? "border-purple-600 bg-purple-50 text-purple-700 font-bold shadow-xs dark:bg-purple-950/40 dark:text-purple-300"
                    : "border-border bg-card hover:bg-muted/50 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name="rdv_type_create"
                  value="CONTROLE"
                  disabled={!isControleEligible}
                  checked={form.type === "CONTROLE"}
                  onChange={() => setForm({ ...form, type: "CONTROLE" })}
                  className="accent-purple-600"
                />
                <span className="font-bold">Suivi</span>
              </label>
            </div>

            {!isControleEligible && form.patient && form.date && (
              <p className="text-[11px] text-muted-foreground italic">
                Option Suivi grisée : aucune consultation payante de ce patient dans les 15 derniers jours.
              </p>
            )}
            {isControleEligible && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                Patient éligible au suivi gratuit.
              </p>
            )}
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
              {isPending ? "Enregistrement..." : "Confirmer le rendez-vous"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
