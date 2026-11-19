import Image from "next/image"

export function AuthIllustration() {
  return (
    <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[520px] overflow-hidden rounded-lg bg-[var(--background-dark)]">
      {/* Photo : Vitaly Gariev sur Unsplash (licence Unsplash) */}
      <Image
        src="/connexion-medecin.jpg"
        alt="Médecin dans son cabinet"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-[var(--background-dark)]/85 px-6 py-4 text-white">
        <p className="text-sm lg:text-[15px] leading-snug">
          Gestion des patients du cabinet : rendez-vous, consultations, ordonnances et factures.
        </p>
      </div>
    </div>
  )
}
