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
    <section id="how" className="px-6 md:px-10 py-16 md:py-24 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-10 md:mb-14">
          <div className="text-xs uppercase tracking-widest text-muted">
            How assumption works
          </div>
          <h2 className="font-serif font-normal text-[30px] md:text-[48px] leading-[1.05] tracking-tight text-ink mt-3">
            You&apos;re not taking out a new loan.
            <br className="hidden md:block" /> You&apos;re taking over theirs.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="bg-cream border border-line rounded-card p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="font-serif text-terra text-[56px] leading-none font-normal">
                {s.num}
              </div>
              <div className="mt-6 text-ink font-medium text-lg">{s.title}</div>
              <p className="mt-3 text-muted text-sm leading-[1.6]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
