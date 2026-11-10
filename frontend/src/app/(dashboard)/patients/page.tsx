"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, Search, CheckCircle2, AlertCircle } from "lucide-react"

import { PatientListResponse } from "@/components/patients/types"
import { PatientsTable } from "@/components/patients/PatientsTable"
import { PatientFormModal } from "@/components/patients/PatientFormModal"
import { PatientDetailModal } from "@/components/patients/PatientDetailModal"
import { PatientConsultationModal } from "@/components/patients/PatientConsultationModal"
import { PatientDeleteModal } from "@/components/patients/PatientDeleteModal"
import { usePatientMutations } from "@/components/patients/usePatientMutations"

export default function PatientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  const {
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
  } = usePatientMutations(showNotification)

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
    retry: false,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      params.append("page", page.toString())
      const { data } = await apiClient.get<PatientListResponse>(`/patients/?${params.toString()}`)
      return data
    },
    retry: false,
  })

  const { data: consultationsData, isLoading: isLoadingConsultations } = useQuery({
    queryKey: ["consultations", viewingPatient?.id],
    queryFn: async () => {
      if (!viewingPatient) return null
      const { data } = await apiClient.get(`/consultations/?patient=${viewingPatient.id}`)
      return data.results || data
    },
    enabled: !!viewingPatient,
  })

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser
  const isMedecin = currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-background">
        <main className="mx-auto max-w-md p-8 text-center mt-20">
          <Card>
            <CardContent className="pt-6">
              <p className="mb-4 text-sm text-destructive font-medium">Session expirée ou non authentifiée.</p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Notification flash */}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <Users className="size-7 text-primary" />
              Gestion des Patients
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consultez, enregistrez et mettez à jour les dossiers médicaux complets
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <UserPlus className="size-4.5" />
              <span>Nouveau Patient</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, téléphone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </Card>

        {/* Tableau Répertoire */}
        <PatientsTable
          data={data}
          isLoading={isLoading}
          isAdmin={Boolean(isAdmin)}
          page={page}
          setPage={setPage}
          onViewPatient={setViewingPatient}
          onEditPatient={handleEditInit}
          onDeletePatient={setDeletingPatient}
        />
      </main>

      {/* Modal 1 : Création Patient */}
      <PatientFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={() => createPatient.mutate()}
        isPending={createPatient.isPending}
        form={form}
        setForm={setForm}
      />

      {/* Modal 2 : Modification Patient */}
      <PatientFormModal
        isOpen={Boolean(editingPatient)}
        isEditing
        onClose={() => setEditingPatient(null)}
        onSubmit={() => updatePatient.mutate()}
        isPending={updatePatient.isPending}
        form={editForm}
        setForm={setEditForm}
      />

      {/* Modal 3 : Voir Détails */}
      <PatientDetailModal
        patient={viewingPatient}
        onClose={() => setViewingPatient(null)}
        isMedecin={Boolean(isMedecin)}
        onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
        consultationsData={consultationsData}
        isLoadingConsultations={isLoadingConsultations}
      />

      {/* Modal 4 : Confirmation Suppression */}
      <PatientDeleteModal
        patient={deletingPatient}
        onClose={() => setDeletingPatient(null)}
        onConfirm={() => deletePatient.mutate()}
        isPending={deletePatient.isPending}
      />

      {/* Modal 5 : Nouvelle Consultation */}
      <PatientConsultationModal
        isOpen={isConsultationModalOpen}
        patient={viewingPatient}
        onClose={() => setIsConsultationModalOpen(false)}
        onSubmit={() => createConsultation.mutate()}
        isPending={createConsultation.isPending}
        form={consultationForm}
        setForm={setConsultationForm}
      />
    </div>
  )
}
