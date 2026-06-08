const FAQS = [
  {
    q: 'Do I need to be a veteran to assume a VA loan?',
    a: 'No. VA loans can be assumed by any qualified buyer — military status is not a requirement. This is the #1 misconception about VA assumptions.',
    open: true
  },
  {
    q: 'How much do I need for a down payment?',
    a: "You need to cover the seller's equity — typically 8–15% of the home's value, depending on how long they've owned it. Not 20%."
  },
  {
    q: 'Is the rate really locked for me?',
    a: 'Yes. You take over their existing loan, so you inherit their rate and term. If they locked at 2.75% for 30 years in 2020, you continue at 2.75% for the remaining 25 years.'
  },
  {
    q: 'What does Jeff charge?',
    a: "Jeff is paid by the seller as the listing or buyer's agent, the same as any standard transaction. There's no extra fee for using Assumable."
  }
];

export function Faq() {
  return (
    <section id="faq" className="px-6 md:px-14 py-20 bg-cream">
      <div className="max-w-[1160px] mx-auto">
        <div className="eyebrow">The basics</div>
        <h2 className="font-serif font-normal text-[30px] md:text-[40px] tracking-[-.02em] text-ink mt-2.5 mb-8">
          Questions everyone asks
        </h2>
        <div>
          {FAQS.map((f) => (
            <details
              key={f.q}
              {...(f.open ? { open: true } : {})}
              className="group border-t border-line-2 last:border-b py-5"
            >
              <summary className="cursor-pointer font-medium text-ink text-[18px] flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="text-muted shrink-0 transition-transform group-open:rotate-45"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="text-muted-2 mt-3.5 leading-[1.7] max-w-[760px] text-[15px]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
