"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { CheckCircle, WarningCircle } from "@phosphor-icons/react"
import {
  DemandeExamen,
  Consultation,
  DEFAULT_LIGNE_EXAMEN,
  computeExamenStats,
  filterDemandes,
} from "@/components/examens/types"
import { handlePrintDemandeExamen } from "@/components/examens/printExamenDemande"
import { ExamenHeader } from "@/components/examens/ExamenHeader"
import { ExamenFilters } from "@/components/examens/ExamenFilters"
import { ExamensTable } from "@/components/examens/ExamensTable"
import { ExamenPreviewModal } from "@/components/examens/ExamenPreviewModal"
import { ExamenCreateModal } from "@/components/examens/ExamenCreateModal"
import { ExamenEditModal, EditModalState } from "@/components/examens/ExamenEditModal"
import { ExamenCancelModal } from "@/components/examens/ExamenCancelModal"
import { ExamenHistoryModal } from "@/components/examens/ExamenHistoryModal"
import { useExamenMutations } from "@/components/examens/useExamenMutations"

const INITIAL_EDIT_MODAL: EditModalState = {
  isOpen: false,
  demande: null,
  motif_correction: "",
  renseignements_cliniques: "",
  lignes: [],
}

export default function ExamensPage() {
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<string>("ALL")
  const [filterCategorie, setFilterCategorie] = useState<string>("ALL")
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)
  const [previewDemande, setPreviewDemande] = useState<DemandeExamen | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editModal, setEditModal] = useState<EditModalState>(INITIAL_EDIT_MODAL)

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
  }>({ isOpen: false, demande: null })

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
    motif: string
  }>({ isOpen: false, demande: null, motif: "" })

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/accounts/me/")).data,
  })

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["demandes-examens"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: DemandeExamen[] } | DemandeExamen[]>(`/examinations/?page_size=200`)
      return Array.isArray(data) ? data : ((data.results || []) as DemandeExamen[])
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list_for_exam"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] } | Consultation[]>(`/consultations/?page_size=100`)
      return Array.isArray(data) ? data : ((data.results || []) as Consultation[])
    },
    enabled: isCreateOpen,
  })

  const {
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
  } = useExamenMutations({
    setIsCreateOpen,
    editModal,
    setEditModal,
    cancelModal,
    setCancelModal,
    previewDemande,
    setPreviewDemande,
    showNotification,
  })

  const isDoctor = currentUser?.role === "MEDECIN"
  const isAdmin = currentUser?.role === "ADMIN"
  const canPrescribe = isDoctor || isAdmin
  const allDemandes = useMemo(() => rawData || [], [rawData])
  const stats = useMemo(() => computeExamenStats(allDemandes), [allDemandes])
  const demandesList = useMemo(
    () => filterDemandes(allDemandes, search, filterStatut, filterCategorie),
    [allDemandes, search, filterStatut, filterCategorie]
  )
  const hasActiveFilters = Boolean(search.trim() || filterStatut !== "ALL" || filterCategorie !== "ALL")

  function resetFilters() {
    setSearch("")
    setFilterStatut("ALL")
    setFilterCategorie("ALL")
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} weight="duotone" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircle size={20} weight="duotone" className="shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <ExamenHeader
          canPrescribe={canPrescribe}
          onPrescribe={() => {
            setFormConsultation("")
            setFormRenseignements("")
            setFormLignes([{ ...DEFAULT_LIGNE_EXAMEN }])
            setIsCreateOpen(true)
          }}
        />

        <ExamenFilters
          filterCategorie={filterCategorie}
          setFilterCategorie={setFilterCategorie}
          filterStatut={filterStatut}
          setFilterStatut={setFilterStatut}
          search={search}
          setSearch={setSearch}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          stats={stats}
        />

        <ExamensTable
          demandesList={demandesList}
          isLoading={isLoading}
          filterCategorie={filterCategorie}
          hasActiveFilters={hasActiveFilters}
          expandedExamId={expandedExamId}
          setExpandedExamId={setExpandedExamId}
          currentUser={currentUser}
          onResetFilters={resetFilters}
          onPreview={setPreviewDemande}
          onPrint={handlePrintDemandeExamen}
          onOpenHistory={(demande) => setHistoryModal({ isOpen: true, demande })}
          onOpenEdit={(demande) => {
            setEditModal({
              isOpen: true,
              demande,
              motif_correction: "",
              renseignements_cliniques: demande.renseignements_cliniques || "",
              lignes: (demande.lignes || []).map((l) => ({ ...l })),
            })
          }}
          onOpenCancel={(demande) => setCancelModal({ isOpen: true, demande, motif: "" })}
        />
      </main>

      <ExamenPreviewModal
        demande={previewDemande}
        onClose={() => setPreviewDemande(null)}
        onPrint={handlePrintDemandeExamen}
      />

      <ExamenCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        isPending={createMutation.isPending}
        consultations={consultations}
        formConsultation={formConsultation}
        setFormConsultation={setFormConsultation}
        formRenseignements={formRenseignements}
        setFormRenseignements={setFormRenseignements}
        formLignes={formLignes}
        onAddLine={addLine}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
      />

      <ExamenEditModal
        editModal={editModal}
        setEditModal={setEditModal}
        onSubmit={(e) => {
          e.preventDefault()
          editMutation.mutate()
        }}
        isPending={editMutation.isPending}
      />

      <ExamenCancelModal
        isOpen={cancelModal.isOpen}
        demande={cancelModal.demande}
        motif={cancelModal.motif}
        setMotif={(v) => setCancelModal((prev) => ({ ...prev, motif: v }))}
        onClose={() => setCancelModal({ isOpen: false, demande: null, motif: "" })}
        onSubmit={(e) => {
          e.preventDefault()
          cancelMutation.mutate()
        }}
        isPending={cancelMutation.isPending}
      />

      <ExamenHistoryModal
        isOpen={historyModal.isOpen}
        demande={historyModal.demande}
        onClose={() => setHistoryModal({ isOpen: false, demande: null })}
      />
    </div>
  )
}
