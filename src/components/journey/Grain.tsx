// A page-wide grain texture, blended over every ground. Unlike Ticker,
// OrbitThread and ChromePiece it is deliberately full-bleed by design (the
// grain covers every ground at 0.1 opacity with an overlay
// blend so text stays legible) — so it carries no `data-decor`: the
// overlap check (AD-13) is for pieces that must dodge text, not for a
// texture meant to cover it.
export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-10"
      style={{ backgroundImage: "url(/decor/textures/grain.png)" }}
    />
  );
}
