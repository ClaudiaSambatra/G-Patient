import Image from "next/image"

export function AuthIllustration() {
  return (
    <div className="relative w-full h-full max-h-[500px] lg:max-h-[540px] rounded-lg bg-[var(--background-dark)] p-6 lg:p-8 flex flex-col justify-between text-white">
      <div className="flex flex-1 items-center justify-center">
        <Image
          src="/ej-logo.png"
          alt="Logo EJ Logiciel"
          width={400}
          height={400}
          priority
          className="h-auto w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[300px]"
        />
      </div>

      <p className="mt-4 text-sm lg:text-[15px] leading-snug text-[#C9CBE6] max-w-xs">
        Gestion des patients du cabinet : rendez-vous, consultations, ordonnances et factures.
      </p>
    </div>
  )
}
