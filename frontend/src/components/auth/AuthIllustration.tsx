import Image from "next/image"

export function AuthIllustration() {
  return (
    <div className="relative w-full h-full max-h-[500px] lg:max-h-[540px] rounded-3xl bg-[var(--panel)] p-5 sm:p-6 lg:p-7 flex flex-col justify-between items-center overflow-hidden">
      
      {/* Éléments décoratifs autour de l'illustration (sans la masquer) */}
      {/* Cercle en --primary semi-transparent */}
      <div 
        className="absolute top-5 right-6 size-16 rounded-full bg-[var(--primary)] opacity-10 pointer-events-none" 
        aria-hidden="true" 
      />
      
      {/* Cercles et points en --accent semi-transparents */}
      <div 
        className="absolute top-12 left-10 size-3 rounded-full bg-[var(--accent)] opacity-40 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-28 right-12 size-2 rounded-full bg-[var(--accent)] opacity-50 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-24 left-6 size-3 rounded-full bg-[var(--accent)] opacity-35 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute -bottom-6 -right-6 size-24 rounded-full bg-[var(--primary)] opacity-10 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Zone Illustration */}
      <div className="relative my-auto w-full flex flex-col items-center justify-center">
        {/* Illustration médecin présente dans public/undraw_doctor.svg */}
        <div className="relative z-10 w-full flex items-center justify-center">
          <Image
            src="/undraw_doctor.svg"
            alt="Illustration médecin"
            width={380}
            height={273}
            priority
            className="mx-auto h-auto max-h-[220px] sm:max-h-[240px] lg:max-h-[260px] w-auto max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] object-contain"
          />
        </div>
      </div>

      {/* 3 points de carrousel sous l'illustration (le 3e actif, en --primary) */}
      <div className="mt-4 sm:mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
        <span className="size-2 rounded-full bg-[var(--accent)]/30" />
        <span className="size-2 rounded-full bg-[var(--accent)]/30" />
        <span className="w-6 h-2 rounded-full bg-[var(--primary)]" />
      </div>

      {/* Texte centré en bas, couleur --background-dark avec « simplement » en --primary */}
      <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm lg:text-[15px] font-bold tracking-tight text-[var(--background-dark)] max-w-xs leading-snug">
        Gérez vos patients{" "}
        <span className="text-[var(--primary)] font-extrabold">simplement</span>,
        de façon organisée et sécurisée.
      </p>
    </div>
  )
}
