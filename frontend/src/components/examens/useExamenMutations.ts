import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  DemandeExamen,
  LigneDemandeExamen,
  extractErrorMessage,
  DEFAULT_LIGNE_EXAMEN,
} from "./types"
import { EditModalState } from "./ExamenEditModal"

interface UseExamenMutationsProps {
  setIsCreateOpen: (v: boolean) => void
  editModal: EditModalState
  setEditModal: React.Dispatch<React.SetStateAction<EditModalState>>
  cancelModal: {
    isOpen: boolean
    demande: DemandeExamen | null
    motif: string
  }
  setCancelModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean
      demande: DemandeExamen | null
      motif: string
    }>
  >
  previewDemande: DemandeExamen | null
  setPreviewDemande: (d: DemandeExamen | null) => void
  showNotification: (type: "success" | "error", message: string) => void
}

export function useExamenMutations({
  setIsCreateOpen,
  editModal,
  setEditModal,
  cancelModal,
  setCancelModal,
  previewDemande,
  setPreviewDemande,
  showNotification,
}: UseExamenMutationsProps) {
  const queryClient = useQueryClient()

  const [formConsultation, setFormConsultation] = useState("")
  const [formRenseignements, setFormRenseignements] = useState("")
  const [formLignes, setFormLignes] = useState<LigneDemandeExamen[]>([
    { ...DEFAULT_LIGNE_EXAMEN },
  ])

  const addLine = () =>
    setFormLignes((prev) => [...prev, { ...DEFAULT_LIGNE_EXAMEN }])

  const updateLine = (
    index: number,
    field: keyof LigneDemandeExamen,
    value: string
  ) => {
    setFormLignes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeLine = (index: number) => {
    if (formLignes.length <= 1) return
    setFormLignes((prev) => prev.filter((_, i) => i !== index))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formConsultation) {
        throw new Error("Veuillez sélectionner une consultation.")
      }
      const validLignes = formLignes
        .filter((l) => l.nom_examen.trim().length > 0)
        .map((l, index) => ({
          nom_examen: l.nom_examen.trim(),
          categorie: l.categorie,
          instructions: l.instructions?.trim() || "",
          ordre: index + 1,
        }))

      if (validLignes.length === 0) {
        throw new Error("Veuillez spécifier au moins un examen médical.")
      }

      const payload = {
        consultation: parseInt(formConsultation, 10),
        renseignements_cliniques: formRenseignements.trim(),
        lignes: validLignes,
      }

      const { data } = await apiClient.post("/examinations/", payload)
      return data
    },
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setIsCreateOpen(false)
      setFormConsultation("")
      setFormRenseignements("")
      setFormLignes([{ ...DEFAULT_LIGNE_EXAMEN }])
      showNotification(
        "success",
        `Demande d'examens ${newExam.numero} créée avec succès.`
      )
    },
    onError: (err) => {
      const msg = extractErrorMessage(
        err,
        "Erreur lors de la création de la demande."
      )
      showNotification("error", msg)
    },
  })

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editModal.demande) return
      const motif = editModal.motif_correction.trim()
      if (!motif) {
        throw new Error("Le motif de correction est obligatoire.")
      }

      const validLignes = editModal.lignes
        .filter((l) => l.nom_examen.trim().length > 0)
        .map((l, index) => ({
          nom_examen: l.nom_examen.trim(),
          categorie: l.categorie,
          instructions: l.instructions?.trim() || "",
          ordre: index + 1,
        }))

      if (validLignes.length === 0) {
        throw new Error("La demande doit comporter au moins un examen.")
      }

      const payload = {
        motif_correction: motif,
        renseignements_cliniques: editModal.renseignements_cliniques.trim(),
        lignes: validLignes,
      }

      const { data } = await apiClient.put(
        `/examinations/${editModal.demande.id}/`,
        payload
      )
      return data
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setEditModal({
        isOpen: false,
        demande: null,
        motif_correction: "",
        renseignements_cliniques: "",
        lignes: [],
      })
      if (previewDemande?.id === updated.id) {
        setPreviewDemande(updated)
      }
      showNotification(
        "success",
        `Demande ${updated.numero} modifiée avec succès.`
      )
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la mise à jour.")
      showNotification("error", msg)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelModal.demande) return
      const motif = cancelModal.motif.trim()
      if (!motif) {
        throw new Error("Le motif d'annulation est obligatoire.")
      }
      const { data } = await apiClient.post(
        `/examinations/${cancelModal.demande.id}/annuler/`,
        { motif }
      )
      return data
    },
    onSuccess: (cancelled) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setCancelModal({ isOpen: false, demande: null, motif: "" })
      if (previewDemande?.id === cancelled.id) {
        setPreviewDemande(cancelled)
      }
      showNotification(
        "success",
        `Demande d'examens ${cancelled.numero} annulée avec succès.`
      )
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'annulation.")
      showNotification("error", msg)
    },
  })

  return {
    formConsultation,
    setFormConsultation,
    formRenseignements,
    setFormRenseignements,
    formLignes,
    setFormLignes,
    addLine,
    updateLine,
    removeLine,
    createMutation,
    editMutation,
    cancelMutation,
  }
}
