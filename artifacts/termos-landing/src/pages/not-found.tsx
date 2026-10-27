/** Ruta inexistente. El servidor la responde con estado 404 (server.mjs,
 *  SPA_ROUTES); acá se ve en el lenguaje de la marca, con salida a la portada
 *  y al personalizador. */
export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-[var(--cs-ink)] text-[var(--cs-mark)] flex flex-col">
      <header className="max-w-7xl w-full mx-auto px-5 sm:px-6 h-16 flex items-center gap-3">
        <img src="/navbar-logo-v2.webp" alt="Marketplace" width={200} height={40} className="h-5 sm:h-7 w-auto object-contain brightness-0 invert" />
        <span aria-hidden className="w-px h-6 bg-white/25" />
        <span className="text-sm sm:text-[15px] font-semibold">Creativa Studio</span>
      </header>
      <div className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-6 py-16 grid content-center gap-6">
        <p className="font-serif font-light text-[var(--cs-mark-dim)] text-6xl md:text-8xl leading-none">404</p>
        <h1 className="font-serif font-light text-white text-[clamp(2.25rem,6vw,4rem)] leading-[1.02]">
          Esta página <em className="italic">no existe.</em>
        </h1>
        <p className="text-[var(--cs-mark-dim)] text-base md:text-lg max-w-[34rem]">
          El link puede estar mal escrito o haber cambiado. Todo lo de Creativa Studio está en la portada.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/" className="cs-btn cs-btn-primary w-fit">Ir a la portada</a>
          <a href="/#customizer" className="cs-btn cs-btn-ghost-dark w-fit">Personalizar una pieza</a>
        </div>
      </div>
    </main>
  );
}
