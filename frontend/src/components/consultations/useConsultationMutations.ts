import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  Consultation,
  EditConsultationFormState,
  extractErrorMessage,
} from "./types"
import { FactureMedModalState } from "./FactureMedicamentsModal"

interface UseConsultationMutationsProps {
  selectedConsultation: Consultation | null
  setSelectedConsultation: (c: Consultation | null) => void
  setIsEditing: (v: boolean) => void
  editForm: EditConsultationFormState
  factureMedModal: FactureMedModalState | null
  setFactureMedModal: (v: FactureMedModalState | null) => void
  showNotification: (type: "success" | "error", message: string) => void
}

export function useConsultationMutations({
  selectedConsultation,
  setSelectedConsultation,
  setIsEditing,
  editForm,
  factureMedModal,
  setFactureMedModal,
  showNotification,
}: UseConsultationMutationsProps) {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultation) return
      const payload: Record<string, any> = {
        motif: editForm.motif,
        observations: editForm.observations,
        diagnostic: editForm.diagnostic,
        compte_rendu: editForm.compte_rendu,
        suivi_recommande: editForm.suivi_recommande,
        date_suivi_recommandee: editForm.date_suivi_recommandee || null,
        motif_suivi: editForm.motif_suivi || "",
        date_controle_recommandee:
          editForm.date_suivi_recommandee ||
          editForm.date_controle_recommandee ||
          null,
        motif_correction: editForm.motif_correction,
      }
      const c = editForm.constantes
      if (
        c.temperature ||
        c.poids ||
        c.taille ||
        c.tension_arterielle ||
        c.frequence_cardiaque
      ) {
        payload.constantes = {
          temperature: c.temperature ? parseFloat(c.temperature) : null,
          poids: c.poids ? parseFloat(c.poids) : null,
          taille: c.taille ? parseFloat(c.taille) : null,
          tension_arterielle: c.tension_arterielle || null,
          frequence_cardiaque: c.frequence_cardiaque
            ? parseInt(c.frequence_cardiaque)
            : null,
        }
      }
      return apiClient.patch<Consultation>(
        `/consultations/${selectedConsultation.id}/`,
        payload
      )
    },
    onSuccess: (res) => {
      setIsEditing(false)
      if (res?.data) {
        setSelectedConsultation(res.data)
      }
      queryClient.invalidateQueries({ queryKey: ["consultations"] })
      showNotification("success", "Consultation mise à jour avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(
        err,
        "Erreur lors de la modification de la consultation."
      )
      showNotification("error", msg)
    },
  })

  const createFactureMedicamentsMutation = useMutation({
    mutationFn: async () => {
      if (!factureMedModal) return
      return apiClient.post("/billing/", {
        ordonnance: factureMedModal.ordonnanceId,
        patient: factureMedModal.patientId,
        type: "MEDICAMENTS",
        designation: factureMedModal.designation,
        actes: factureMedModal.designation,
        montant: Number(factureMedModal.montant),
      })
    },
    onSuccess: () => {
      setFactureMedModal(null)
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["consultation-prescriptions"] })
      showNotification("success", "Facture des médicaments créée avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(
        err,
        "Erreur lors de la création de la facture des médicaments."
      )
      showNotification("error", msg)
    },
  })

  return {
    updateMutation,
    createFactureMedicamentsMutation,
  }
}
