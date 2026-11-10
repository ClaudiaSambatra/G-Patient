import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { LigneOrdonnance, Ordonnance } from "./types"

interface UseOrdonnanceMutationsProps {
  showNotification: (type: "success" | "error", message: string) => void
  formConsultation: string
  setFormConsultation: (v: string) => void
  formLignes: LigneOrdonnance[]
  setFormLignes: (lignes: LigneOrdonnance[]) => void
  defaultLigne: LigneOrdonnance
  setIsCreateOpen: (v: boolean) => void
  editModal: { isOpen: boolean; ordonnance: Ordonnance | null; motif: string }
  setEditModal: (v: { isOpen: boolean; ordonnance: Ordonnance | null; motif: string }) => void
  cancelModal: { isOpen: boolean; ordonnance: Ordonnance | null; motif: string }
  setCancelModal: (v: { isOpen: boolean; ordonnance: Ordonnance | null; motif: string }) => void
}

export function useOrdonnanceMutations({
  showNotification,
  formConsultation,
  setFormConsultation,
  formLignes,
  setFormLignes,
  defaultLigne,
  setIsCreateOpen,
  editModal,
  setEditModal,
  cancelModal,
  setCancelModal,
}: UseOrdonnanceMutationsProps) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        consultation: Number(formConsultation),
        lignes: formLignes.map((l, idx) => ({ ...l, ordre: idx + 1 })),
      }
      return apiClient.post("/prescriptions/", payload)
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setFormConsultation("")
      setFormLignes([{ ...defaultLigne }])
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance rédigée et enregistrée avec succès.")
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Erreur lors de la création de l'ordonnance."
      showNotification("error", String(msg))
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editModal.ordonnance) return
      const payload = {
        motif_correction: editModal.motif.trim(),
        lignes: formLignes.map((l, idx) => ({ ...l, ordre: idx + 1 })),
      }
      return apiClient.put(`/prescriptions/${editModal.ordonnance.id}/`, payload)
    },
    onSuccess: () => {
      setEditModal({ isOpen: false, ordonnance: null, motif: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification(
        "success",
        "Ordonnance corrigée avec succès. L'historique d'audit a été mis à jour."
      )
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.motif_correction?.[0] ||
        err?.response?.data?.detail ||
        "Erreur lors de la modification de l'ordonnance."
      showNotification("error", String(msg))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelModal.ordonnance) return
      return apiClient.post(
        `/prescriptions/${cancelModal.ordonnance.id}/annuler/`,
        { motif: cancelModal.motif.trim() }
      )
    },
    onSuccess: () => {
      setCancelModal({ isOpen: false, ordonnance: null, motif: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance annulée formellement.")
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        "Erreur lors de l'annulation de l'ordonnance."
      showNotification("error", String(msg))
    },
  })

  return {
    createMutation,
    updateMutation,
    cancelMutation,
  }
}
