export interface MedecinOption {
  id: number
  nom: string
  prenom: string
  specialite: string
  absent_aujourdhui: boolean
}

export interface Horaire {
  id: number
  medecin: number
  jour: number
  jour_display: string
  heure_debut: string
  heure_fin: string
}

export interface Absence {
  id: number
  medecin: number
  medecin_nom: string
  date_debut: string
  date_fin: string
  type: "CONGE" | "FORMATION" | "MALADIE" | "AUTRE"
  type_display: string
  motif: string
  nb_rdv_concernes: number
}

export interface RdvAReaffecter {
  id: number
  date_heure: string
  patient_nom: string
  medecin_id: number
  medecin_nom: string
  medecin_specialite: string
  type: string
  motif: string
  raison: string
}

export interface Remplacant {
  id: number
  nom: string
  specialite: string
  meme_specialite: boolean
}

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

export const TYPES_ABSENCE = [
  { value: "CONGE", label: "Congé" },
  { value: "FORMATION", label: "Formation" },
  { value: "MALADIE", label: "Maladie" },
  { value: "AUTRE", label: "Autre" },
]

export function messageErreur(err: unknown, defaut: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!data) return defaut
  if (data.detail) return String(data.detail)
  const valeurs = Object.values(data).flat()
  return valeurs.length ? valeurs.map(String).join(" ") : defaut
}

export const formatDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

// Date du jour au format AAAA-MM-JJ dans le fuseau du navigateur (toISOString donnerait la date UTC)
export function aujourdhuiISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
