import Image from "next/image"

// Occupe toute la moitié droite des écrans de connexion.
export function AuthIllustration() {
  return (
    <div className="absolute inset-0 bg-[#DCDFFF]">
      {/* Illustration : salle d'attente (image fournie) */}
      <Image
        src="/connexion-salle-attente-v2.jpg"
        alt="Illustration : salle d'attente du cabinet médical"
        fill
        priority
        sizes="50vw"
        className="object-cover object-bottom"
      />
    </div>
  )
}
