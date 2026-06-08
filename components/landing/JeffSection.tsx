export function JeffSection() {
  return (
    <section id="agent" className="px-6 md:px-14 py-24 md:py-[120px] bg-ink text-white">
      <div className="max-w-[720px] mx-auto">
        {/* Jeff's actual photo — circular, prominent. Larger than the design's
            80px placeholder to give him face presence on the dark band. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/jeff.jpeg"
          alt="Jeff Salazar"
          className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] rounded-full object-cover object-top mb-10"
        />

        <div className="eyebrow text-white/55 mb-4">The agent</div>

        <h2 className="font-serif font-normal text-[40px] md:text-[56px] leading-[1.05] tracking-[-.02em] text-white m-0">
          Jeff Salazar is a certified assumption expert.
        </h2>

        <p className="text-[17px] md:text-[18px] leading-[1.65] text-white/72 mt-8 max-w-[580px]">
          Jeff has completed{' '}
          <strong className="text-white font-semibold">
            advanced training in loan assumptions
          </strong>{' '}
          — an area most agents overlook. He&apos;s closed{' '}
          <strong className="text-white font-semibold">80+ assumption transactions</strong>{' '}
          across the Valley and knows what makes a deal pencil out versus fall apart.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-2.5 items-start">
          <a
            href="tel:+16023323860"
            className="inline-flex items-center gap-2 bg-white text-ink text-[15px] font-medium px-6 py-3.5 rounded-pill hover:bg-white/90"
          >
            <PhoneIcon /> (602) 332-3860
          </a>
          <a
            href="mailto:jeff@assumablehomesaz.com"
            className="inline-flex items-center gap-2 bg-transparent text-white text-[15px] font-medium px-6 py-3.5 rounded-pill border border-white/20 hover:border-white/40"
          >
            <MailIcon /> jeff@assumablehomesaz.com
          </a>
        </div>
      </div>
    </section>
  );
}

function PhoneIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1A19.5 19.5 0 013.1 9.8 19.8 19.8 0 010 1.2 2 2 0 012 0h3a2 2 0 012 1.7c.1 1 .3 1.9.6 2.8a2 2 0 01-.4 2.1L5.9 7.9a16 16 0 006.3 6.3l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.5 2.8.6a2 2 0 011.7 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={3} y={5} width={18} height={14} rx={2} />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
