"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  RendezVous,
  RdvFormState,
  EncaissementModalState,
  extractErrorMessage,
} from "./types"

interface UseRendezVousMutationsProps {
  form: RdvFormState
  setForm: React.Dispatch<React.SetStateAction<RdvFormState>>
  selectedRdv: RendezVous | null
  setSelectedRdv: (rdv: RendezVous | null) => void
  setIsCreateOpen: (v: boolean) => void
  setIsEditOpen: (v: boolean) => void
  encaissementModal: EncaissementModalState | null
  setEncaissementModal: React.Dispatch<React.SetStateAction<EncaissementModalState | null>>
  setFormError: (msg: string | null) => void
  showNotification: (type: "success" | "error", message: string) => void
  refetchRdv: () => void
}

export function useRendezVousMutations({
  form,
  setForm,
  selectedRdv,
  setSelectedRdv,
  setIsCreateOpen,
  setIsEditOpen,
  encaissementModal,
  setEncaissementModal,
  setFormError,
  showNotification,
  refetchRdv,
}: UseRendezVousMutationsProps) {
  const queryClient = useQueryClient()

  const updatePresenceMutation = useMutation({
    mutationFn: async ({ medecinId, absent }: { medecinId: number; absent: boolean }) =>
      apiClient.post(`/medecins/${medecinId}/presence/`, { absent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medecins"] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Statut de présence mis à jour avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification de présence.")
      showNotification("error", msg)
    },
  })

  const encaisserModalMutation = useMutation({
    mutationFn: async (factureId: number) => {
      try {
        return await apiClient.post(`/billing/factures/${factureId}/encaisser/`)
      } catch {
        return await apiClient.post(`/billing/${factureId}/encaisser/`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      refetchRdv()
      if (encaissementModal) {
        setEncaissementModal((prev) => (prev ? { ...prev, isPaid: true } : null))
      }
      showNotification("success", "Paiement encaissé avec succès. Rendez-vous confirmé.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'encaissement.")
      showNotification("error", msg)
    },
  })

  async function handleEncaisserRow(rdv: RendezVous) {
    if (rdv.facture_id) {
      setEncaissementModal({
        isOpen: true,
        rdvId: rdv.id,
        factureId: rdv.facture_id,
        montant: 20000,
        patientNom: rdv.patient_nom,
        isPaid: false,
      })
      return
    }

    try {
      const { data } = await apiClient.get<{ results: Array<{ id: number; montant?: number; rendez_vous?: number }> }>(
        `/billing/?rendez_vous=${rdv.id}`
      )
      let f = data.results?.[0]
      if (!f) {
        const { data: patientData } = await apiClient.get<{ results: Array<{ id: number; montant?: number; rendez_vous?: number }> }>(
          `/billing/?patient=${rdv.patient}&type=CONSULTATION&statut=IMPAYEE`
        )
        f = patientData.results?.find((item) => item.rendez_vous === rdv.id) || patientData.results?.[0]
      }
      if (f) {
        setEncaissementModal({
          isOpen: true,
          rdvId: rdv.id,
          factureId: f.id,
          montant: Number(f.montant) || 20000,
          patientNom: rdv.patient_nom,
          isPaid: false,
        })
      } else {
        showNotification("error", "Aucune facture impayée trouvée pour ce rendez-vous.")
      }
    } catch {
      showNotification("error", "Erreur lors de la récupération de la facture.")
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      const payload = {
        patient: Number(form.patient),
        medecin: Number(form.medecin),
        date_heure: new Date(`${form.date}T${form.heure}:00`).toISOString(),
        type: form.type,
        motif: form.type === "CONTROLE" ? form.motif : "",
      }
      const res = await apiClient.post<RendezVous>("/rendezvous/", payload)
      return res.data
    },
    onSuccess: async (createdRdv) => {
      setIsCreateOpen(false)
      setForm({ patient: "", medecin: "", date: "", heure: "", type: "CONSULTATION", motif: "" })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["factures"] })

      if (createdRdv.type === "CONSULTATION") {
        try {
          const { data: facturesData } = await apiClient.get<{ results: Array<{ id: number; montant?: number; rendez_vous?: number }> }>(
            `/billing/?patient=${createdRdv.patient}&type=CONSULTATION&statut=IMPAYEE`
          )
          const matchingFacture =
            facturesData.results?.find((f) => f.rendez_vous === createdRdv.id) ||
            facturesData.results?.[0]
          if (matchingFacture) {
            setEncaissementModal({
              isOpen: true,
              rdvId: createdRdv.id,
              factureId: matchingFacture.id,
              montant: Number(matchingFacture.montant) || 20000,
              patientNom: createdRdv.patient_nom,
              isPaid: false,
            })
            return
          }
        } catch {
          // fallback
        }
        showNotification("success", "Rendez-vous planifié avec succès.")
      } else {
        showNotification("success", "Rendez-vous de suivi gratuit planifié avec succès.")
      }
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la planification.")
      setFormError(msg)
      showNotification("error", msg)
    },
  })

  const updateFullMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      const payload = {
        patient: Number(form.patient),
        medecin: Number(form.medecin),
        date_heure: new Date(`${form.date}T${form.heure}:00`).toISOString(),
        motif: form.type === "CONTROLE" ? form.motif : "",
      }
      return apiClient.patch(`/rendezvous/${selectedRdv?.id}/`, payload)
    },
    onSuccess: () => {
      setIsEditOpen(false)
      setSelectedRdv(null)
      setForm({ patient: "", medecin: "", date: "", heure: "", type: "CONSULTATION", motif: "" })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous modifié avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification.")
      setFormError(msg)
      showNotification("error", msg)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) =>
      apiClient.patch(`/rendezvous/${id}/`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Statut du rendez-vous mis à jour.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Transition de statut interdite.")
      showNotification("error", msg)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => apiClient.post(`/rendezvous/${id}/annuler/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous annulé. Le créneau est désormais libre.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'annulation.")
      showNotification("error", msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/rendezvous/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous définitivement supprimé.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la suppression.")
      showNotification("error", msg)
    },
  })

  return {
    updatePresenceMutation,
    encaisserModalMutation,
    handleEncaisserRow,
    createMutation,
    updateFullMutation,
    updateStatusMutation,
    cancelMutation,
    deleteMutation,
  }
}
