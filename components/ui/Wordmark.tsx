// Steward Homes wordmark, rebuilt in the brand's primary face (Playfair
// Display) so it stays crisp and inherits color from its parent — sage green
// on light surfaces, linen on the dark green bands. Mirrors the supplied logo:
// "STEWARD" over a hairline rule, "HOMES" in open-tracked caps beneath.
// (Swap in an official transparent SVG/PNG later if the client provides one.)
interface WordmarkProps {
  className?: string;
  /** Overall scale via the "STEWARD" font-size in px. */
  size?: number;
}

export function Wordmark({ className = '', size = 21 }: WordmarkProps) {
  return (
    <span
      className={`inline-flex flex-col leading-none select-none ${className}`}
      role="img"
      aria-label="Steward Homes"
    >
      <span
        className="font-serif font-bold tracking-[0.1em]"
        style={{ fontSize: size }}
      >
        STEWARD
      </span>
      <span className="mt-[5px] mb-[4px] h-px bg-current opacity-40" />
      <span
        className="font-sans font-semibold tracking-[0.42em] text-center pl-[0.42em]"
        style={{ fontSize: Math.round(size * 0.4) }}
      >
        HOMES
      </span>
    </span>
  );
}
