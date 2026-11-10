import { useState } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Patient } from "./types"

export function usePatientMutations(
  showNotification: (type: "success" | "error", message: string) => void
) {
  const queryClient = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    sexe: "M",
    date_naissance: "",
    contact: "",
    adresse: "",
    antecedents: "",
    allergies: "",
    groupe_sanguin: "",
  })

  const [editForm, setEditForm] = useState({
    nom: "",
    prenom: "",
    sexe: "M",
    date_naissance: "",
    contact: "",
    adresse: "",
    antecedents: "",
    allergies: "",
    groupe_sanguin: "",
  })

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [consultationForm, setConsultationForm] = useState({
    motif: "",
    observations: "",
    diagnostic: "",
  })

  const createPatient = useMutation({
    mutationFn: async () => apiClient.post("/patients/", form),
    onSuccess: () => {
      setForm({
        nom: "",
        prenom: "",
        sexe: "M",
        date_naissance: "",
        contact: "",
        adresse: "",
        antecedents: "",
        allergies: "",
        groupe_sanguin: "",
      })
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Dossier patient créé avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la création du dossier patient.")
    },
  })

  const updatePatient = useMutation({
    mutationFn: async () => {
      if (!editingPatient) return
      return apiClient.patch(`/patients/${editingPatient.id}/`, editForm)
    },
    onSuccess: () => {
      setEditingPatient(null)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Le dossier a été mis à jour avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la mise à jour du dossier.")
    },
  })

  const deletePatient = useMutation({
    mutationFn: async () => {
      if (!deletingPatient) return
      return apiClient.delete(`/patients/${deletingPatient.id}/`)
    },
    onSuccess: () => {
      setDeletingPatient(null)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Le dossier a été supprimé.")
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showNotification("error", "Vous n'avez pas les droits d'administrateur pour supprimer ce dossier.")
      } else {
        showNotification("error", "Impossible de supprimer ce dossier.")
      }
      setDeletingPatient(null)
    },
  })

  const createConsultation = useMutation({
    mutationFn: async () => {
      if (!viewingPatient) return
      return apiClient.post("/consultations/", {
        ...consultationForm,
        patient: viewingPatient.id,
      })
    },
    onSuccess: () => {
      setConsultationForm({ motif: "", observations: "", diagnostic: "" })
      setIsConsultationModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ["consultations", viewingPatient?.id] })
      showNotification("success", "Consultation enregistrée avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de l'enregistrement de la consultation.")
    },
  })

  const handleEditInit = (p: Patient) => {
    setEditingPatient(p)
    setEditForm({
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe || "M",
      date_naissance: p.date_naissance,
      contact: p.contact,
      adresse: p.adresse || "",
      antecedents: p.antecedents || "",
      allergies: p.allergies || "",
      groupe_sanguin: p.groupe_sanguin || "",
    })
  }

  return {
    isCreateOpen,
    setIsCreateOpen,
    viewingPatient,
    setViewingPatient,
    editingPatient,
    setEditingPatient,
    deletingPatient,
    setDeletingPatient,
    form,
    setForm,
    editForm,
    setEditForm,
    isConsultationModalOpen,
    setIsConsultationModalOpen,
    consultationForm,
    setConsultationForm,
    createPatient,
    updatePatient,
    deletePatient,
    createConsultation,
    handleEditInit,
  }
}
