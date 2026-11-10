"use client"

import Link from "next/link"
import { Eye, XCircle, AlertTriangle, Activity, Calendar as CalendarIcon, History, FileSignature, FlaskConical, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrentUser } from "@/components/sidebar"
import { ConsultationData, EditConsultFormState } from "./types"
import { RendezVousConsultationEditForm } from "./RendezVousConsultationEditForm"
import { RendezVousConsultationPrescriptionsBlock } from "./RendezVousConsultationPrescriptionsBlock"

interface RendezVousConsultationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: CurrentUser
  existingConsultation: ConsultationData | null
  isEditingConsultation: boolean
  setIsEditingConsultation: (v: boolean) => void
  editConsultForm: EditConsultFormState
  setEditConsultForm: React.Dispatch<React.SetStateAction<EditConsultFormState>>
  onUpdateConsultation: (e: React.FormEvent) => void
  isUpdatePending: boolean
}

export function RendezVousConsultationDetailModal({
  isOpen,
  onClose,
  currentUser,
  existingConsultation,
  isEditingConsultation,
  setIsEditingConsultation,
  editConsultForm,
  setEditConsultForm,
  onUpdateConsultation,
  isUpdatePending,
}: RendezVousConsultationDetailModalProps) {
  if (!isOpen || !existingConsultation) return null

  const canEdit =
    currentUser?.role === "ADMIN" ||
    (currentUser?.role === "MEDECIN" && existingConsultation.medecin === currentUser?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Eye className="size-5 text-emerald-600" />
              {isEditingConsultation ? "Modifier la consultation" : "Consultation médicale"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultation du {new Date(existingConsultation.date_consultation).toLocaleString("fr-FR")} —{" "}
              {existingConsultation.medecin_nom}
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

        {isEditingConsultation ? (
          <RendezVousConsultationEditForm
            existingConsultation={existingConsultation}
            editConsultForm={editConsultForm}
            setEditConsultForm={setEditConsultForm}
            onSubmit={onUpdateConsultation}
            onCancel={() => setIsEditingConsultation(false)}
            isPending={isUpdatePending}
          />
        ) : (
          <>
            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl bg-muted/40 p-3 border border-border/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Patient</span>
                <span className="font-bold text-foreground">
                  {existingConsultation.patient_nom} {existingConsultation.patient_prenom}
                </span>
              </div>

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
                      {existingConsultation.patient_allergies || (
                        <span className="italic text-muted-foreground">Aucune allergie signalée</span>
                      )}
                    </span>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                    <span className="font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">
                      📋 Antécédents médicaux :
                    </span>
                    <span className="text-foreground">
                      {existingConsultation.patient_antecedents || (
                        <span className="italic text-muted-foreground">Aucun antécédent répertorié</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {existingConsultation.constantes && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Activity className="size-3.5 text-primary" /> Constantes physiologiques
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                      <span className="text-muted-foreground block text-[10px]">Température</span>
                      <span className="font-bold text-foreground text-sm">
                        {existingConsultation.constantes.temperature ? `${existingConsultation.constantes.temperature} °C` : "—"}
                      </span>
                    </div>
                    <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                      <span className="text-muted-foreground block text-[10px]">Tension</span>
                      <span className="font-bold text-foreground text-sm">
                        {existingConsultation.constantes.tension_arterielle || "—"}
                      </span>
                    </div>
                    <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                      <span className="text-muted-foreground block text-[10px]">Pouls</span>
                      <span className="font-bold text-foreground text-sm">
                        {existingConsultation.constantes.frequence_cardiaque ? `${existingConsultation.constantes.frequence_cardiaque} bpm` : "—"}
                      </span>
                    </div>
                    <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                      <span className="text-muted-foreground block text-[10px]">Poids</span>
                      <span className="font-bold text-foreground text-sm">
                        {existingConsultation.constantes.poids ? `${existingConsultation.constantes.poids} kg` : "—"}
                      </span>
                    </div>
                    <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                      <span className="text-muted-foreground block text-[10px]">Taille</span>
                      <span className="font-bold text-foreground text-sm">
                        {existingConsultation.constantes.taille ? `${existingConsultation.constantes.taille} cm` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {existingConsultation.date_controle_recommandee && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                  <CalendarIcon className="size-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Date de suivi recommandée :</span>
                    <span>{new Date(existingConsultation.date_controle_recommandee).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Motif</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-medium">
                  {existingConsultation.motif}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Observations cliniques</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                  {existingConsultation.observations || <span className="italic text-muted-foreground">Aucune observation renseignée</span>}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Diagnostic</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-semibold whitespace-pre-wrap">
                  {existingConsultation.diagnostic || <span className="italic text-muted-foreground font-normal">Non renseigné</span>}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Compte rendu médical</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                  {existingConsultation.compte_rendu || <span className="italic text-muted-foreground">Aucun compte rendu rédigé</span>}
                </div>
              </div>

              <RendezVousConsultationPrescriptionsBlock existingConsultation={existingConsultation} />

              {existingConsultation.historique && existingConsultation.historique.length > 0 && (
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="size-4 text-amber-600" />
                    Historique des corrections &amp; Audit ({existingConsultation.historique.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingConsultation.historique.map((h) => (
                      <div key={h.id} className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Modifié par {h.auteur_nom}</span>
                          <span>{new Date(h.date_modification).toLocaleString("fr-FR")}</span>
                        </div>
                        <div className="text-foreground">
                          <span className="font-medium text-amber-700 dark:text-amber-400">Motif :</span> {h.motif_correction}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Champs modifiés : {h.champs_modifies.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/60 mt-6">
              <div className="flex items-center gap-3">
                <Link href="/ordonnances" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold">
                  <FileSignature className="size-4" /> Registre des ordonnances →
                </Link>
                <Link href="/examens" className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold">
                  <FlaskConical className="size-4" /> Registre des examens →
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditConsultForm({
                        motif: existingConsultation.motif || "",
                        observations: existingConsultation.observations || "",
                        diagnostic: existingConsultation.diagnostic || "",
                        compte_rendu: existingConsultation.compte_rendu || "",
                        date_controle_recommandee: existingConsultation.date_controle_recommandee || "",
                        motif_correction: "",
                        constantes: {
                          temperature: existingConsultation.constantes?.temperature?.toString() || "",
                          poids: existingConsultation.constantes?.poids?.toString() || "",
                          taille: existingConsultation.constantes?.taille?.toString() || "",
                          tension_arterielle: existingConsultation.constantes?.tension_arterielle || "",
                          frequence_cardiaque: existingConsultation.constantes?.frequence_cardiaque?.toString() || "",
                        },
                      })
                      setIsEditingConsultation(true)
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Edit className="size-4" /> Modifier
                  </Button>
                )}
                <Button type="button" onClick={onClose} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Fermer
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
