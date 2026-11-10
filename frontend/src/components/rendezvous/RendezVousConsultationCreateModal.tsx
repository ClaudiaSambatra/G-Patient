"use client"

import { FileText, XCircle, AlertTriangle, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RendezVous, ConsultFormState, computeBMI } from "./types"

interface RendezVousConsultationCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  selectedRdv: RendezVous | null
  consultForm: ConsultFormState
  setConsultForm: React.Dispatch<React.SetStateAction<ConsultFormState>>
  todayStr: string
}

export function RendezVousConsultationCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  selectedRdv,
  consultForm,
  setConsultForm,
  todayStr,
}: RendezVousConsultationCreateModalProps) {
  if (!isOpen) return null

  const bmi = computeBMI(consultForm.constantes.poids, consultForm.constantes.taille)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" /> Rédiger la consultation
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Patient : <strong className="text-foreground">{selectedRdv?.patient_nom}</strong> — RDV du{" "}
              {selectedRdv && new Date(selectedRdv.date_heure).toLocaleString("fr-FR")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
              <AlertTriangle className="size-4 shrink-0" />
              Dossier patient — Données médicales clés
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                <span className="font-semibold text-rose-700 dark:text-rose-400 block mb-0.5">
                  ⚠️ Allergies connues :
                </span>
                <span className="text-foreground">
                  {selectedRdv?.patient_allergies || (
                    <span className="italic text-muted-foreground">Aucune allergie signalée</span>
                  )}
                </span>
              </div>
              <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                <span className="font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">
                  📋 Antécédents médicaux :
                </span>
                <span className="text-foreground">
                  {selectedRdv?.patient_antecedents || (
                    <span className="italic text-muted-foreground">Aucun antécédent répertorié</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Motif de consultation *</Label>
            <Input
              required
              value={consultForm.motif}
              onChange={(e) => setConsultForm({ ...consultForm, motif: e.target.value })}
              placeholder="Ex: Douleurs abdominales, fièvre..."
            />
          </div>

          <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" /> Constantes physiologiques
              </Label>
              {bmi && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bmi.color}`}
                >
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
                  value={consultForm.constantes.temperature}
                  onChange={(e) =>
                    setConsultForm({
                      ...consultForm,
                      constantes: { ...consultForm.constantes, temperature: e.target.value },
                    })
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">Tension</span>
                <Input
                  placeholder="120/80"
                  value={consultForm.constantes.tension_arterielle}
                  onChange={(e) =>
                    setConsultForm({
                      ...consultForm,
                      constantes: { ...consultForm.constantes, tension_arterielle: e.target.value },
                    })
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">Pouls (bpm)</span>
                <Input
                  type="number"
                  placeholder="72"
                  value={consultForm.constantes.frequence_cardiaque}
                  onChange={(e) =>
                    setConsultForm({
                      ...consultForm,
                      constantes: { ...consultForm.constantes, frequence_cardiaque: e.target.value },
                    })
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">Poids (kg)</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={consultForm.constantes.poids}
                  onChange={(e) =>
                    setConsultForm({
                      ...consultForm,
                      constantes: { ...consultForm.constantes, poids: e.target.value },
                    })
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">Taille (cm)</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="175"
                  value={consultForm.constantes.taille}
                  onChange={(e) =>
                    setConsultForm({
                      ...consultForm,
                      constantes: { ...consultForm.constantes, taille: e.target.value },
                    })
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observations cliniques</Label>
            <textarea
              value={consultForm.observations}
              onChange={(e) => setConsultForm({ ...consultForm, observations: e.target.value })}
              placeholder="Auscultation, examen clinique..."
              className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <Label>Diagnostic *</Label>
            <textarea
              required
              value={consultForm.diagnostic}
              onChange={(e) => setConsultForm({ ...consultForm, diagnostic: e.target.value })}
              placeholder="Hypothèse ou conclusion diagnostique..."
              className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <Label>Compte rendu médical</Label>
            <textarea
              value={consultForm.compte_rendu}
              onChange={(e) => setConsultForm({ ...consultForm, compte_rendu: e.target.value })}
              placeholder="Compte rendu détaillé, protocole..."
              className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <Label>Date de suivi recommandée</Label>
            <Input
              type="date"
              min={todayStr}
              value={consultForm.date_controle_recommandee}
              onChange={(e) =>
                setConsultForm({ ...consultForm, date_controle_recommandee: e.target.value })
              }
              className="max-w-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Date indicative pour le suivi. Ne crée pas de rendez-vous et ne bloque aucun créneau.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isPending ? "Enregistrement..." : "Valider et Terminer le RDV"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
