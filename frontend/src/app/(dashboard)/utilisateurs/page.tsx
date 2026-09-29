"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import {
  Users,
  Shield,
  Stethoscope,
  UserCheck,
  UserPlus,
  Search,
  KeyRound,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Lock,
  Copy,
  Check,
  Power,
  ShieldAlert,
  UserCog,
  Briefcase,
} from "lucide-react"

interface Utilisateur {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: "ADMIN" | "MEDECIN" | "SECRETAIRE" | "PATIENT"
  telephone: string
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  date_joined: string
  last_login: string | null
}

interface UserListResponse {
  count: number
  results: Utilisateur[]
}

interface UserStatsResponse {
  total: number
  medecins: number
  secretaires: number
  admins: number
  actifs: number
  inactifs: number
}

export default function UtilisateursPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Filtres
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  // États des modales
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null)
  const [resettingUser, setResettingUser] = useState<Utilisateur | null>(null)
  const [deletingUser, setDeletingUser] = useState<Utilisateur | null>(null)

  // Formulaire de création
  const [createForm, setCreateForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "MEDECIN" as "ADMIN" | "MEDECIN" | "SECRETAIRE",
    telephone: "",
    password: "",
    is_active: true,
  })
  const [createError, setCreateError] = useState<string | null>(null)

  // Formulaire d'édition
  const [editForm, setEditForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "MEDECIN" as "ADMIN" | "MEDECIN" | "SECRETAIRE",
    telephone: "",
    is_active: true,
  })
  const [editError, setEditError] = useState<string | null>(null)

  // Formulaire de réinitialisation de mot de passe
  const [resetPasswordForm, setResetPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  })
  const [resetError, setResetError] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Notification flash
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // Profil de l'utilisateur connecté
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
    retry: false,
  })

  // Liste des utilisateurs
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useQuery<UserListResponse>({
    queryKey: ["users", roleFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (roleFilter) params.append("role", roleFilter)
      if (statusFilter) params.append("is_active", statusFilter)
      if (search) params.append("search", search)
      const { data } = await apiClient.get<UserListResponse>(`/accounts/utilisateurs/?${params.toString()}`)
      return data
    },
    retry: false,
  })

  // Statistiques globales
  const { data: statsData, refetch: refetchStats } = useQuery<UserStatsResponse>({
    queryKey: ["users-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<UserStatsResponse>("/accounts/utilisateurs/stats/")
      return data
    },
    retry: false,
  })

  // Invalidation globale
  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["users"] })
    queryClient.invalidateQueries({ queryKey: ["users-stats"] })
  }

  // Mutation: Créer utilisateur
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
      })
      setCreateError(null)
      refreshAll()
      showNotification("success", "L'utilisateur a été créé avec succès.")
    },
    onError: (err: any) => {
      const msg = err.response?.data
        ? Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ")
        : "Erreur lors de la création de l'utilisateur."
      setCreateError(msg)
    },
  })

  // Mutation: Modifier utilisateur
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
    onError: (err: any) => {
      const msg = err.response?.data
        ? Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ")
        : "Erreur lors de la modification."
      setEditError(msg)
    },
  })

  // Mutation: Basculer actif / inactif
  const toggleActiveMutation = useMutation({
    mutationFn: async (user: Utilisateur) => {
      const { data } = await apiClient.post(`/accounts/utilisateurs/${user.id}/toggle-active/`)
      return data
    },
    onSuccess: (res) => {
      refreshAll()
      showNotification("success", res.message || "Statut modifié avec succès.")
    },
    onError: (err: any) => {
      showNotification("error", err.response?.data?.detail || "Impossible de modifier le statut.")
    },
  })

  // Mutation: Réinitialiser mot de passe
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resettingUser) return
      const { data } = await apiClient.post(
        `/accounts/utilisateurs/${resettingUser.id}/reset-password/`,
        resetPasswordForm
      )
      return data
    },
    onSuccess: () => {
      setResettingUser(null)
      setResetPasswordForm({ new_password: "", confirm_password: "" })
      setResetError(null)
      showNotification("success", "Le mot de passe a été réinitialisé.")
    },
    onError: (err: any) => {
      const msg = err.response?.data?.confirm_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.detail ||
        "Erreur lors de la réinitialisation du mot de passe."
      setResetError(msg)
    },
  })

  // Mutation: Supprimer utilisateur
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
    onError: (err: any) => {
      showNotification("error", err.response?.data?.detail || "Impossible de supprimer ce compte.")
    },
  })

  // Générateur de mot de passe sécurisé
  function generateStrongPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*"
    let pwd = ""
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
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

  function handleGeneratePasswordForReset() {
    const pwd = generateStrongPassword()
    setResetPasswordForm({ new_password: pwd, confirm_password: pwd })
    navigator.clipboard?.writeText(pwd)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  // Ouverture modale d'édition avec pré-remplissage
  function openEditModal(user: Utilisateur) {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role as any,
      telephone: user.telephone,
      is_active: user.is_active,
    })
    setEditError(null)
  }

  // Vérification des droits d'accès administrateur
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser

  if (currentUser && !isAdmin) {
    return (
      <div className="flex-1 flex flex-col">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 shadow-sm">
            <ShieldAlert className="mx-auto size-12 text-destructive mb-3" />
            <h2 className="text-xl font-bold text-foreground">Accès restreint</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cet espace de gestion des comptes est strictement réservé aux Administrateurs du système.
            </p>
            <button
              onClick={() => router.push("/patients")}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Retourner aux patients
            </button>
          </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">

      {/* Bannière de notification flash */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/90 text-white"
              : "border border-red-500/30 bg-destructive text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête de la page */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary dark:text-indigo-400">
              <Shield className="size-3.5" />
              <span>Administration & Sécurité</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-3">
              Gestion des comptes utilisateurs
              <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {usersData?.count ?? 0} comptes
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez des accès, attribuez les rôles métier et pilotez les autorisations du personnel.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refreshAll()}
              title="Rafraîchir"
              id="btn-refresh-users"
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              onClick={() => {
                setIsCreateOpen(true)
                setCreateError(null)
              }}
              id="btn-open-create-user"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:scale-[1.01] hover:shadow-primary/35 active:scale-[0.99]"
            >
              <UserPlus className="size-4.5" />
              <span>Nouvel utilisateur</span>
            </button>
          </div>
        </div>

        {/* Cartes KPI Statistiques */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* Total */}
          <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-indigo-200">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total</span>
              <div className="rounded-lg bg-primary/100/10 p-2 text-primary">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {statsData?.total ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Comptes enregistrés</div>
          </div>

          {/* Médecins */}
          <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-emerald-200">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Médecins</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Stethoscope className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {statsData?.medecins ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Corps médical</div>
          </div>

          {/* Secrétaires */}
          <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-amber-200">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Secrétaires</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Briefcase className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {statsData?.secretaires ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Accueil & Réception</div>
          </div>

          {/* Administrateurs */}
          <div className="group rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-purple-200">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Admins</span>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <Shield className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-accent dark:text-accent">
              {statsData?.admins ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Accès complet</div>
          </div>

          {/* Actifs */}
          <div className="group col-span-2 sm:col-span-1 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-cyan-200">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Actifs</span>
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {statsData?.actifs ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                / {statsData?.inactifs ?? 0} inactif(s)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Comptes opérationnels</div>
          </div>
        </div>

        {/* Barre de recherche et de filtres */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Recherche textuelle */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              id="input-search-users"
              placeholder="Rechercher par nom, prénom, email, identifiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filtres par Rôle et Statut */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Rôle */}
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
              <button
                onClick={() => setRoleFilter("")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  roleFilter === ""
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tous les rôles
              </button>
              <button
                onClick={() => setRoleFilter("MEDECIN")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  roleFilter === "MEDECIN"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Stethoscope className="size-3" /> Médecins
              </button>
              <button
                onClick={() => setRoleFilter("SECRETAIRE")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  roleFilter === "SECRETAIRE"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="size-3" /> Secrétaires
              </button>
              <button
                onClick={() => setRoleFilter("ADMIN")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  roleFilter === "ADMIN"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="size-3" /> Admins
              </button>
            </div>

            {/* Statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actifs uniquement</option>
              <option value="false">Inactifs uniquement</option>
            </select>
          </div>
        </div>

        {/* Tableau des utilisateurs */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" id="table-users">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 pl-6 pr-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Rôle métier</th>
                  <th className="py-3.5 px-4">Coordonnées</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Créé le</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto size-6 animate-spin mb-2 text-primary" />
                      Chargement des utilisateurs…
                    </td>
                  </tr>
                ) : usersData?.results?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <Users className="mx-auto size-10 mb-2 opacity-40" />
                      <p className="font-medium text-foreground">Aucun utilisateur trouvé</p>
                      <p className="text-xs mt-1">
                        Modifiez vos critères de recherche ou ajoutez un nouvel utilisateur.
                      </p>
                    </td>
                  </tr>
                ) : (
                  usersData?.results.map((u) => {
                    const isSelf = currentUser?.id === u.id
                    const initials = (
                      (u.first_name?.[0] || u.username[0] || "U") +
                      (u.last_name?.[0] || "")
                    ).toUpperCase()

                    return (
                      <tr
                        key={u.id}
                        className="group transition-colors hover:bg-muted/30"
                        id={`user-row-${u.id}`}
                      >
                        {/* Identité */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-primary dark:text-primary-foreground font-bold text-xs border border-indigo-200 dark:border-indigo-900">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {u.first_name || u.last_name ? (
                                  <span>{u.first_name} {u.last_name}</span>
                                ) : (
                                  <span className="italic text-muted-foreground">Nom non renseigné</span>
                                )}
                                {isSelf && (
                                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                                    Vous
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                                @{u.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="py-4 px-4">
                          {u.role === "ADMIN" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-indigo-900/50 dark:bg-primary/20/50 dark:text-primary-foreground">
                              <Shield className="size-3 text-indigo-500" />
                              Administrateur
                            </span>
                          )}
                          {u.role === "MEDECIN" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <Stethoscope className="size-3 text-emerald-500" />
                              Médecin
                            </span>
                          )}
                          {u.role === "SECRETAIRE" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
                              <Briefcase className="size-3 text-amber-500" />
                              Secrétaire
                            </span>
                          )}
                          {u.role === "PATIENT" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                              Patient
                            </span>
                          )}
                        </td>

                        {/* Coordonnées */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Mail className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">{u.email || "Non renseigné"}</span>
                            </div>
                            {u.telephone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="size-3.5 shrink-0" />
                                <span>{u.telephone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="py-4 px-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <span className="size-1.5 rounded-full bg-slate-400" />
                              Suspendu
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.date_joined).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Modifier */}
                            <button
                              onClick={() => openEditModal(u)}
                              title="Modifier l'utilisateur"
                              id={`btn-edit-user-${u.id}`}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Edit3 className="size-4" />
                            </button>

                            {/* Réinitialiser mot de passe */}
                            <button
                              onClick={() => {
                                setResettingUser(u)
                                setResetPasswordForm({ new_password: "", confirm_password: "" })
                                setResetError(null)
                              }}
                              title="Réinitialiser le mot de passe"
                              id={`btn-reset-password-${u.id}`}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20/50"
                            >
                              <KeyRound className="size-4" />
                            </button>

                            {/* Activer / Désactiver */}
                            <button
                              onClick={() => toggleActiveMutation.mutate(u)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "Vous ne pouvez pas désactiver votre propre compte"
                                  : u.is_active
                                  ? "Suspendre le compte"
                                  : "Activer le compte"
                              }
                              id={`btn-toggle-active-${u.id}`}
                              className={`rounded-lg p-2 transition-colors ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                  : u.is_active
                                  ? "text-muted-foreground hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50"
                                  : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50"
                              }`}
                            >
                              <Power className="size-4" />
                            </button>

                            {/* Supprimer */}
                            <button
                              onClick={() => setDeletingUser(u)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "Vous ne pouvez pas supprimer votre propre compte"
                                  : "Supprimer le compte"
                              }
                              id={`btn-delete-user-${u.id}`}
                              className={`rounded-lg p-2 transition-colors ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                  : "text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/50"
                              }`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1 : CRÉATION D'UTILISATEUR                                         */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Créer un utilisateur</h3>
                  <p className="text-xs text-muted-foreground">
                    Définissez les accès et le rôle du nouvel agent hospitalier
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {createError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              {/* Choix du rôle par cartes visuelles */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Rôle & Niveau d&apos;accès *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "MEDECIN" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      createForm.role === "MEDECIN"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    <Stethoscope className="size-5 mb-1.5 text-emerald-600" />
                    <span className="font-bold">Médecin</span>
                    <span className="text-[10px] opacity-75 mt-0.5">Consultations, ordonnances</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "SECRETAIRE" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      createForm.role === "SECRETAIRE"
                        ? "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs ring-2 ring-amber-500/20"
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    <Briefcase className="size-5 mb-1.5 text-amber-600" />
                    <span className="font-bold">Secrétaire</span>
                    <span className="text-[10px] opacity-75 mt-0.5">Patients, rendez-vous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "ADMIN" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      createForm.role === "ADMIN"
                        ? "border-primary bg-primary/10/50 text-primary-foreground dark:bg-primary/20/40 dark:text-primary-foreground shadow-xs ring-2 ring-primary/20"
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    <Shield className="size-5 mb-1.5 text-primary" />
                    <span className="font-bold">Administrateur</span>
                    <span className="text-[10px] opacity-75 mt-0.5">Gestion complète & comptes</span>
                  </button>
                </div>
              </div>

              {/* Identifiant & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Identifiant de connexion *
                  </label>
                  <input
                    type="text"
                    required
                    id="create-user-username"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="ex: dr.rakoto"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    required
                    id="create-user-email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="contact@hopital.mg"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Prénom & Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Prénom</label>
                  <input
                    type="text"
                    id="create-user-firstname"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder="Jean"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Nom</label>
                  <input
                    type="text"
                    id="create-user-lastname"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder="Rakotomalala"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Téléphone professionnel
                </label>
                <input
                  type="text"
                  id="create-user-telephone"
                  value={createForm.telephone}
                  onChange={(e) => setCreateForm({ ...createForm, telephone: e.target.value })}
                  placeholder="034 00 000 00"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Mot de passe initial avec générateur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">
                    Mot de passe initial * (min. 6 caractères)
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePasswordForCreate}
                    className="text-[11px] font-semibold text-primary hover:text-primary dark:text-indigo-400 flex items-center gap-1"
                  >
                    <KeyRound className="size-3" />
                    {copiedPassword ? "Copié !" : "Générer un mot de passe fort"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    id="create-user-password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mot de passe ou généré automatiquement"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                  {createForm.password && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(createForm.password)
                        setCopiedPassword(true)
                        setTimeout(() => setCopiedPassword(false), 2000)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Copier le mot de passe"
                    >
                      {copiedPassword ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Compte actif */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="create-user-is-active"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="size-4 rounded-md border-border text-primary focus:ring-primary"
                />
                <label htmlFor="create-user-is-active" className="text-xs text-foreground cursor-pointer">
                  Activer immédiatement le compte (l&apos;utilisateur pourra se connecter sans délai)
                </label>
              </div>

              {/* Boutons actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  id="btn-submit-create-user"
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Création en cours…" : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : MODIFICATION D'UTILISATEUR                                     */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Modifier l&apos;utilisateur @{editingUser.username}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Mettez à jour le rôle métier et les informations du profil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {editError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              {/* Choix du rôle */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Rôle métier *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: "MEDECIN" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      editForm.role === "MEDECIN"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Stethoscope className="size-5 mb-1.5 text-emerald-600" />
                    <span className="font-bold">Médecin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: "SECRETAIRE" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      editForm.role === "SECRETAIRE"
                        ? "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ring-2 ring-amber-500/20"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Briefcase className="size-5 mb-1.5 text-amber-600" />
                    <span className="font-bold">Secrétaire</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: "ADMIN" })}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                      editForm.role === "ADMIN"
                        ? "border-primary bg-primary/10/50 text-primary-foreground dark:bg-primary/20/40 dark:text-primary-foreground ring-2 ring-primary/20"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Shield className="size-5 mb-1.5 text-primary" />
                    <span className="font-bold">Administrateur</span>
                  </button>
                </div>
              </div>

              {/* Identifiant & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Identifiant de connexion *
                  </label>
                  <input
                    type="text"
                    required
                    id="edit-user-username"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    required
                    id="edit-user-email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Prénom & Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Prénom</label>
                  <input
                    type="text"
                    id="edit-user-firstname"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Nom</label>
                  <input
                    type="text"
                    id="edit-user-lastname"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Téléphone professionnel
                </label>
                <input
                  type="text"
                  id="edit-user-telephone"
                  value={editForm.telephone}
                  onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Statut actif */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="edit-user-is-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  disabled={editingUser.id === currentUser?.id}
                  className="size-4 rounded-md border-border text-primary focus:ring-primary"
                />
                <label htmlFor="edit-user-is-active" className="text-xs text-foreground cursor-pointer">
                  Compte actif {editingUser.id === currentUser?.id && "(votre propre compte reste actif)"}
                </label>
              </div>

              {/* Boutons actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  id="btn-submit-edit-user"
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Enregistrement…" : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3 : RÉINITIALISATION DU MOT DE PASSE                                */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/20">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Réinitialiser mot de passe</h3>
                  <p className="text-xs text-muted-foreground">
                    Compte : <span className="font-semibold text-foreground">@{resettingUser.username}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {resetError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {resetError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                resetPasswordMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Besoin d&apos;un mot de passe sécurisé ?</span>
                <button
                  type="button"
                  onClick={handleGeneratePasswordForReset}
                  className="text-xs font-semibold text-accent hover:text-accent dark:text-accent flex items-center gap-1"
                >
                  <KeyRound className="size-3" />
                  Générer automatiquement
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nouveau mot de passe * (min. 6 car.)
                </label>
                <input
                  type="text"
                  required
                  id="reset-user-new-password"
                  value={resetPasswordForm.new_password}
                  onChange={(e) =>
                    setResetPasswordForm({ ...resetPasswordForm, new_password: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="text"
                  required
                  id="reset-user-confirm-password"
                  value={resetPasswordForm.confirm_password}
                  onChange={(e) =>
                    setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  id="btn-submit-reset-password"
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-md shadow-accent/20 hover:bg-accent/90 disabled:opacity-50"
                >
                  {resetPasswordMutation.isPending ? "Mise à jour…" : "Appliquer le mot de passe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4 : CONFIRMATION DE SUPPRESSION                                     */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Supprimer l&apos;utilisateur ?</h3>
                <p className="text-xs text-muted-foreground">Cette action est irréversible</p>
              </div>
            </div>

            <p className="text-sm text-foreground mt-2">
              Êtes-vous sûr de vouloir supprimer définitivement le compte de{" "}
              <span className="font-bold">
                {deletingUser.first_name || deletingUser.last_name
                  ? `${deletingUser.first_name} ${deletingUser.last_name}`
                  : `@${deletingUser.username}`}
              </span>{" "}
              (@{deletingUser.username}) ?
            </p>

            <p className="text-xs text-muted-foreground mt-2">
              Toutes les permissions associées à ce compte seront révoquées immédiatement.
            </p>

            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                id="btn-confirm-delete-user"
                className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
