"use client"

import { CurrentUser } from "@/components/sidebar"
import {
  Patient,
  Medecin,
  RendezVous,
  ConsultationData,
  RdvFormState,
  ConsultFormState,
  EditConsultFormState,
  EncaissementModalState,
  ConsultationOrigineModalState,
} from "./types"
import { RendezVousCreateModal } from "./RendezVousCreateModal"
import { RendezVousEditModal } from "./RendezVousEditModal"
import { RendezVousConsultationCreateModal } from "./RendezVousConsultationCreateModal"
import { RendezVousConsultationDetailModal } from "./RendezVousConsultationDetailModal"
import { RendezVousEncaissementModal } from "./RendezVousEncaissementModal"
import { RendezVousConsultationOrigineModal } from "./RendezVousConsultationOrigineModal"

interface RendezVousModalsProps {
  currentUser?: CurrentUser
  isCreateOpen: boolean
  setIsCreateOpen: (v: boolean) => void
  onCreateSubmit: (e: React.FormEvent) => void
  isCreatePending: boolean
  form: RdvFormState
  setForm: React.Dispatch<React.SetStateAction<RdvFormState>>
  formError: string | null
  patientsData: Patient[]
  medecinsData: Medecin[]
  selectedMedecinInForm?: Medecin
  isSelectedDoctorAbsentToday: boolean
  isControleEligible: boolean
  isEditOpen: boolean
  setIsEditOpen: (v: boolean) => void
  onEditSubmit: (e: React.FormEvent) => void
  isEditPending: boolean
  isConsultOpen: boolean
  setIsConsultOpen: (v: boolean) => void
  onConsultSubmit: (e: React.FormEvent) => void
  isConsultPending: boolean
  selectedRdv: RendezVous | null
  consultForm: ConsultFormState
  setConsultForm: React.Dispatch<React.SetStateAction<ConsultFormState>>
  todayStr: string
  isConsultReadOnlyOpen: boolean
  setIsConsultReadOnlyOpen: (v: boolean) => void
  existingConsultation: ConsultationData | null
  isEditingConsultation: boolean
  setIsEditingConsultation: (v: boolean) => void
  editConsultForm: EditConsultFormState
  setEditConsultForm: React.Dispatch<React.SetStateAction<EditConsultFormState>>
  onUpdateConsultation: (e: React.FormEvent) => void
  isUpdateConsultPending: boolean
  encaissementModal: EncaissementModalState | null
  setEncaissementModal: (v: EncaissementModalState | null) => void
  onEncaisser: (factureId: number) => void
  isEncaisserPending: boolean
  onPrintRecu: (factureId: number) => void
  onRefetchRdv: () => void
  consultationOrigineModal: ConsultationOrigineModalState
  setConsultationOrigineModal: (v: ConsultationOrigineModalState) => void
}

export function RendezVousModals({
  currentUser,
  isCreateOpen,
  setIsCreateOpen,
  onCreateSubmit,
  isCreatePending,
  form,
  setForm,
  formError,
  patientsData,
  medecinsData,
  selectedMedecinInForm,
  isSelectedDoctorAbsentToday,
  isControleEligible,
  isEditOpen,
  setIsEditOpen,
  onEditSubmit,
  isEditPending,
  isConsultOpen,
  setIsConsultOpen,
  onConsultSubmit,
  isConsultPending,
  selectedRdv,
  consultForm,
  setConsultForm,
  todayStr,
  isConsultReadOnlyOpen,
  setIsConsultReadOnlyOpen,
  existingConsultation,
  isEditingConsultation,
  setIsEditingConsultation,
  editConsultForm,
  setEditConsultForm,
  onUpdateConsultation,
  isUpdateConsultPending,
  encaissementModal,
  setEncaissementModal,
  onEncaisser,
  isEncaisserPending,
  onPrintRecu,
  onRefetchRdv,
  consultationOrigineModal,
  setConsultationOrigineModal,
}: RendezVousModalsProps) {
  return (
    <>
      <RendezVousCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={onCreateSubmit}
        isPending={isCreatePending}
        form={form}
        setForm={setForm}
        formError={formError}
        patientsData={patientsData}
        medecinsData={medecinsData}
        selectedMedecinInForm={selectedMedecinInForm}
        isSelectedDoctorAbsentToday={isSelectedDoctorAbsentToday}
        isControleEligible={isControleEligible}
      />

      <RendezVousEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={onEditSubmit}
        isPending={isEditPending}
        form={form}
        setForm={setForm}
        formError={formError}
        patientsData={patientsData}
        medecinsData={medecinsData}
        isSelectedDoctorAbsentToday={isSelectedDoctorAbsentToday}
      />

      <RendezVousConsultationCreateModal
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
        onSubmit={onConsultSubmit}
        isPending={isConsultPending}
        selectedRdv={selectedRdv}
        consultForm={consultForm}
        setConsultForm={setConsultForm}
        todayStr={todayStr}
      />

      <RendezVousConsultationDetailModal
        isOpen={isConsultReadOnlyOpen}
        onClose={() => {
          setIsConsultReadOnlyOpen(false)
          setIsEditingConsultation(false)
        }}
        currentUser={currentUser}
        existingConsultation={existingConsultation}
        isEditingConsultation={isEditingConsultation}
        setIsEditingConsultation={setIsEditingConsultation}
        editConsultForm={editConsultForm}
        setEditConsultForm={setEditConsultForm}
        onUpdateConsultation={onUpdateConsultation}
        isUpdatePending={isUpdateConsultPending}
      />

      <RendezVousEncaissementModal
        modalState={encaissementModal}
        onClose={() => setEncaissementModal(null)}
        onEncaisser={onEncaisser}
        isEncaisserPending={isEncaisserPending}
        onPrintRecu={onPrintRecu}
        onRefetch={onRefetchRdv}
      />

      <RendezVousConsultationOrigineModal
        modalState={consultationOrigineModal}
        onClose={() =>
          setConsultationOrigineModal({ isOpen: false, consultation: null, ordonnances: [], loading: false })
        }
      />
    </>
  )
}
