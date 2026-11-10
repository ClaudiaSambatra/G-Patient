"use client"

import { History, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConsultationData, EditConsultFormState, computeBMI } from "./types"

interface RendezVousConsultationEditFormProps {
  existingConsultation: ConsultationData
  editConsultForm: EditConsultFormState
  setEditConsultForm: React.Dispatch<React.SetStateAction<EditConsultFormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
}

export function RendezVousConsultationEditForm({
  existingConsultation,
  editConsultForm,
  setEditConsultForm,
  onSubmit,
  onCancel,
  isPending,
}: RendezVousConsultationEditFormProps) {
  const bmi = computeBMI(editConsultForm.constantes.poids, editConsultForm.constantes.taille)

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4 text-sm">
      <div className="rounded-xl bg-muted/40 p-3 border border-border/60">
        <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Patient</span>
        <span className="font-bold text-foreground">
          {existingConsultation.patient_nom} {existingConsultation.patient_prenom}
        </span>
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
        <Label htmlFor="edit-motif-correction" className="text-amber-900 dark:text-amber-300 font-bold flex items-center gap-1.5">
          <History className="size-4" /> Motif obligatoire de la modification *
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Une justification obligatoire est requise pour conserver la traçabilité de cette modification dans le dossier médical.
        </p>
        <Input
          id="edit-motif-correction"
          required
          value={editConsultForm.motif_correction}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, motif_correction: e.target.value }))}
          placeholder="Ex: Précision diagnostique après bilan radiologique..."
          className="bg-background"
        />
      </div>

      <div>
        <Label htmlFor="edit-motif">Motif *</Label>
        <Input
          id="edit-motif"
          value={editConsultForm.motif}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, motif: e.target.value }))}
          required
          className="mt-1"
        />
      </div>

      <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-3.5 text-primary" /> Constantes physiologiques
          </Label>
          {bmi && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bmi.color}`}>
              IMC : {bmi.val} kg/m² — {bmi.label}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">Temp. (°C)</span>
            <Input
              type="number"
              step="0.1"
              placeholder="37.0"
              value={editConsultForm.constantes.temperature}
              onChange={(e) => setEditConsultForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, temperature: e.target.value },
              }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">Tension</span>
            <Input
              placeholder="120/80"
              value={editConsultForm.constantes.tension_arterielle}
              onChange={(e) => setEditConsultForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, tension_arterielle: e.target.value },
              }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">Pouls</span>
            <Input
              type="number"
              placeholder="72"
              value={editConsultForm.constantes.frequence_cardiaque}
              onChange={(e) => setEditConsultForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, frequence_cardiaque: e.target.value },
              }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">Poids</span>
            <Input
              type="number"
              step="0.1"
              placeholder="70"
              value={editConsultForm.constantes.poids}
              onChange={(e) => setEditConsultForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, poids: e.target.value },
              }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">Taille</span>
            <Input
              type="number"
              step="0.5"
              placeholder="175"
              value={editConsultForm.constantes.taille}
              onChange={(e) => setEditConsultForm((prev) => ({
                ...prev,
                constantes: { ...prev.constantes, taille: e.target.value },
              }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="edit-observations">Observations cliniques</Label>
        <textarea
          id="edit-observations"
          value={editConsultForm.observations}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, observations: e.target.value }))}
          rows={3}
          className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <Label htmlFor="edit-diagnostic">Diagnostic *</Label>
        <textarea
          id="edit-diagnostic"
          value={editConsultForm.diagnostic}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, diagnostic: e.target.value }))}
          rows={3}
          required
          className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
        />
      </div>

      <div>
        <Label htmlFor="edit-compte-rendu">Compte rendu médical</Label>
        <textarea
          id="edit-compte-rendu"
          value={editConsultForm.compte_rendu}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, compte_rendu: e.target.value }))}
          rows={3}
          className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <Label htmlFor="edit-date-controle">Date de suivi recommandée</Label>
        <Input
          id="edit-date-controle"
          type="date"
          value={editConsultForm.date_controle_recommandee}
          onChange={(e) => setEditConsultForm((prev) => ({ ...prev, date_controle_recommandee: e.target.value }))}
          className="mt-1 max-w-xs"
        />
      </div>

      <div className="flex justify-end gap-3 pt-5 border-t border-border/60 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}
