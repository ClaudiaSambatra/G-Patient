"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import {
  FileText,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  Consultation,
  ConsultationListResponse,
  EditConsultationFormState,
  INITIAL_EDIT_FORM,
  consultationToEditForm,
} from "@/components/consultations/types"
import {
  handlePrintPrescription,
  handlePrintExam,
} from "@/components/consultations/printConsultationDocs"
import { ConsultationsFilters } from "@/components/consultations/ConsultationsFilters"
import { ConsultationsTable } from "@/components/consultations/ConsultationsTable"
import { ConsultationDetailModal } from "@/components/consultations/ConsultationDetailModal"
import {
  FactureMedicamentsModal,
  FactureMedModalState,
} from "@/components/consultations/FactureMedicamentsModal"
import { useConsultationMutations } from "@/components/consultations/useConsultationMutations"

export default function ConsultationsPage() {
  const [search, setSearch] = useState("")
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] =
    useState<EditConsultationFormState>(INITIAL_EDIT_FORM)

  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [factureMedModal, setFactureMedModal] =
    useState<FactureMedModalState | null>(null)

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["consultations", search, dateDebut, dateFin, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (dateDebut) params.append("date_debut", dateDebut)
      if (dateFin) params.append("date_fin", dateFin)
      params.append("page", String(page))
      params.append("page_size", String(pageSize))
      const res = await apiClient.get<ConsultationListResponse>(
        `/consultations/?${params.toString()}`
      )
      return res.data
    },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1
  const consultationsList = data?.results || []

  const { data: consultationPrescriptions = [] } = useQuery({
    queryKey: ["consultation-prescriptions", selectedConsultation?.id],
    queryFn: async () => {
      if (!selectedConsultation?.id) return []
      const res = await apiClient.get<{ results: any[] }>(
        `/prescriptions/?consultation=${selectedConsultation.id}`
      )
      return res.data.results || []
    },
    enabled: Boolean(selectedConsultation?.id),
  })

  const currentPrescriptions =
    selectedConsultation?.ordonnances &&
    selectedConsultation.ordonnances.length > 0
      ? selectedConsultation.ordonnances
      : consultationPrescriptions

  const { data: consultationExamens = [] } = useQuery({
    queryKey: ["consultation-examens", selectedConsultation?.id],
    queryFn: async () => {
      if (!selectedConsultation?.id) return []
      const res = await apiClient.get<{ results: any[] } | any[]>(
        `/examinations/?consultation=${selectedConsultation.id}`
      )
      return Array.isArray(res.data)
        ? res.data
        : ((res.data.results || []) as any[])
    },
    enabled: Boolean(selectedConsultation?.id),
  })

  const currentExamens =
    selectedConsultation?.examens && selectedConsultation.examens.length > 0
      ? selectedConsultation.examens
      : Array.isArray(consultationExamens)
      ? consultationExamens
      : []

  const { updateMutation, createFactureMedicamentsMutation } =
    useConsultationMutations({
      selectedConsultation,
      setSelectedConsultation,
      setIsEditing,
      editForm,
      factureMedModal,
      setFactureMedModal,
      showNotification,
    })

  function handleOpenDetail(consultation: Consultation) {
    setSelectedConsultation(consultation)
    setIsEditing(false)
    setEditForm(consultationToEditForm(consultation))
  }

  function handleResetFilters() {
    setSearch("")
    setDateDebut("")
    setDateFin("")
    setPage(1)
  }

  function handleStartEditing() {
    if (!selectedConsultation) return
    setEditForm(consultationToEditForm(selectedConsultation))
    setIsEditing(true)
  }

  return (
    <div className="flex-1 flex flex-col">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800"
              : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            <XCircle className="size-4" />
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 dark:bg-primary/20">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
                Consultations médicales
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  {data?.count ?? 0} dossiers
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Registre médical, constantes vitales, diagnostics et suivi des patients
              </p>
            </div>
          </div>
        </div>

        <ConsultationsFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          dateDebut={dateDebut}
          onDateDebutChange={(v) => {
            setDateDebut(v)
            setPage(1)
          }}
          dateFin={dateFin}
          onDateFinChange={(v) => {
            setDateFin(v)
            setPage(1)
          }}
          onResetFilters={handleResetFilters}
        />

        <ConsultationsTable
          consultations={consultationsList}
          isLoading={isLoading}
          totalCount={data?.count ?? 0}
          page={page}
          totalPages={totalPages}
          hasActiveFilters={Boolean(search || dateDebut || dateFin)}
          onPageChange={setPage}
          onResetFilters={handleResetFilters}
          onSelectConsultation={handleOpenDetail}
        />
      </main>

      <ConsultationDetailModal
        consultation={selectedConsultation}
        currentUser={currentUser}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => {
          setSelectedConsultation(null)
          setIsEditing(false)
        }}
        onUpdateSubmit={(e) => {
          e.preventDefault()
          updateMutation.mutate()
        }}
        isUpdatePending={updateMutation.isPending}
        currentPrescriptions={currentPrescriptions}
        currentExamens={currentExamens}
        onPrintPrescription={(ord) =>
          handlePrintPrescription(ord, selectedConsultation)
        }
        onPrintExam={(exam) => handlePrintExam(exam, selectedConsultation)}
        onOpenFactureMedModal={(ord) => {
          if (!selectedConsultation) return
          setFactureMedModal({
            isOpen: true,
            ordonnanceId: ord.id,
            patientId: selectedConsultation.patient,
            designation: `Médicaments ordonnance ${ord.numero || ord.id}`,
            montant: "",
          })
        }}
        onStartEditing={handleStartEditing}
      />

      <FactureMedicamentsModal
        modalState={factureMedModal}
        setModalState={setFactureMedModal}
        onSubmit={(e) => {
          e.preventDefault()
          createFactureMedicamentsMutation.mutate()
        }}
        isPending={createFactureMedicamentsMutation.isPending}
      />
    </div>
  )
}
