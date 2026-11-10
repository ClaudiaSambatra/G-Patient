export interface LigneOrdonnance {
  id?: number
  medicament: string
  dosage?: string
  forme?: string
  dose_par_prise?: string
  voie_administration?: string
  frequence?: string
  duree?: string
  instructions?: string
  ordre?: number
}

export interface OrdonnanceHistorique {
  id: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_lignes: LigneOrdonnance[]
  nouvelles_lignes: LigneOrdonnance[]
}

export interface Ordonnance {
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
  patient_allergies?: string
  patient_antecedents?: string
  medecin_id?: number
  medecin_nom: string
  medecin_specialite?: string
  medecin_numero_ordre?: string
  lignes?: LigneOrdonnance[]
  historique?: OrdonnanceHistorique[]
  medicaments: string
  posologie: string
  duree: string
  date_creation: string
  date_modification?: string
  facture_id?: number | null
  facture_statut?: string | null
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

export const VOIES_ADMINISTRATION = [
  { value: "ORALE", label: "Orale" },
  { value: "SUBLINGUALE", label: "Sublinguale" },
  { value: "INJECTABLE_IV", label: "Intraveineuse" },
  { value: "INJECTABLE_IM", label: "Intramusculaire" },
  { value: "INJECTABLE_SC", label: "Sous-cutanée" },
  { value: "CUTANEE", label: "Cutanée / Locale" },
  { value: "INHALATION", label: "Inhalation" },
  { value: "OCULAIRE", label: "Oculaire" },
  { value: "AURICULAIRE", label: "Auriculaire" },
  { value: "NASALE", label: "Nasale" },
  { value: "RECTALE", label: "Rectale" },
  { value: "AUTRE", label: "Autre" },
]

export const FORMES_PHARMACEUTIQUES = [
  "Comprimé",
  "Gélule",
  "Sirop",
  "Suspension buvable",
  "Ampoule injectable",
  "Pommade",
  "Crème",
  "Collyre",
  "Gouttes",
  "Sachet",
  "Suppositoire",
  "Aérosol",
  "Autre",
]

export const DEFAULT_LIGNE: LigneOrdonnance = {
  medicament: "",
  dosage: "",
  forme: "Comprimé",
  dose_par_prise: "1 cp",
  voie_administration: "ORALE",
  frequence: "3 fois par jour",
  duree: "5 jours",
  instructions: "",
}

export function getAge(dateNaissanceStr?: string): string {
  if (!dateNaissanceStr) return ""
  try {
    const birth = new Date(dateNaissanceStr)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? `${age} ans` : ""
  } catch {
    return ""
  }
}
