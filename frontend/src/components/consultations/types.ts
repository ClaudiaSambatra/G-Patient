export interface ConstantesVitales {
  id?: number
  temperature?: string | number | null
  poids?: string | number | null
  taille?: string | number | null
  tension_arterielle?: string | null
  frequence_cardiaque?: number | null
  date_prise?: string
}

export interface ConsultationHistoriqueItem {
  id: number
  auteur: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_valeurs: Record<string, any>
  nouvelles_valeurs: Record<string, any>
}

export interface Consultation {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  patient_date_naissance?: string
  patient_contact?: string
  patient_allergies?: string
  patient_antecedents?: string
  medecin: number
  medecin_nom: string
  rendez_vous: number | null
  date_consultation: string
  motif: string
  observations: string
  diagnostic: string
  compte_rendu?: string
  date_controle_recommandee?: string | null
  suivi_recommande?: boolean
  date_suivi_recommandee?: string | null
  motif_suivi?: string
  consultation_origine?: number | null
  consultation_origine_details?: any
  constantes?: ConstantesVitales | null
  historique?: ConsultationHistoriqueItem[]
  statut_paiement?: "PAYE" | "IMPAYE" | "GRATUIT"
  ordonnances?: any[]
  examens?: any[]
}

export interface ConsultationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Consultation[]
}

export interface EditConsultationFormState {
  motif: string
  observations: string
  diagnostic: string
  compte_rendu: string
  date_controle_recommandee: string
  suivi_recommande: boolean
  date_suivi_recommandee: string
  motif_suivi: string
  motif_correction: string
  constantes: {
    temperature: string
    poids: string
    taille: string
    tension_arterielle: string
    frequence_cardiaque: string
  }
}

export const INITIAL_EDIT_FORM: EditConsultationFormState = {
  motif: "",
  observations: "",
  diagnostic: "",
  compte_rendu: "",
  date_controle_recommandee: "",
  suivi_recommande: false,
  date_suivi_recommandee: "",
  motif_suivi: "",
  motif_correction: "",
  constantes: {
    temperature: "",
    poids: "",
    taille: "",
    tension_arterielle: "",
    frequence_cardiaque: "",
  },
}

export function consultationToEditForm(
  consultation: Consultation
): EditConsultationFormState {
  return {
    motif: consultation.motif || "",
    observations: consultation.observations || "",
    diagnostic: consultation.diagnostic || "",
    compte_rendu: consultation.compte_rendu || "",
    date_controle_recommandee: consultation.date_controle_recommandee || "",
    suivi_recommande: consultation.suivi_recommande || false,
    date_suivi_recommandee:
      consultation.date_suivi_recommandee ||
      consultation.date_controle_recommandee ||
      "",
    motif_suivi: consultation.motif_suivi || "",
    motif_correction: "",
    constantes: {
      temperature: consultation.constantes?.temperature?.toString() || "",
      poids: consultation.constantes?.poids?.toString() || "",
      taille: consultation.constantes?.taille?.toString() || "",
      tension_arterielle: consultation.constantes?.tension_arterielle || "",
      frequence_cardiaque:
        consultation.constantes?.frequence_cardiaque?.toString() || "",
    },
  }
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
          if (Array.isArray(first)) return String(first[0])
          if (typeof first === "string") return first
        }
      }
    }
  }
  return fallback
}

export function computeAge(dateStr?: string): number | null {
  if (!dateStr) return null
  const b = new Date(dateStr)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}

export function computeBMI(
  poids?: string | number | null,
  taille?: string | number | null
) {
  if (!poids || !taille) return null
  const p = typeof poids === "string" ? parseFloat(poids) : poids
  const t = typeof taille === "string" ? parseFloat(taille) : taille
  if (!p || !t || p <= 0 || t <= 0) return null
  const hM = t / 100
  const imc = p / (hM * hM)
  if (isNaN(imc) || imc <= 0) return null
  const val = Math.round(imc * 10) / 10
  let label = "Corpulence normale"
  let color =
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
  if (val < 18.5) {
    label = "Insuffisance pondérale"
    color =
      "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800"
  } else if (val >= 25 && val < 30) {
    label = "Surpoids"
    color =
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
  } else if (val >= 30) {
    label = "Obésité"
    color =
      "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
  }
  return { val, label, color }
}

export function getInitials(nom?: string, prenom?: string): string {
  const n = (nom || "").trim().charAt(0).toUpperCase()
  const p = (prenom || "").trim().charAt(0).toUpperCase()
  return `${n}${p}` || "PT"
}
