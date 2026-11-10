"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import {
  FileSignature,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  Ordonnance,
  Consultation,
  LigneOrdonnance,
  DEFAULT_LIGNE,
} from "@/components/ordonnances/types"
import { handlePrintOrdonnance } from "@/components/ordonnances/printOrdonnance"
import { OrdonnanceFilters } from "@/components/ordonnances/OrdonnanceFilters"
import { OrdonnancesTable } from "@/components/ordonnances/OrdonnancesTable"
import { OrdonnanceCreateModal } from "@/components/ordonnances/OrdonnanceCreateModal"
import { OrdonnanceEditModal } from "@/components/ordonnances/OrdonnanceEditModal"
import { OrdonnanceHistoryModal } from "@/components/ordonnances/OrdonnanceHistoryModal"
import { OrdonnanceCancelModal } from "@/components/ordonnances/OrdonnanceCancelModal"
import { useOrdonnanceMutations } from "@/components/ordonnances/useOrdonnanceMutations"

export default function OrdonnancesPage() {
  const [search, setSearch] = useState("")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    ordonnance: Ordonnance | null
    motif: string
  }>({
    isOpen: false,
    ordonnance: null,
    motif: "",
  })
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean
    ordonnance: Ordonnance | null
  }>({
    isOpen: false,
    ordonnance: null,
  })
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    ordonnance: Ordonnance | null
    motif: string
  }>({
    isOpen: false,
    ordonnance: null,
    motif: "",
  })
  const [expandedOrdId, setExpandedOrdId] = useState<number | null>(null)

  // Dynamic lines state
  const [formConsultation, setFormConsultation] = useState("")
  const [formLignes, setFormLignes] = useState<LigneOrdonnance[]>([{ ...DEFAULT_LIGNE }])

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
    queryKey: ["ordonnances", search],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Ordonnance[] }>(`/prescriptions/`)
      return (data.results || []) as Ordonnance[]
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] }>(
        `/consultations/?page_size=100`
      )
      return (data.results || []) as Consultation[]
    },
    enabled: isCreateOpen,
  })

  const addLine = () => setFormLignes((prev) => [...prev, { ...DEFAULT_LIGNE }])

  const updateLine = (index: number, field: keyof LigneOrdonnance, value: string) => {
    setFormLignes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeLine = (index: number) => {
    if (formLignes.length <= 1) return
    setFormLignes((prev) => prev.filter((_, i) => i !== index))
  }

  const { createMutation, updateMutation, cancelMutation } = useOrdonnanceMutations({
    showNotification,
    formConsultation,
    setFormConsultation,
    formLignes,
    setFormLignes,
    defaultLigne: DEFAULT_LIGNE,
    setIsCreateOpen,
    editModal,
    setEditModal,
    cancelModal,
    setCancelModal,
  })

  const isDoctor = currentUser?.role === "MEDECIN"

  const filteredOrdonnances = (data || []).filter((ord) => {
    if (statutFilter !== "ALL" && ord.statut !== statutFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      ord.numero?.toLowerCase().includes(q) ||
      ord.patient_nom?.toLowerCase().includes(q) ||
      ord.patient_prenom?.toLowerCase().includes(q) ||
      ord.medecin_nom?.toLowerCase().includes(q) ||
      ord.medicaments?.toLowerCase().includes(q)
    )
  })

  const openEditModal = (ord: Ordonnance) => {
    setEditModal({ isOpen: true, ordonnance: ord, motif: "" })
    if (ord.lignes && ord.lignes.length > 0) {
      setFormLignes(ord.lignes.map((l) => ({ ...l })))
    } else {
      setFormLignes([
        {
          medicament: ord.medicaments || "",
          dosage: "",
          forme: "Comprimé",
          dose_par_prise: "1 cp",
          voie_administration: "ORALE",
          frequence: ord.posologie || "3 fois par jour",
          duree: ord.duree || "5 jours",
          instructions: "",
        },
      ])
    }
  }

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
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <FileSignature className="size-7 text-primary" />
              Ordonnances Médicales
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prescriptions sécurisées, lignes structurées, traçabilité des modifications et impression A4
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {(isDoctor || currentUser?.role === "ADMIN") && (
              <button
                onClick={() => {
                  setFormConsultation("")
                  setFormLignes([{ ...DEFAULT_LIGNE }])
                  setIsCreateOpen(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="size-4.5" />
                <span>Créer une ordonnance</span>
              </button>
            )}
          </div>
        </div>

        <OrdonnanceFilters
          search={search}
          onSearchChange={setSearch}
          statutFilter={statutFilter}
          onStatutChange={setStatutFilter}
        />

        <OrdonnancesTable
          filteredOrdonnances={filteredOrdonnances}
          isLoading={isLoading}
          expandedOrdId={expandedOrdId}
          setExpandedOrdId={setExpandedOrdId}
          isDoctor={isDoctor}
          currentUserId={currentUser?.id}
          onPrint={handlePrintOrdonnance}
          onOpenHistory={(ord) => setHistoryModal({ isOpen: true, ordonnance: ord })}
          onOpenEdit={openEditModal}
          onOpenCancel={(ord) => setCancelModal({ isOpen: true, ordonnance: ord, motif: "" })}
        />
      </main>

      <OrdonnanceCreateModal
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
        formLignes={formLignes}
        onAddLine={addLine}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
      />

      <OrdonnanceEditModal
        isOpen={editModal.isOpen}
        ordonnance={editModal.ordonnance}
        motif={editModal.motif}
        setMotif={(m) => setEditModal((curr) => ({ ...curr, motif: m }))}
        onClose={() => setEditModal({ isOpen: false, ordonnance: null, motif: "" })}
        onSubmit={(e) => {
          e.preventDefault()
          updateMutation.mutate()
        }}
        isPending={updateMutation.isPending}
        formLignes={formLignes}
        onAddLine={addLine}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
      />

      <OrdonnanceHistoryModal
        isOpen={historyModal.isOpen}
        ordonnance={historyModal.ordonnance}
        onClose={() => setHistoryModal({ isOpen: false, ordonnance: null })}
      />

      <OrdonnanceCancelModal
        isOpen={cancelModal.isOpen}
        ordonnance={cancelModal.ordonnance}
        motif={cancelModal.motif}
        setMotif={(m) => setCancelModal((curr) => ({ ...curr, motif: m }))}
        onClose={() => setCancelModal({ isOpen: false, ordonnance: null, motif: "" })}
        onSubmit={(e) => {
          e.preventDefault()
          cancelMutation.mutate()
        }}
        isPending={cancelMutation.isPending}
      />
    </div>
  )
}
