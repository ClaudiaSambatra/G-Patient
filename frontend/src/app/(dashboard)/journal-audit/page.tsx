"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList, RefreshCw, Search, ShieldAlert } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"

interface EntreeJournal {
  id: number
  date: string
  utilisateur: number | null
  nom_utilisateur: string
  role: string
  action: string
  action_display: string
  ressource: string
  objet_id: string
  methode: string
  chemin: string
  statut: number
  reussie: boolean
  adresse_ip: string | null
  agent: string
}

interface JournalResponse {
  count: number
  next: string | null
  previous: string | null
  results: EntreeJournal[]
}

const ACTIONS = [
  { valeur: "", libelle: "Toutes les actions" },
  { valeur: "CONNEXION", libelle: "Connexions" },
  { valeur: "ECHEC_CONNEXION", libelle: "Échecs de connexion" },
  { valeur: "MOT_DE_PASSE", libelle: "Mot de passe oublié" },
  { valeur: "CONSULTATION", libelle: "Consultations de dossiers" },
  { valeur: "CREATION", libelle: "Créations" },
  { valeur: "MODIFICATION", libelle: "Modifications" },
  { valeur: "SUPPRESSION", libelle: "Suppressions" },
]

const COULEURS_ACTION: Record<string, string> = {
  CONNEXION: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ECHEC_CONNEXION: "bg-red-500/15 text-red-700 dark:text-red-300",
  MOT_DE_PASSE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONSULTATION: "bg-muted text-foreground",
  CREATION: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MODIFICATION: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  SUPPRESSION: "bg-red-500/15 text-red-700 dark:text-red-300",
}

const champ =
  "h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"

export default function JournalAuditPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [recherche, setRecherche] = useState("")
  const [du, setDu] = useState("")
  const [au, setAu] = useState("")
  const [echecs, setEchecs] = useState(false)

  // Tout changement de filtre ramène à la première page
  function filtrer<T>(appliquer: (valeur: T) => void) {
    return (valeur: T) => {
      appliquer(valeur)
      setPage(1)
    }
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/accounts/me/")).data,
    retry: false,
  })
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser

  const { data, isLoading, isError, refetch, isFetching } = useQuery<JournalResponse>({
    queryKey: ["journal-audit", page, action, recherche, du, au, echecs],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) })
      if (action) params.append("action", action)
      if (recherche) params.append("search", recherche)
      if (du) params.append("du", du)
      if (au) params.append("au", au)
      if (echecs) params.append("echecs", "1")
      return (await apiClient.get<JournalResponse>(`/audit/?${params.toString()}`)).data
    },
    enabled: Boolean(isAdmin),
    retry: false,
  })

  if (currentUser && !isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 shadow-sm text-center max-w-md">
          <ShieldAlert className="mx-auto size-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground">Accès restreint</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Le journal d&apos;audit est strictement réservé aux Administrateurs du système.
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary dark:text-accent">
              <ClipboardList className="size-3.5" />
              <span>Administration &amp; Sécurité</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-3">
              Journal d&apos;audit
              <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {data?.count ?? 0} entrées
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Qui a consulté, créé, modifié ou supprimé quoi, quand et depuis quelle adresse. Les entrées ne sont pas modifiables.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-xs flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              id="input-search-audit"
              placeholder="Utilisateur, adresse de l'API, IP..."
              value={recherche}
              onChange={(e) => filtrer(setRecherche)(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={action} onChange={(e) => filtrer(setAction)(e.target.value)} className={`${champ} cursor-pointer`}>
              {ACTIONS.map((a) => (
                <option key={a.valeur} value={a.valeur}>{a.libelle}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Du <input type="date" value={du} onChange={(e) => filtrer(setDu)(e.target.value)} className={champ} />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              au <input type="date" value={au} onChange={(e) => filtrer(setAu)(e.target.value)} className={champ} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
              <input type="checkbox" checked={echecs} onChange={(e) => filtrer(setEchecs)(e.target.checked)} />
              Refus et erreurs seulement
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" id="table-audit">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 pl-6 pr-4">Date</th>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Ressource</th>
                  <th className="py-3.5 px-4">Résultat</th>
                  <th className="py-3.5 pl-4 pr-6">Adresse IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto size-6 animate-spin mb-2 text-primary" />
                      Chargement du journal…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-destructive">
                      Impossible de charger le journal (vérifiez les dates saisies).
                    </td>
                  </tr>
                ) : data?.results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <ClipboardList className="mx-auto size-10 mb-2 opacity-40" />
                      <p className="font-medium text-foreground">Aucune entrée</p>
                      <p className="text-xs mt-1">Modifiez vos critères de recherche.</p>
                    </td>
                  </tr>
                ) : (
                  data?.results.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-muted/30" title={e.agent}>
                      <td className="py-3 pl-6 pr-4 whitespace-nowrap text-muted-foreground">
                        {new Date(e.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{e.nom_utilisateur || "anonyme"}</div>
                        {e.role && <div className="text-[11px] text-muted-foreground">{e.role}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${COULEURS_ACTION[e.action] ?? "bg-muted"}`}>
                          {e.action_display}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground">
                          {e.ressource || "—"}
                          {e.objet_id && <span className="text-muted-foreground"> #{e.objet_id}</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-xs" title={e.chemin}>
                          {e.methode} {e.chemin}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold ${e.reussie ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {e.reussie ? "Réussie" : "Refusée"} ({e.statut})
                        </span>
                      </td>
                      <td className="py-3 pl-4 pr-6 font-mono text-xs text-muted-foreground">{e.adresse_ip ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-4 text-sm text-muted-foreground border-t border-border/40">
            <div>Page {page}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data?.previous}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data?.next}>
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
