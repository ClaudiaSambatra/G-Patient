"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Package, Plus, Search } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { StockTable } from "@/components/stocks/StockTable"
import { MedicamentFormModal } from "@/components/stocks/MedicamentFormModal"
import { MouvementModal } from "@/components/stocks/MouvementModal"
import { HistoriqueModal } from "@/components/stocks/HistoriqueModal"
import {
  MEDICAMENT_FORM_VIDE,
  MedicamentForm,
  MouvementMode,
  StockMedicament,
} from "@/components/stocks/types"

function messageErreur(err: unknown, defaut: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!data) return defaut
  if (data.detail) return String(data.detail)
  const [champ, valeur] = Object.entries(data)[0] || []
  return champ ? `${champ} : ${Array.isArray(valeur) ? valeur.join(" ") : String(valeur)}` : defaut
}

export default function StocksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [alerteSeulement, setAlerteSeulement] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [form, setForm] = useState<MedicamentForm>(MEDICAMENT_FORM_VIDE)
  const [enEdition, setEnEdition] = useState<StockMedicament | null>(null)

  const [mouvement, setMouvement] = useState<{ mode: MouvementMode; med: StockMedicament } | null>(null)
  const [mvtQuantite, setMvtQuantite] = useState("")
  const [mvtMotif, setMvtMotif] = useState("")

  const [historique, setHistorique] = useState<StockMedicament | null>(null)

  function notifier(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification((c) => (c?.message === message ? null : c)), 5000)
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/accounts/me/")).data,
  })
  const canManage =
    currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || Boolean(currentUser?.is_superuser)

  const { data, isLoading } = useQuery({
    queryKey: ["stocks", search, alerteSeulement],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "200" })
      if (search) params.append("search", search)
      if (alerteSeulement) params.append("alerte", "1")
      const { data } = await apiClient.get<{ results: StockMedicament[] }>(`/stocks/medicaments/?${params}`)
      return data.results || []
    },
  })

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["stocks"] })
    queryClient.invalidateQueries({ queryKey: ["stock-mouvements"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
  }

  const enregistrerMedicament = useMutation({
    mutationFn: async () => {
      const payload = {
        nom: form.nom.trim(),
        dosage: form.dosage.trim(),
        forme: form.forme,
        unite: form.unite.trim() || "boîte",
        prix_unitaire: form.prix_unitaire,
        seuil_alerte: Number(form.seuil_alerte) || 0,
        actif: form.actif,
      }
      if (formMode === "edit" && enEdition) {
        return apiClient.patch(`/stocks/medicaments/${enEdition.id}/`, payload)
      }
      return apiClient.post("/stocks/medicaments/", { ...payload, quantite_initiale: Number(form.quantite_initiale) || 0 })
    },
    onSuccess: () => {
      notifier("success", formMode === "edit" ? "Médicament modifié." : "Médicament ajouté au stock.")
      setFormMode(null)
      rafraichir()
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible d'enregistrer le médicament.")),
  })

  const enregistrerMouvement = useMutation({
    mutationFn: async () => {
      if (!mouvement) return
      const { mode, med } = mouvement
      if (mode === "ENTREE") {
        return apiClient.post(`/stocks/medicaments/${med.id}/entree/`, { quantite: Number(mvtQuantite), motif: mvtMotif })
      }
      return apiClient.post(`/stocks/medicaments/${med.id}/ajustement/`, {
        quantite_reelle: Number(mvtQuantite),
        motif: mvtMotif,
      })
    },
    onSuccess: () => {
      notifier("success", mouvement?.mode === "ENTREE" ? "Réception enregistrée." : "Inventaire enregistré.")
      setMouvement(null)
      rafraichir()
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible d'enregistrer le mouvement.")),
  })

  const ouvrirCreation = () => {
    setForm(MEDICAMENT_FORM_VIDE)
    setEnEdition(null)
    setFormMode("create")
  }

  const ouvrirEdition = (med: StockMedicament) => {
    setForm({
      nom: med.nom,
      dosage: med.dosage,
      forme: med.forme || "Comprimé",
      unite: med.unite,
      prix_unitaire: String(Number(med.prix_unitaire)),
      seuil_alerte: String(med.seuil_alerte),
      quantite_initiale: "0",
      actif: med.actif,
    })
    setEnEdition(med)
    setFormMode("edit")
  }

  const ouvrirMouvement = (mode: MouvementMode, med: StockMedicament) => {
    setMvtQuantite(mode === "AJUSTEMENT" ? String(med.quantite) : "")
    setMvtMotif("")
    setMouvement({ mode, med })
  }

  const nbAlertes = data?.filter((m) => m.actif && m.en_alerte).length ?? 0

  return (
    <div className="flex flex-1 flex-col">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${
            notification.type === "success" ? "bg-emerald-600" : "bg-destructive"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground sm:text-3xl">
              <Package className="size-7 text-primary" />
              Pharmacie &amp; stocks
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Médicaments délivrés par le cabinet : le stock baisse automatiquement à l&apos;encaissement des factures
              médicaments.
            </p>
          </div>
          {canManage && (
            <button
              onClick={ouvrirCreation}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Nouveau médicament
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un médicament…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setAlerteSeulement((v) => !v)}
            className={`h-10 rounded-lg border px-4 text-sm font-medium ${
              alerteSeulement
                ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            À commander{!alerteSeulement && nbAlertes > 0 ? ` (${nbAlertes})` : ""}
          </button>
        </div>

        <StockTable
          data={data}
          isLoading={isLoading}
          canManage={canManage}
          onEntree={(m) => ouvrirMouvement("ENTREE", m)}
          onAjustement={(m) => ouvrirMouvement("AJUSTEMENT", m)}
          onEdit={ouvrirEdition}
          onHistorique={setHistorique}
        />
      </main>

      {formMode && (
        <MedicamentFormModal
          mode={formMode}
          form={form}
          setForm={setForm}
          onClose={() => setFormMode(null)}
          onSubmit={() => enregistrerMedicament.mutate()}
          isPending={enregistrerMedicament.isPending}
        />
      )}
      {mouvement && (
        <MouvementModal
          mode={mouvement.mode}
          medicament={mouvement.med}
          quantite={mvtQuantite}
          setQuantite={setMvtQuantite}
          motif={mvtMotif}
          setMotif={setMvtMotif}
          onClose={() => setMouvement(null)}
          onSubmit={() => enregistrerMouvement.mutate()}
          isPending={enregistrerMouvement.isPending}
        />
      )}
      {historique && <HistoriqueModal medicament={historique} onClose={() => setHistorique(null)} />}
    </div>
  )
}
