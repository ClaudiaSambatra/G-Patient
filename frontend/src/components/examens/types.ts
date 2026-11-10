export interface LigneDemandeExamen {
  id?: number
  nom_examen: string
  categorie: "BIOLOGIE" | "IMAGERIE" | "AUTRE"
  categorie_display?: string
  instructions?: string
  ordre?: number
}

export interface DemandeExamenHistorique {
  id: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_lignes: LigneDemandeExamen[]
  nouvelles_lignes: LigneDemandeExamen[]
}

export interface DemandeExamen {
  id: number
  numero: string
  statut: "ACTIVE" | "MODIFIEE" | "ANNULEE"
  consultation: number
  patient?: number
  patient_id?: number
  patient_nom: string
  patient_prenom: string
  patient_date_naissance?: string
  patient_contact?: string
  medecin_id?: number
  medecin_nom: string
  medecin_specialite?: string
  medecin_numero_ordre?: string
  renseignements_cliniques?: string
  lignes?: LigneDemandeExamen[]
  historique?: DemandeExamenHistorique[]
  date_creation: string
  date_modification?: string
}

export interface Consultation {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  medecin: number
  medecin_nom: string
  motif: string
  date_consultation: string
}

export const CATEGORIES_EXAMEN = [
  { value: "BIOLOGIE", label: "Analyse biologique / Laboratoire", icon: "🔬" },
  { value: "IMAGERIE", label: "Imagerie médicale / Radiologie", icon: "🩻" },
  { value: "AUTRE", label: "Autre examen / Exploration", icon: "📋" },
] as const

export const DEFAULT_LIGNE_EXAMEN: LigneDemandeExamen = {
  nom_examen: "",
  categorie: "BIOLOGIE",
  instructions: "",
}

export function getAge(dateNaissanceStr?: string): string {
  if (!dateNaissanceStr) return ""
  const birthDate = new Date(dateNaissanceStr)
  if (isNaN(birthDate.getTime())) return ""
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return `${age} ans`
}

export interface ExamenStats {
  total: number
  actives: number
  modifiees: number
  annulees: number
  countBio: number
  countImg: number
  countAutre: number
  countDemandesBio: number
  countDemandesImg: number
  countDemandesAutre: number
}

export function computeExamenStats(allDemandes: DemandeExamen[]): ExamenStats {
  const total = allDemandes.length
  const actives = allDemandes.filter((d) => d.statut === "ACTIVE").length
  const modifiees = allDemandes.filter((d) => d.statut === "MODIFIEE").length
  const annulees = allDemandes.filter((d) => d.statut === "ANNULEE").length

  let countBio = 0
  let countImg = 0
  let countAutre = 0
  let countDemandesBio = 0
  let countDemandesImg = 0
  let countDemandesAutre = 0

  allDemandes.forEach((d) => {
    const hasBio = d.lignes?.some((l) => l.categorie === "BIOLOGIE")
    const hasImg = d.lignes?.some((l) => l.categorie === "IMAGERIE")
    const hasAutre = d.lignes?.some((l) => l.categorie === "AUTRE")

    if (hasBio) countDemandesBio++
    if (hasImg) countDemandesImg++
    if (hasAutre) countDemandesAutre++

    d.lignes?.forEach((l) => {
      if (l.categorie === "BIOLOGIE") countBio++
      else if (l.categorie === "IMAGERIE") countImg++
      else countAutre++
    })
  })

  return {
    total,
    actives,
    modifiees,
    annulees,
    countBio,
    countImg,
    countAutre,
    countDemandesBio,
    countDemandesImg,
    countDemandesAutre,
  }
}

export function filterDemandes(
  allDemandes: DemandeExamen[],
  search: string,
  filterStatut: string,
  filterCategorie: string
): DemandeExamen[] {
  return allDemandes.filter((demande) => {
    if (filterStatut !== "ALL" && demande.statut !== filterStatut) return false
    if (filterCategorie !== "ALL") {
      const hasCategory = demande.lignes?.some(
        (l) => l.categorie === filterCategorie
      )
      if (!hasCategory) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const matchNum = demande.numero?.toLowerCase().includes(q)
      const matchPatientNom = demande.patient_nom?.toLowerCase().includes(q)
      const matchPatientPrenom = demande.patient_prenom?.toLowerCase().includes(q)
      const matchMedecin = demande.medecin_nom?.toLowerCase().includes(q)
      const matchLignes = demande.lignes?.some(
        (l) =>
          l.nom_examen.toLowerCase().includes(q) ||
          l.instructions?.toLowerCase().includes(q)
      )
      const matchRenseignements =
        demande.renseignements_cliniques?.toLowerCase().includes(q)
      if (
        !matchNum &&
        !matchPatientNom &&
        !matchPatientPrenom &&
        !matchMedecin &&
        !matchLignes &&
        !matchRenseignements
      ) {
        return false
      }
    }
    return true
  })
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: unknown } }).response
    if (res?.data) {
      if (typeof res.data === "string") return res.data
      if (typeof res.data === "object") {
        const values = Object.values(res.data)
        if (values.length > 0) {
          const first = values[0]
          if (Array.isArray(first) && first.length > 0) return String(first[0])
          if (typeof first === "string") return first
        }
      }
    }
  }
  return fallback
}
