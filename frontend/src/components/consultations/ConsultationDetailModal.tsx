import { Button } from "@/components/ui/button"
import { CurrentUser } from "@/components/sidebar"
import {
  XCircle,
  CheckCircle2,
  Stethoscope,
  Calendar,
  Edit,
} from "lucide-react"
import {
  Consultation,
  EditConsultationFormState,
  computeAge,
  getInitials,
} from "./types"
import { ConsultationEditForm } from "./ConsultationEditForm"
import { ConsultationVitalsSection } from "./ConsultationVitalsSection"
import { ConsultationOrdonnancesBlock } from "./ConsultationOrdonnancesBlock"
import { ConsultationExamensBlock } from "./ConsultationExamensBlock"
import { ConsultationAuditSection } from "./ConsultationAuditSection"

interface ConsultationDetailModalProps {
  consultation: Consultation | null
  currentUser?: CurrentUser
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  editForm: EditConsultationFormState
  setEditForm: React.Dispatch<React.SetStateAction<EditConsultationFormState>>
  onClose: () => void
  onUpdateSubmit: (e: React.FormEvent) => void
  isUpdatePending: boolean
  currentPrescriptions: any[]
  currentExamens: any[]
  onPrintPrescription: (ord: any) => void
  onPrintExam: (exam: any) => void
  onOpenFactureMedModal: (ord: any) => void
  onStartEditing: () => void
}

export function ConsultationDetailModal({
  consultation,
  currentUser,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  onClose,
  onUpdateSubmit,
  isUpdatePending,
  currentPrescriptions,
  currentExamens,
  onPrintPrescription,
  onPrintExam,
  onOpenFactureMedModal,
  onStartEditing,
}: ConsultationDetailModalProps) {
  if (!consultation) return null

  const isAuthor =
    currentUser?.role === "ADMIN" ||
    currentUser?.is_superuser ||
    (currentUser?.role === "MEDECIN" && consultation.medecin === currentUser?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Entête du Dossier Médical */}
        <div className="flex items-start justify-between border-b border-border/60 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-13 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg ring-2 ring-primary/20">
              {getInitials(consultation.patient_nom, consultation.patient_prenom)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-foreground">
                  {consultation.patient_nom} {consultation.patient_prenom}
                </h3>
                {consultation.statut_paiement === "PAYE" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" /> Payé
                  </span>
                )}
                {consultation.statut_paiement === "IMPAYE" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                    Impayé
                  </span>
                )}
                {(!consultation.statut_paiement ||
                  consultation.statut_paiement === "GRATUIT") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                    Suivi gratuit
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Stethoscope className="size-3.5 text-primary" />
                  {consultation.medecin_nom}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-primary" />
                  {new Date(consultation.date_consultation).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {consultation.patient_date_naissance && (
                  <>
                    <span>•</span>
                    <span>
                      {computeAge(consultation.patient_date_naissance)} ans • Né le{" "}
                      {new Date(
                        consultation.patient_date_naissance
                      ).toLocaleDateString("fr-FR")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        {isEditing ? (
          <ConsultationEditForm
            editForm={editForm}
            setEditForm={setEditForm}
            onSubmit={onUpdateSubmit}
            onCancel={() => setIsEditing(false)}
            isPending={isUpdatePending}
          />
        ) : (
          <div className="mt-6 space-y-6 text-sm">
            <ConsultationVitalsSection consultation={consultation} />

            <ConsultationOrdonnancesBlock
              currentPrescriptions={currentPrescriptions}
              currentUser={currentUser}
              onPrintPrescription={onPrintPrescription}
              onOpenFactureMedModal={onOpenFactureMedModal}
            />

            <ConsultationExamensBlock
              currentExamens={currentExamens}
              onPrintExam={onPrintExam}
            />

            <ConsultationAuditSection historique={consultation.historique} />

            {/* Actions de fermeture et d'édition */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/60">
              <div>
                {isAuthor && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onStartEditing}
                    className="flex items-center gap-1.5 rounded-xl text-xs font-semibold"
                  >
                    <Edit className="size-3.5" /> Modifier cette consultation
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold px-4"
                >
                  Fermer le dossier
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
