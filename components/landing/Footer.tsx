export function Footer() {
  return (
    <footer className="px-6 md:px-10 py-8 bg-paper border-t border-line">
      <div className="max-w-[1160px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="font-serif text-[22px] tracking-tight text-ink">Assumable</div>
          <div className="text-xs text-muted-2 mt-1.5">
            Licensed in Arizona · Jeff Salazar, Realtor · (602) 332-3860
          </div>
        </div>
        <div className="text-xs text-muted">© 2025 · Equal Housing Opportunity</div>
      </div>
      {/*
        TODO(compliance) — pre-launch must-haves per CLAUDE.md "Compliance" section:
        - ARMLS disclaimer: "All information should be verified by the recipient and none is guaranteed as accurate by ARMLS"
        - Fair Housing / Equal Housing Opportunity logo
        - Data timestamp (last refresh, ≤12hr cadence)
        - "Not a real estate broker" disclaimer with Steward Homes + license #
        - Listing-broker attribution on detail pages (separate concern; in DetailModal)
      */}
    </footer>
  );
}
