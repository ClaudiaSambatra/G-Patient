import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Utilisateur } from "./types"

export function useUserMutations(
  refreshAll: () => void,
  showNotification: (type: "success" | "error", message: string) => void
) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null)
  const [deletingUser, setDeletingUser] = useState<Utilisateur | null>(null)

  const [createForm, setCreateForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "MEDECIN" as "ADMIN" | "MEDECIN" | "SECRETAIRE",
    telephone: "",
    password: "",
    is_active: true,
    specialite: "",
    numero_ordre: "",
  })
  const [createError, setCreateError] = useState<string | null>(null)

  const [editForm, setEditForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "MEDECIN" as "ADMIN" | "MEDECIN" | "SECRETAIRE",
    telephone: "",
    is_active: true,
    specialite: "",
    numero_ordre: "",
  })
  const [editError, setEditError] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/accounts/utilisateurs/", createForm)
      return data
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setCreateForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "MEDECIN",
        telephone: "",
        password: "",
        is_active: true,
        specialite: "",
        numero_ordre: "",
      })
      setCreateError(null)
      refreshAll()
      showNotification("success", "L'utilisateur a été créé avec succès.")
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: Record<string, unknown> } })?.response
      const msg = resp?.data
        ? Object.entries(resp.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ")
        : "Erreur lors de la création de l'utilisateur."
      setCreateError(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return
      const { data } = await apiClient.patch(`/accounts/utilisateurs/${editingUser.id}/`, editForm)
      return data
    },
    onSuccess: () => {
      setEditingUser(null)
      setEditError(null)
      refreshAll()
      showNotification("success", "Les informations ont été mises à jour.")
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: Record<string, unknown> } })?.response
      const msg = resp?.data
        ? Object.entries(resp.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ")
        : "Erreur lors de la modification."
      setEditError(msg)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (user: Utilisateur) => {
      const { data } = await apiClient.post(`/accounts/utilisateurs/${user.id}/toggle-active/`)
      return data
    },
    onSuccess: (res: { message?: string }) => {
      refreshAll()
      showNotification("success", res.message || "Statut modifié avec succès.")
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response
      showNotification("error", resp?.data?.detail || "Impossible de modifier le statut.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingUser) return
      await apiClient.delete(`/accounts/utilisateurs/${deletingUser.id}/`)
    },
    onSuccess: () => {
      setDeletingUser(null)
      refreshAll()
      showNotification("success", "Le compte utilisateur a été supprimé.")
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response
      showNotification("error", resp?.data?.detail || "Impossible de supprimer ce compte.")
    },
  })

  // Générateur cryptographique (crypto.getRandomValues) et non Math.random().
  function generateStrongPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*"
    // Plus grand multiple de chars.length <= 256 : évite le biais du modulo.
    const limite = 256 - (256 % chars.length)
    let pwd = ""
    while (pwd.length < 16) {
      const octets = crypto.getRandomValues(new Uint8Array(32))
      for (const o of octets) {
        if (o < limite && pwd.length < 16) pwd += chars[o % chars.length]
      }
    }
    return pwd
  }

  function handleGeneratePasswordForCreate() {
    const pwd = generateStrongPassword()
    setCreateForm((f) => ({ ...f, password: pwd }))
    navigator.clipboard?.writeText(pwd)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  function openEditModal(user: Utilisateur) {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role as "ADMIN" | "MEDECIN" | "SECRETAIRE",
      telephone: user.telephone,
      is_active: user.is_active,
      specialite: user.specialite ?? "",
      numero_ordre: user.numero_ordre ?? "",
    })
    setEditError(null)
  }

  return {
    isCreateOpen,
    setIsCreateOpen,
    editingUser,
    setEditingUser,
    deletingUser,
    setDeletingUser,
    createForm,
    setCreateForm,
    createError,
    setCreateError,
    editForm,
    setEditForm,
    editError,
    copiedPassword,
    setCopiedPassword,
    createMutation,
    updateMutation,
    toggleActiveMutation,
    deleteMutation,
    handleGeneratePasswordForCreate,
    openEditModal,
  }
}
