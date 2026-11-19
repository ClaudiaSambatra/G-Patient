export interface StockMedicament {
  id: number
  nom: string
  dosage: string
  forme: string
  unite: string
  libelle: string
  prix_unitaire: string
  quantite: number
  seuil_alerte: number
  en_alerte: boolean
  actif: boolean
}

export interface MouvementStock {
  id: number
  medicament: number
  medicament_libelle: string
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT"
  type_display: string
  quantite: number
  quantite_apres: number
  motif: string
  facture: number | null
  auteur_nom: string | null
  date: string
}

export interface MedicamentForm {
  nom: string
  dosage: string
  forme: string
  unite: string
  prix_unitaire: string
  seuil_alerte: string
  quantite_initiale: string
  actif: boolean
}

export const MEDICAMENT_FORM_VIDE: MedicamentForm = {
  nom: "",
  dosage: "",
  forme: "Comprimé",
  unite: "boîte",
  prix_unitaire: "",
  seuil_alerte: "10",
  quantite_initiale: "0",
  actif: true,
}

export type MouvementMode = "ENTREE" | "AJUSTEMENT"

export function formatAriary(valeur: string | number) {
  return `${Number(valeur).toLocaleString("fr-FR")} Ar`
}
