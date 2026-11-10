"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  RendezVous,
  ConsultationData,
  ConsultFormState,
  EditConsultFormState,
  ConsultationOrigineModalState,
  extractErrorMessage,
} from "./types"

interface UseRendezVousConsultationMutationsProps {
  selectedRdv: RendezVous | null
  setSelectedRdv: (rdv: RendezVous | null) => void
  setIsConsultOpen: (v: boolean) => void
  setIsConsultReadOnlyOpen: (v: boolean) => void
  consultForm: ConsultFormState
  setConsultForm: React.Dispatch<React.SetStateAction<ConsultFormState>>
  editConsultForm: EditConsultFormState
  setEditConsultForm: React.Dispatch<React.SetStateAction<EditConsultFormState>>
  existingConsultation: ConsultationData | null
  setExistingConsultation: (c: ConsultationData | null) => void
  setIsEditingConsultation: (v: boolean) => void
  setConsultationOrigineModal: React.Dispatch<React.SetStateAction<ConsultationOrigineModalState>>
  showNotification: (type: "success" | "error", message: string) => void
}

export function useRendezVousConsultationMutations({
  selectedRdv,
  setSelectedRdv,
  setIsConsultOpen,
  setIsConsultReadOnlyOpen,
  consultForm,
  setConsultForm,
  editConsultForm,
  setEditConsultForm,
  existingConsultation,
  setExistingConsultation,
  setIsEditingConsultation,
  setConsultationOrigineModal,
  showNotification,
}: UseRendezVousConsultationMutationsProps) {
  const queryClient = useQueryClient()

  const createConsultationMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        rendez_vous: selectedRdv?.id,
        patient: selectedRdv?.patient,
        motif: consultForm.motif,
        observations: consultForm.observations,
        diagnostic: consultForm.diagnostic,
        compte_rendu: consultForm.compte_rendu,
        date_controle_recommandee: consultForm.date_controle_recommandee || null,
      }
      const c = consultForm.constantes
      if (c.temperature || c.poids || c.taille || c.tension_arterielle || c.frequence_cardiaque) {
        payload.constantes = {
          temperature: c.temperature ? parseFloat(c.temperature) : null,
          poids: c.poids ? parseFloat(c.poids) : null,
          taille: c.taille ? parseFloat(c.taille) : null,
          tension_arterielle: c.tension_arterielle || null,
          frequence_cardiaque: c.frequence_cardiaque ? parseInt(c.frequence_cardiaque) : null,
        }
      }
      return apiClient.post("/consultations/", payload)
    },
    onSuccess: () => {
      setIsConsultOpen(false)
      setConsultForm({
        motif: "",
        observations: "",
        diagnostic: "",
        compte_rendu: "",
        date_controle_recommandee: "",
        constantes: { temperature: "", poids: "", taille: "", tension_arterielle: "", frequence_cardiaque: "" },
      })
      setSelectedRdv(null)
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["consultations"] })
      showNotification("success", "Consultation enregistrée avec succès. Rendez-vous passé à Terminé.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'enregistrement de la consultation.")
      showNotification("error", msg)
    },
  })

  const updateConsultationMutation = useMutation({
    mutationFn: async () => {
      if (!existingConsultation) return
      const payload: Record<string, unknown> = {
        motif: editConsultForm.motif,
        observations: editConsultForm.observations,
        diagnostic: editConsultForm.diagnostic,
        compte_rendu: editConsultForm.compte_rendu,
        date_controle_recommandee: editConsultForm.date_controle_recommandee || null,
        motif_correction: editConsultForm.motif_correction,
      }
      const c = editConsultForm.constantes
      if (c.temperature || c.poids || c.taille || c.tension_arterielle || c.frequence_cardiaque) {
        payload.constantes = {
          temperature: c.temperature ? parseFloat(c.temperature) : null,
          poids: c.poids ? parseFloat(c.poids) : null,
          taille: c.taille ? parseFloat(c.taille) : null,
          tension_arterielle: c.tension_arterielle || null,
          frequence_cardiaque: c.frequence_cardiaque ? parseInt(c.frequence_cardiaque) : null,
        }
      }
      return apiClient.patch<ConsultationData>(`/consultations/${existingConsultation.id}/`, payload)
    },
    onSuccess: (res) => {
      setIsEditingConsultation(false)
      if (res?.data) {
        setExistingConsultation(res.data)
      }
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["consultations"] })
      showNotification("success", "Consultation modifiée avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification de la consultation.")
      showNotification("error", msg)
    },
  })

  async function handleOpenConsultation(rdv: RendezVous) {
    setSelectedRdv(rdv)
    try {
      const { data } = await apiClient.get<{ results: ConsultationData[] }>(
        `/consultations/?rendez_vous=${rdv.id}`
      )
      if (data.results && data.results.length > 0) {
        const c = data.results[0]
        setExistingConsultation(c)
        setIsEditingConsultation(false)
        setEditConsultForm({
          motif: c.motif || "",
          observations: c.observations || "",
          diagnostic: c.diagnostic || "",
          compte_rendu: c.compte_rendu || "",
          date_controle_recommandee: c.date_controle_recommandee || "",
          motif_correction: "",
          constantes: {
            temperature: c.constantes?.temperature?.toString() || "",
            poids: c.constantes?.poids?.toString() || "",
            taille: c.constantes?.taille?.toString() || "",
            tension_arterielle: c.constantes?.tension_arterielle || "",
            frequence_cardiaque: c.constantes?.frequence_cardiaque?.toString() || "",
          },
        })
        setIsConsultReadOnlyOpen(true)
      } else {
        setConsultForm({
          motif: rdv.motif || "",
          observations: "",
          diagnostic: "",
          compte_rendu: "",
          date_controle_recommandee: "",
          constantes: { temperature: "", poids: "", taille: "", tension_arterielle: "", frequence_cardiaque: "" },
        })
        setIsConsultOpen(true)
      }
    } catch {
      setConsultForm({
        motif: rdv.motif || "",
        observations: "",
        diagnostic: "",
        compte_rendu: "",
        date_controle_recommandee: "",
        constantes: { temperature: "", poids: "", taille: "", tension_arterielle: "", frequence_cardiaque: "" },
      })
      setIsConsultOpen(true)
    }
  }

  async function handleOpenConsultationOrigine(consultationId: number) {
    setConsultationOrigineModal({ isOpen: true, consultation: null, ordonnances: [], loading: true })
    try {
      const [resC, resO] = await Promise.all([
        apiClient.get<ConsultationData>(`/consultations/${consultationId}/`),
        apiClient.get<{ results: Array<{ id: number; numero?: string; medicaments: string; posologie: string; duree: string; date_creation: string }> }>(
          `/prescriptions/?consultation=${consultationId}`
        ),
      ])
      setConsultationOrigineModal({
        isOpen: true,
        consultation: resC.data,
        ordonnances: resO.data.results || [],
        loading: false,
      })
    } catch {
      setConsultationOrigineModal({ isOpen: true, consultation: null, ordonnances: [], loading: false })
      showNotification("error", "Impossible de charger la consultation d'origine.")
    }
  }

  return {
    createConsultationMutation,
    updateConsultationMutation,
    handleOpenConsultation,
    handleOpenConsultationOrigine,
  }
}
