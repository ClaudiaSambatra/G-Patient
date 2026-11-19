import { useState } from "react"
import { Pill, PencilSimple } from "@phosphor-icons/react"
import { StockMedicament, formatAriary } from "@/components/stocks/types"

// Recherche insensible aux majuscules et aux accents (« paracetamol » trouve « Paracétamol »)
const normaliser = (texte: string) =>
  texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

interface MedicamentComboboxProps {
  id: string
  value: string
  stockId: string
  catalogue: StockMedicament[]
  onChoisirStock: (med: StockMedicament) => void
  onTexteLibre: (texte: string) => void
}

/**
 * Champ « Médicament » : le médecin tape le nom, voit les médicaments de la pharmacie du cabinet
 * correspondants (avec le stock), ou garde son texte pour un achat en pharmacie extérieure.
 */
export function MedicamentCombobox({ id, value, stockId, catalogue, onChoisirStock, onTexteLibre }: MedicamentComboboxProps) {
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(0)

  const requete = normaliser(value.trim())
  const suggestions = requete
    ? catalogue.filter((m) => normaliser(m.libelle).includes(requete)).slice(0, 8)
    : catalogue.slice(0, 8)
  const correspondanceExacte = suggestions.some((m) => normaliser(m.libelle) === requete || normaliser(m.nom) === requete)
  const proposerTexteLibre = Boolean(value.trim()) && !stockId && !correspondanceExacte
  const nbOptions = suggestions.length + (proposerTexteLibre ? 1 : 0)

  const choisir = (index: number) => {
    const med = suggestions[index]
    if (med) {
      if (med.quantite === 0) return
      onChoisirStock(med)
    }
    setOuvert(false)
  }

  const medLie = catalogue.find((m) => String(m.id) === stockId)

  return (
    <div className="relative">
      <input
        id={id}
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={`${id}-liste`}
        placeholder="Tapez le nom, ex : Amoxicilline"
        value={value}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onChange={(e) => {
          // Taper à nouveau détache la ligne du stock : c'est un médicament en texte libre
          onTexteLibre(e.target.value)
          setActif(0)
          setOuvert(true)
        }}
        onKeyDown={(e) => {
          if (!ouvert || nbOptions === 0) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActif((a) => (a + 1) % nbOptions)
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActif((a) => (a - 1 + nbOptions) % nbOptions)
          } else if (e.key === "Enter") {
            e.preventDefault()
            choisir(actif)
          } else if (e.key === "Escape") {
            setOuvert(false)
          }
        }}
        className={`flex h-9 w-full rounded-xl border bg-background px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring ${
          stockId ? "border-primary/50 pr-24" : "border-input"
        }`}
      />
      {medLie && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          Cabinet
        </span>
      )}

      {ouvert && nbOptions > 0 && (
        <ul
          id={`${id}-liste`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-lg"
        >
          {suggestions.map((m, i) => {
            const rupture = m.quantite === 0
            return (
              <li
                key={m.id}
                role="option"
                aria-selected={i === actif}
                aria-disabled={rupture}
                // onMouseDown plutôt que onClick : se déclenche avant la perte du focus du champ
                onMouseDown={(e) => {
                  e.preventDefault()
                  choisir(i)
                }}
                onMouseEnter={() => setActif(i)}
                className={`flex items-center gap-2 px-3 py-2 ${rupture ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${
                  i === actif && !rupture ? "bg-muted" : ""
                }`}
              >
                <Pill size={16} className="shrink-0 text-primary" />
                <span className="flex-1 truncate">{m.libelle}</span>
                <span className={`shrink-0 text-xs ${rupture ? "text-red-600" : m.en_alerte ? "text-amber-700" : "text-muted-foreground"}`}>
                  {rupture ? "rupture" : `${m.quantite} en stock · ${formatAriary(m.prix_unitaire)}`}
                </span>
              </li>
            )
          })}
          {proposerTexteLibre && (
            <li
              role="option"
              aria-selected={actif === suggestions.length}
              onMouseDown={(e) => {
                e.preventDefault()
                setOuvert(false)
              }}
              onMouseEnter={() => setActif(suggestions.length)}
              className={`flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2 text-muted-foreground ${
                actif === suggestions.length ? "bg-muted" : ""
              }`}
            >
              <PencilSimple size={16} className="shrink-0" />
              Utiliser « {value.trim()} » (pharmacie extérieure)
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
