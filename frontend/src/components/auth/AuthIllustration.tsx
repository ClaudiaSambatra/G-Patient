import Image from "next/image"

// Occupe toute la moitié droite des écrans de connexion.
export function AuthIllustration() {
  return (
    <div className="absolute inset-0 bg-[#F3F4FB]">
      {/* Illustration sous licence gratuite Vecteezy (couleurs adaptées à la charte).
          Crédit obligatoire : affiché dans le pied de page de l'accueil (app/page.tsx) et dans le README. */}
      <Image
        src="/connexion-salle-attente-ej.jpg"
        alt="Illustration : patients dans la salle d'attente du cabinet"
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
    </div>
  )
}
