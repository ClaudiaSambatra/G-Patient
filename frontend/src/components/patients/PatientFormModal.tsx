import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UserPlus, Edit3, XCircle } from "lucide-react"
import { GroupesSanguins } from "./types"

interface PatientFormData {
  nom: string
  prenom: string
  sexe: string
  date_naissance: string
  contact: string
  adresse: string
  antecedents: string
  allergies: string
  groupe_sanguin: string
}

interface PatientFormModalProps {
  isOpen: boolean
  isEditing?: boolean
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  form: PatientFormData
  setForm: React.Dispatch<React.SetStateAction<PatientFormData>>
}

export function PatientFormModal({
  isOpen,
  isEditing = false,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
}: PatientFormModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[95vh] overflow-y-auto md:overflow-visible">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="size-5 text-primary" /> Modifier le patient
              </>
            ) : (
              <>
                <UserPlus className="size-5 text-primary" /> Nouveau patient
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Colonne gauche : État civil & Coordonnées */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                État civil &amp; Coordonnées
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Nom de famille"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prénom *</Label>
                  <Input
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Prénom"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sexe *</Label>
                  <select
                    value={form.sexe}
                    onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date de naissance *</Label>
                  <Input
                    type="date"
                    required
                    value={form.date_naissance}
                    onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contact</Label>
                <Input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="Ex: 034 00 000 00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Adresse de résidence</Label>
                <Input
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="Adresse complète..."
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Colonne droite : Profil médical */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                Profil médical
              </h4>
              <div className="space-y-1">
                <Label className="text-xs">Groupe Sanguin</Label>
                <select
                  value={form.groupe_sanguin}
                  onChange={(e) => setForm({ ...form, groupe_sanguin: e.target.value })}
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sélectionner</option>
                  {GroupesSanguins.map((gs) => (
                    <option key={gs} value={gs}>
                      {gs}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Allergies connues</Label>
                <Textarea
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  placeholder="Ex: Pénicilline, Arachides..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Antécédents médicaux</Label>
                <Textarea
                  value={form.antecedents}
                  onChange={(e) => setForm({ ...form, antecedents: e.target.value })}
                  placeholder="Interventions, maladies chroniques..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending
                ? isEditing
                  ? "Mise à jour..."
                  : "Création..."
                : isEditing
                  ? "Enregistrer les modifications"
                  : "Enregistrer le patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
