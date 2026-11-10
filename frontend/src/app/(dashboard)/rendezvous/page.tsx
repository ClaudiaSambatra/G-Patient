"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { handlePrintRecu } from "@/components/rendezvous/printRdvDocuments"
import { RendezVousHeader } from "@/components/rendezvous/RendezVousHeader"
import { RendezVousFilters } from "@/components/rendezvous/RendezVousFilters"
import { RendezVousTableView } from "@/components/rendezvous/RendezVousTableView"
import { RendezVousCalendarView } from "@/components/rendezvous/RendezVousCalendarView"
import { RendezVousModals } from "@/components/rendezvous/RendezVousModals"
import { useRendezVousQueries } from "@/components/rendezvous/useRendezVousQueries"
import { useRendezVousMutations } from "@/components/rendezvous/useRendezVousMutations"
import { useRendezVousConsultationMutations } from "@/components/rendezvous/useRendezVousConsultationMutations"
import { useRendezVousModalState } from "@/components/rendezvous/useRendezVousModalState"

export default function RendezVousPage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [calendarView, setCalendarView] = useState<"day" | "week">("day")
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

  const [search, setSearch] = useState("")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [medecinFilter, setMedecinFilter] = useState<string>("ALL")
  const [dateFilterMode, setDateFilterMode] = useState<"none" | "single" | "range">("none")
  const [singleDate, setSingleDate] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  const modalState = useRendezVousModalState()

  const {
    currentUser,
    medecinsData,
    connectedMedecinProfile,
    patientsData,
    todayStr,
    rdvData,
    isLoading,
    refetchRdv,
    isControleEligible,
  } = useRendezVousQueries({
    search,
    statutFilter,
    medecinFilter,
    dateFilterMode,
    singleDate,
    startDate,
    endDate,
    currentPage,
    viewMode,
    calendarView,
    calendarDate,
    formPatient: modalState.form.patient,
    formDate: modalState.form.date,
  })

  const {
    updatePresenceMutation,
    encaisserModalMutation,
    handleEncaisserRow,
    createMutation,
    updateFullMutation,
    updateStatusMutation,
    cancelMutation,
    deleteMutation,
  } = useRendezVousMutations({
    form: modalState.form,
    setForm: modalState.setForm,
    selectedRdv: modalState.selectedRdv,
    setSelectedRdv: modalState.setSelectedRdv,
    setIsCreateOpen: modalState.setIsCreateOpen,
    setIsEditOpen: modalState.setIsEditOpen,
    encaissementModal: modalState.encaissementModal,
    setEncaissementModal: modalState.setEncaissementModal,
    setFormError: modalState.setFormError,
    showNotification,
    refetchRdv,
  })

  const {
    createConsultationMutation,
    updateConsultationMutation,
    handleOpenConsultation,
    handleOpenConsultationOrigine,
  } = useRendezVousConsultationMutations({
    selectedRdv: modalState.selectedRdv,
    setSelectedRdv: modalState.setSelectedRdv,
    setIsConsultOpen: modalState.setIsConsultOpen,
    setIsConsultReadOnlyOpen: modalState.setIsConsultReadOnlyOpen,
    consultForm: modalState.consultForm,
    setConsultForm: modalState.setConsultForm,
    editConsultForm: modalState.editConsultForm,
    setEditConsultForm: modalState.setEditConsultForm,
    existingConsultation: modalState.existingConsultation,
    setExistingConsultation: modalState.setExistingConsultation,
    setIsEditingConsultation: modalState.setIsEditingConsultation,
    setConsultationOrigineModal: modalState.setConsultationOrigineModal,
    showNotification,
  })

  const selectedMedecinInForm = useMemo(
    () => medecinsData.find((m) => m.id.toString() === modalState.form.medecin),
    [medecinsData, modalState.form.medecin]
  )

  const isSelectedDoctorAbsentToday = useMemo(
    () => Boolean(modalState.form.date === todayStr && selectedMedecinInForm?.absent_aujourdhui),
    [modalState.form.date, todayStr, selectedMedecinInForm]
  )

  const totalCount = rdvData?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / 20))

  return (
    <div className="flex-1 flex flex-col">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "border border-emerald-500/30 bg-emerald-600 text-white"
              : "border border-red-500/30 bg-destructive text-white"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <RendezVousHeader
          totalCount={totalCount}
          currentUser={currentUser}
          connectedMedecinProfile={connectedMedecinProfile}
          isUpdatingPresence={updatePresenceMutation.isPending}
          onTogglePresence={(medecinId, absent) => updatePresenceMutation.mutate({ medecinId, absent })}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onOpenCreate={() =>
            modalState.handleOpenCreate(medecinsData[0]?.id.toString() || "", todayStr)
          }
        />

        <RendezVousFilters
          currentUser={currentUser}
          medecinsData={medecinsData}
          viewMode={viewMode}
          search={search}
          setSearch={setSearch}
          statutFilter={statutFilter}
          setStatutFilter={setStatutFilter}
          medecinFilter={medecinFilter}
          setMedecinFilter={setMedecinFilter}
          dateFilterMode={dateFilterMode}
          setDateFilterMode={setDateFilterMode}
          singleDate={singleDate}
          setSingleDate={setSingleDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onResetPage={() => setCurrentPage(1)}
        />

        {viewMode === "list" ? (
          <RendezVousTableView
            rdvData={rdvData}
            isLoading={isLoading}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalCount={totalCount}
            totalPages={totalPages}
            currentUser={currentUser}
            todayStr={todayStr}
            onOpenConsultationOrigine={handleOpenConsultationOrigine}
            onUpdateStatus={(id, statut) => updateStatusMutation.mutate({ id, statut })}
            onEncaisserRow={handleEncaisserRow}
            onOpenConsultation={handleOpenConsultation}
            onOpenEdit={modalState.handleOpenEdit}
            onCancelRdv={(id) => cancelMutation.mutate(id)}
            onDeleteRdv={(id) => deleteMutation.mutate(id)}
          />
        ) : (
          <RendezVousCalendarView
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            todayStr={todayStr}
            medecinsData={medecinsData}
            currentUser={currentUser}
            rdvList={rdvData?.results || []}
            onSlotClick={(dateStr, timeStr, medecinId, isSlotBusy) =>
              modalState.handleSlotClick(
                dateStr,
                timeStr,
                medecinId,
                isSlotBusy,
                currentUser,
                medecinsData,
                showNotification
              )
            }
            onOpenConsultation={handleOpenConsultation}
          />
        )}
      </main>

      <RendezVousModals
        currentUser={currentUser}
        isCreateOpen={modalState.isCreateOpen}
        setIsCreateOpen={modalState.setIsCreateOpen}
        onCreateSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        isCreatePending={createMutation.isPending}
        form={modalState.form}
        setForm={modalState.setForm}
        formError={modalState.formError}
        patientsData={patientsData}
        medecinsData={medecinsData}
        selectedMedecinInForm={selectedMedecinInForm}
        isSelectedDoctorAbsentToday={isSelectedDoctorAbsentToday}
        isControleEligible={isControleEligible}
        isEditOpen={modalState.isEditOpen}
        setIsEditOpen={modalState.setIsEditOpen}
        onEditSubmit={(e) => {
          e.preventDefault()
          updateFullMutation.mutate()
        }}
        isEditPending={updateFullMutation.isPending}
        isConsultOpen={modalState.isConsultOpen}
        setIsConsultOpen={modalState.setIsConsultOpen}
        onConsultSubmit={(e) => {
          e.preventDefault()
          createConsultationMutation.mutate()
        }}
        isConsultPending={createConsultationMutation.isPending}
        selectedRdv={modalState.selectedRdv}
        consultForm={modalState.consultForm}
        setConsultForm={modalState.setConsultForm}
        todayStr={todayStr}
        isConsultReadOnlyOpen={modalState.isConsultReadOnlyOpen}
        setIsConsultReadOnlyOpen={modalState.setIsConsultReadOnlyOpen}
        existingConsultation={modalState.existingConsultation}
        isEditingConsultation={modalState.isEditingConsultation}
        setIsEditingConsultation={modalState.setIsEditingConsultation}
        editConsultForm={modalState.editConsultForm}
        setEditConsultForm={modalState.setEditConsultForm}
        onUpdateConsultation={(e) => {
          e.preventDefault()
          updateConsultationMutation.mutate()
        }}
        isUpdateConsultPending={updateConsultationMutation.isPending}
        encaissementModal={modalState.encaissementModal}
        setEncaissementModal={modalState.setEncaissementModal}
        onEncaisser={(factureId) => encaisserModalMutation.mutate(factureId)}
        isEncaisserPending={encaisserModalMutation.isPending}
        onPrintRecu={handlePrintRecu}
        onRefetchRdv={refetchRdv}
        consultationOrigineModal={modalState.consultationOrigineModal}
        setConsultationOrigineModal={modalState.setConsultationOrigineModal}
      />
    </div>
  )
}
