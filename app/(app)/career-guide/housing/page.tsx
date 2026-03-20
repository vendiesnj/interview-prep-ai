import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

const SECTIONS = [
  {
    id: "before",
    icon: "🔍",
    title: "Before you sign anything",
    color: "var(--accent)",
    items: [
      { heading: "Know your budget first", body: "Calculate your maximum monthly rent before you start looking, not after you fall in love with an apartment. A good rule: no more than 35–40% of your take-home pay including utilities. If you make $4,000/month take-home, keep rent + utilities under $1,400–1,600." },
      { heading: "Check the landlord, not just the apartment", body: "Search the landlord's name + 'reviews' or 'complaints'. Look on Google Maps for the property address and read reviews. One bad landlord can make 12 months miserable regardless of how nice the unit looks." },
      { heading: "Visit at different times of day", body: "A quiet building at 10am may be loud at 10pm. Visit once during the day and once in the evening. Walk the neighborhood both times. Check: street lighting, nearby bars/venues, parking/traffic noise." },
      { heading: "The 'too good to be true' test", body: "If a listing is significantly cheaper than comparable units and available immediately — be skeptical. Scam listings are common. Never wire money or pay a security deposit before seeing the unit in person and confirming the landlord actually owns it (check county property records)." },
    ],
  },
  {
    id: "lease",
    icon: "📄",
    title: "Reading and negotiating the lease",
    color: "#10B981",
    items: [
      { heading: "Read the entire lease — every line", body: "It's 10–20 pages. Read all of it. Pay specific attention to: early termination clause, subletting rules, guest policies, pet rules, noise policies, and what happens if you need to break the lease early." },
      { heading: "Security deposit rules vary by state", body: "Most states cap security deposits at 1–2 months rent. Your landlord must return it within a specific window (often 14–30 days) after move-out with an itemized statement. Keep copies of your move-in inspection photos — you'll need them if there's a dispute." },
      { heading: "What to negotiate", body: "More than people think is negotiable: first month free, lower deposit, professional cleaning before move-in, parking included, pet fee waiver, paint colors, appliance replacement. The worst they can say is no. If the unit has been vacant for more than a few weeks, they're motivated." },
      { heading: "Lease renewal terms", body: "Many leases auto-renew at a higher rate. Know your required notice period (usually 30–60 days) if you plan to leave. Mark the date 90 days before lease end so you have time to decide." },
      { heading: "Joint lease with roommates", body: "If you're signing a joint lease, everyone is jointly liable — meaning if your roommate doesn't pay, you're responsible. This isn't paranoia, it's the legal reality. Only sign with people you trust financially." },
    ],
  },
  {
    id: "moving",
    icon: "📦",
    title: "Moving in: the first 48 hours",
    color: "#F59E0B",
    items: [
      { heading: "Document everything before you unpack", body: "Walk every room with your phone and photograph every existing scratch, stain, dent, and damage. Email the photos to your landlord the same day with a note: 'Documenting pre-existing conditions.' This protects your deposit." },
      { heading: "Change your locks (if allowed)", body: "You don't know how many copies of the key exist. Some states allow tenants to change locks; others require landlord permission. At minimum, ask if the locks have been rekeyed since the last tenant." },
      { heading: "Set up utilities immediately", body: "Electric, gas, internet — transfer or start service before move-in if possible. Call your internet provider early: installation slots book out 1–2 weeks in advance in most cities." },
      { heading: "Test everything", body: "Run all appliances, check water pressure in every faucet and shower, flush every toilet, test every outlet, check that all windows and doors lock properly. Report issues in writing within 48 hours." },
    ],
  },
  {
    id: "insurance",
    icon: "🛡",
    title: "Renter's insurance: get it",
    color: "#8B5CF6",
    items: [
      { heading: "What it covers", body: "Your belongings (theft, fire, water damage), personal liability (if someone gets hurt in your apartment and sues), and additional living expenses if your unit becomes uninhabitable. Your landlord's insurance covers the building, not your stuff." },
      { heading: "What it costs", body: "Typically $10–20/month for $25,000–$50,000 of personal property coverage and $100,000 in liability. One of the highest-value purchases you'll make. Many landlords require it — even if yours doesn't, get it." },
      { heading: "Where to get it", body: "Lemonade, State Farm, Allstate, and Renters insurance through your auto insurer (bundling often gives a discount). Compare quotes on NerdWallet or Policygenius." },
    ],
  },
  {
    id: "redflags",
    icon: "🚩",
    title: "Red flags to walk away from",
    color: "#EF4444",
    items: [
      { heading: "Landlord won't do a walk-through with you", body: "If they want to hand you keys without inspecting together, that's a warning sign. An honest landlord wants to document condition at move-in as much as you do." },
      { heading: "Cash only, no paper trail", body: "Always pay rent in a traceable way: check, bank transfer, or payment app with records. Cash-only landlords make it hard to prove you paid." },
      { heading: "Mold smell that gets dismissed", body: "Any musty smell that the landlord explains away should be investigated before you sign. Mold remediation is expensive and slow, and some landlords will make it your problem." },
      { heading: "Pressure to decide immediately", body: "A legitimate landlord won't evaporate if you take 24 hours to review the lease. High-pressure tactics ('three other people are looking at it tonight') are a manipulation tactic or a sign of a scam." },
      { heading: "Problems that will be 'fixed before you move in'", body: "Get it in writing, in the lease, or don't believe it. Verbal promises from landlords are unenforceable in most states." },
    ],
  },
];

export default function HousingPage() {
  return (
    <PremiumShell title="Renting Your First Apartment" subtitle="What to know before you sign">
      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href="/career-guide" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>← Career Guide</Link>
        </div>

        {/* Quick nav */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {SECTIONS.map(({ id, icon, title, color }) => (
            <a key={id} href={`#${id}`} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--card-border)", background: "var(--card-bg)", color, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{icon}</span>{title.split(":")[0]}
            </a>
          ))}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {SECTIONS.map(({ id, icon, title, color, items }) => (
            <div key={id} id={id} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ fontSize: 17, fontWeight: 950, color }}>{title}</div>
              </div>
              <div style={{ padding: 24, display: "grid", gap: 20 }}>
                {items.map(({ heading, body }) => (
                  <div key={heading}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>{heading}</div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PremiumShell>
  );
}
