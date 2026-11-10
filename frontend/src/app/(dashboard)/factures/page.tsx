"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { CreditCard, Plus, CheckCircle2, AlertCircle } from "lucide-react"
import { Facture, Patient, RdvOption } from "@/components/factures/types"
import { FacturesFilters } from "@/components/factures/FacturesFilters"
import { FacturesTable } from "@/components/factures/FacturesTable"
import { FactureCreateModal } from "@/components/factures/FactureCreateModal"

export default function FacturesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [form, setForm] = useState({
    patient: "",
    rendez_vous: "",
    type: "CONSULTATION",
    designation: "Frais de consultation",
    montant: "20000",
  })

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  function extractErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === "object" && err !== null && "response" in err) {
      const resp = (err as { response?: { data?: Record<string, unknown> } }).response
      if (resp?.data) {
        if (resp.data.detail) return String(resp.data.detail)
        const firstKey = Object.keys(resp.data)[0]
        if (firstKey) {
          const val = resp.data[firstKey]
          return `${firstKey}: ${Array.isArray(val) ? val.join(" ") : String(val)}`
        }
      }
    }
    return fallback
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["factures", search, typeFilter, statutFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (typeFilter !== "ALL") params.append("type", typeFilter)
      if (statutFilter !== "ALL") params.append("statut", statutFilter)
      const { data } = await apiClient.get<{ results: Facture[] }>(`/billing/?${params.toString()}`)
      return (data.results || []) as Facture[]
    },
  })

  const { data: patients } = useQuery({
    queryKey: ["patients_list_for_billing"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Patient[] }>(`/patients/`)
      return (data.results || []) as Patient[]
    },
    enabled: isCreateOpen,
  })

  const { data: patientRdvs } = useQuery<RdvOption[]>({
    queryKey: ["patient_unbilled_rdvs", form.patient],
    queryFn: async () => {
      if (!form.patient) return []
      const { data } = await apiClient.get<{ results: RdvOption[] }>(
        `/appointments/?patient=${form.patient}&type=CONSULTATION&statut=PLANIFIE`
      )
      return (data.results || []).filter((r) => !r.facture)
    },
    enabled: Boolean(form.patient) && isCreateOpen,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        patient: Number(form.patient),
        type: form.type,
        designation: form.designation.trim() || "Frais de consultation",
        actes: form.designation.trim() || "Frais de consultation",
        montant: Number(form.montant) || 20000,
      }
      if (form.rendez_vous) {
        payload.rendez_vous = Number(form.rendez_vous)
      }
      return apiClient.post("/billing/", payload)
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({
        patient: "",
        rendez_vous: "",
        type: "CONSULTATION",
        designation: "Frais de consultation",
        montant: "20000",
      })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      showNotification("success", "Facture enregistrée avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de la facture.")
      showNotification("error", msg)
    },
  })

  const encaisserMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        return await apiClient.post(`/billing/factures/${id}/encaisser/`)
      } catch {
        return await apiClient.post(`/billing/${id}/encaisser/`)
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      refetch()
      showNotification("success", "Facture encaissée avec succès. Le rendez-vous associé est confirmé.")
      handlePrintRecu(id)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Impossible d'encaisser cette facture.")
      showNotification("error", msg)
    },
  })

  function handlePrintRecu(factureId: number) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api"
    const recuUrl = `${baseURL}/billing/factures/${factureId}/recu/${token ? `?token=${encodeURIComponent(token)}` : ""}`
    window.open(recuUrl, "_blank")
  }

  const handleOpenCreateModal = () => {
    setForm({
      patient: "",
      rendez_vous: "",
      type: "CONSULTATION",
      designation: "Frais de consultation",
      montant: "20000",
    })
    setIsCreateOpen(true)
  }

  const isSecretaireOrAdmin =
    currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
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
              <CreditCard className="size-7 text-primary" />
              Facturation &amp; Règlements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivi des paiements, encaissement et impression des reçus officiels
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isSecretaireOrAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="size-4.5" />
                <span>Nouvelle Facture</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtres par recherche, type et statut */}
        <FacturesFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statutFilter={statutFilter}
          onStatutFilterChange={setStatutFilter}
        />

        {/* Tableau du registre des factures */}
        <FacturesTable
          data={data}
          isLoading={isLoading}
          isSecretaireOrAdmin={Boolean(isSecretaireOrAdmin)}
          isPendingEncaisser={encaisserMutation.isPending}
          onEncaisser={(id) => encaisserMutation.mutate(id)}
          onPrintRecu={handlePrintRecu}
        />
      </main>

      {/* Modal Création Facture Manuelle */}
      <FactureCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={() => createMutation.mutate()}
        isPending={createMutation.isPending}
        form={form}
        setForm={setForm}
        patients={patients}
        patientRdvs={patientRdvs}
      />
    </div>
  )
}
