"use client"

import { useState } from "react"
import { CurrentUser } from "@/components/sidebar"
import {
  Medecin,
  RendezVous,
  ConsultationData,
  RdvFormState,
  ConsultFormState,
  EditConsultFormState,
  EncaissementModalState,
  ConsultationOrigineModalState,
} from "./types"

const INITIAL_RDV_FORM: RdvFormState = {
  patient: "",
  medecin: "",
  date: "",
  heure: "",
  type: "CONSULTATION",
  motif: "",
}

const INITIAL_CONSULT_FORM: ConsultFormState = {
  motif: "",
  observations: "",
  diagnostic: "",
  compte_rendu: "",
  date_controle_recommandee: "",
  constantes: { temperature: "", poids: "", taille: "", tension_arterielle: "", frequence_cardiaque: "" },
}

const INITIAL_EDIT_CONSULT_FORM: EditConsultFormState = {
  ...INITIAL_CONSULT_FORM,
  motif_correction: "",
}

export function useRendezVousModalState() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isConsultOpen, setIsConsultOpen] = useState(false)
  const [isConsultReadOnlyOpen, setIsConsultReadOnlyOpen] = useState(false)
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null)
  const [existingConsultation, setExistingConsultation] = useState<ConsultationData | null>(null)
  const [isEditingConsultation, setIsEditingConsultation] = useState(false)

  const [form, setForm] = useState<RdvFormState>(INITIAL_RDV_FORM)
  const [consultForm, setConsultForm] = useState<ConsultFormState>(INITIAL_CONSULT_FORM)
  const [editConsultForm, setEditConsultForm] = useState<EditConsultFormState>(INITIAL_EDIT_CONSULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const [encaissementModal, setEncaissementModal] = useState<EncaissementModalState | null>(null)
  const [consultationOrigineModal, setConsultationOrigineModal] = useState<ConsultationOrigineModalState>({
    isOpen: false,
    consultation: null,
    ordonnances: [],
    loading: false,
  })

  const handleOpenCreate = (defaultMedecinId: string, todayStr: string) => {
    setForm({
      patient: "",
      medecin: defaultMedecinId,
      date: todayStr,
      heure: "09:00",
      type: "CONSULTATION",
      motif: "",
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (rdv: RendezVous) => {
    setSelectedRdv(rdv)
    const dateObj = new Date(rdv.date_heure)
    const localDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`
    setForm({
      patient: rdv.patient.toString(),
      medecin: rdv.medecin.toString(),
      date: localDateStr,
      heure: dateObj.toTimeString().slice(0, 5),
      type: rdv.type || "CONSULTATION",
      motif: rdv.motif || "",
    })
    setFormError(null)
    setIsEditOpen(true)
  }

  const handleSlotClick = (
    dateStr: string,
    timeStr: string,
    medecinId: number | undefined,
    isSlotBusy: boolean | undefined,
    currentUser: CurrentUser | undefined,
    medecinsData: Medecin[],
    showNotification: (type: "success" | "error", message: string) => void
  ) => {
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "SECRETAIRE") return
    if (isSlotBusy) {
      showNotification(
        "error",
        "Ce créneau a déjà un rendez-vous à cette heure exacte. Impossible de planifier deux rendez-vous à la même heure."
      )
      return
    }
    setForm({
      patient: "",
      medecin: medecinId ? medecinId.toString() : medecinsData[0]?.id.toString() || "",
      date: dateStr,
      heure: timeStr,
      type: "CONSULTATION",
      motif: "",
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  return {
    isCreateOpen,
    setIsCreateOpen,
    isEditOpen,
    setIsEditOpen,
    isConsultOpen,
    setIsConsultOpen,
    isConsultReadOnlyOpen,
    setIsConsultReadOnlyOpen,
    selectedRdv,
    setSelectedRdv,
    existingConsultation,
    setExistingConsultation,
    isEditingConsultation,
    setIsEditingConsultation,
    form,
    setForm,
    consultForm,
    setConsultForm,
    editConsultForm,
    setEditConsultForm,
    formError,
    setFormError,
    encaissementModal,
    setEncaissementModal,
    consultationOrigineModal,
    setConsultationOrigineModal,
    handleOpenCreate,
    handleOpenEdit,
    handleSlotClick,
  }
}
