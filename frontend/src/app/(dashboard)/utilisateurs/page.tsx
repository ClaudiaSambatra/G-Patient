"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Shield, UserPlus, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react"

import { UserListResponse, UserStatsResponse } from "@/components/utilisateurs/types"
import { UserStatsCards } from "@/components/utilisateurs/UserStatsCards"
import { UserFilters } from "@/components/utilisateurs/UserFilters"
import { UsersTable } from "@/components/utilisateurs/UsersTable"
import { UserCreateModal } from "@/components/utilisateurs/UserCreateModal"
import { UserEditModal } from "@/components/utilisateurs/UserEditModal"
import { UserDeleteModal } from "@/components/utilisateurs/UserDeleteModal"
import { useUserMutations } from "@/components/utilisateurs/useUserMutations"

export default function UtilisateursPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Filtres
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  // Notification flash
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["users"] })
    queryClient.invalidateQueries({ queryKey: ["users-stats"] })
  }

  const {
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
  } = useUserMutations(refreshAll, showNotification)

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
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<UserListResponse>({
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
  const { data: statsData } = useQuery<UserStatsResponse>({
    queryKey: ["users-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<UserStatsResponse>("/accounts/utilisateurs/stats/")
      return data
    },
    retry: false,
  })

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser

  if (currentUser && !isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 shadow-sm text-center max-w-md">
          <ShieldAlert className="mx-auto size-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground">Accès restreint</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cet espace de gestion des comptes est strictement réservé aux Administrateurs du système.
          </p>
          <button
            onClick={() => router.push("/patients")}
            className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
          >
            Retourner aux patients
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Bannière flash */}
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary dark:text-accent">
              <Shield className="size-3.5" />
              <span>Administration &amp; Sécurité</span>
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
              onClick={() => {
                setIsCreateOpen(true)
                setCreateError(null)
              }}
              id="btn-open-create-user"
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <UserPlus className="size-4.5" />
              <span>Nouvel utilisateur</span>
            </button>
          </div>
        </div>

        {/* Cartes KPI */}
        <UserStatsCards statsData={statsData} />

        {/* Barre de filtres */}
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Tableau */}
        <UsersTable
          usersData={usersData}
          isLoadingUsers={isLoadingUsers}
          currentUser={currentUser}
          onEditUser={openEditModal}
          onToggleActive={(u) => toggleActiveMutation.mutate(u)}
          onDeleteUser={setDeletingUser}
        />
      </main>

      {/* Modal Création */}
      <UserCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={() => createMutation.mutate()}
        isPending={createMutation.isPending}
        form={createForm}
        setForm={setCreateForm}
        error={createError}
        copiedPassword={copiedPassword}
        onGeneratePassword={handleGeneratePasswordForCreate}
        onCopyPassword={() => {
          navigator.clipboard?.writeText(createForm.password)
          setCopiedPassword(true)
          setTimeout(() => setCopiedPassword(false), 2000)
        }}
      />

      {/* Modal Modification */}
      <UserEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={() => updateMutation.mutate()}
        isPending={updateMutation.isPending}
        form={editForm}
        setForm={setEditForm}
        error={editError}
        isSelf={editingUser?.id === currentUser?.id}
      />

      {/* Modal Suppression */}
      <UserDeleteModal
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
