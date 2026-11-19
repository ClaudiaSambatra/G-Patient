import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FORMES_PHARMACEUTIQUES } from "@/components/ordonnances/types"
import { Modal } from "./Modal"
import { MedicamentForm } from "./types"

interface MedicamentFormModalProps {
  mode: "create" | "edit"
  form: MedicamentForm
  setForm: (form: MedicamentForm) => void
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
}

export function MedicamentFormModal({ mode, form, setForm, onClose, onSubmit, isPending }: MedicamentFormModalProps) {
  const set = (champ: keyof MedicamentForm, valeur: string | boolean) => setForm({ ...form, [champ]: valeur })

  return (
    <Modal titre={mode === "create" ? "Nouveau médicament" : "Modifier le médicament"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label htmlFor="med-nom">Nom *</Label>
          <Input id="med-nom" required value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex : Amoxicilline" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="med-dosage">Dosage</Label>
            <Input id="med-dosage" value={form.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="Ex : 500 mg" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="med-forme">Forme</Label>
            <select
              id="med-forme"
              value={form.forme}
              onChange={(e) => set("forme", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {FORMES_PHARMACEUTIQUES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="med-prix">Prix unitaire (Ar) *</Label>
            <Input id="med-prix" type="number" min="0" step="50" required value={form.prix_unitaire} onChange={(e) => set("prix_unitaire", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="med-unite">Unité</Label>
            <Input id="med-unite" value={form.unite} onChange={(e) => set("unite", e.target.value)} placeholder="boîte, flacon, tube…" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="med-seuil">Seuil d&apos;alerte</Label>
            <Input id="med-seuil" type="number" min="0" value={form.seuil_alerte} onChange={(e) => set("seuil_alerte", e.target.value)} />
          </div>
          {mode === "create" ? (
            <div className="space-y-1">
              <Label htmlFor="med-qte">Stock initial</Label>
              <Input id="med-qte" type="number" min="0" value={form.quantite_initiale} onChange={(e) => set("quantite_initiale", e.target.value)} />
            </div>
          ) : (
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={form.actif} onChange={(e) => set("actif", e.target.checked)} />
              Proposé aux médecins
            </label>
          )}
        </div>
        {mode === "edit" && (
          <p className="text-xs text-muted-foreground">
            La quantité en stock ne se modifie pas ici : utilisez « Réception » ou « Inventaire » pour qu&apos;elle reste tracée.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
