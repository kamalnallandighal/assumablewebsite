const STEPS = [
  {
    num: '01',
    title: 'Find a home',
    body:
      "Use the finder or browse the map. Every listing shows the locked-in rate and what you'd actually pay each month."
  },
  {
    num: '02',
    title: "Apply with the seller's lender",
    body:
      'The existing lender runs standard credit + income checks. Typically 2–3 weeks. No new appraisal needed.'
  },
  {
    num: '03',
    title: 'Close and take over',
    body:
      'You sign at title. The loan — and the rate — transfer to you. You own the home and continue the payments.'
  }
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 md:px-14 py-20 bg-paper">
      <div className="max-w-[1160px] mx-auto">
        <div className="eyebrow">How assumption works</div>
        <h2 className="font-serif font-normal text-[30px] md:text-[48px] tracking-[-.02em] text-ink mt-3.5 mb-12 leading-[1.05]">
          You&apos;re not taking out a new loan.
          <br className="hidden md:block" /> You&apos;re taking over theirs.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.num}>
              <div className="font-serif text-terra text-[48px] font-normal tracking-[-.02em] leading-none">
                {s.num}
              </div>
              <div className="mt-4 text-ink font-semibold text-[20px]">{s.title}</div>
              <p className="mt-2.5 text-muted-2 text-sm leading-[1.6]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
