import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

function backNav(from: string | undefined) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

const PRE_COLLEGE = [
  {
    id: "oncampus-vs-off",
    icon: "🏠",
    title: "On-Campus vs. Off-Campus: How to Decide",
    color: "#10B981",
    items: [
      { heading: "Why on-campus is usually the right move for freshmen", body: "Living on campus your first year removes friction at a time when everything else is already new. You're closer to classes, dining, support services, and other students. Most research on college success shows that on-campus freshmen build stronger academic and social foundations. If you have the option, take it." },
      { heading: "When off-campus makes sense", body: "Typically sophomore year and beyond - once you know the area, have friends to live with, and understand your schedule. Also consider off-campus if on-campus costs are significantly higher than a nearby apartment split with roommates, or if you have family obligations that require proximity to home." },
      { heading: "The real cost comparison", body: "Do the full math: dorm cost vs. (rent + utilities + groceries + transportation). Dorms often include a meal plan which sounds expensive until you price out cooking every meal. Get actual numbers from your school's housing office and a few nearby apartment listings before deciding." },
      { heading: "Guaranteed housing vs. the apartment search", body: "On-campus housing is guaranteed once you're admitted (usually). Off-campus requires finding a unit, signing a lease, setting up utilities, and managing a landlord - all while starting college. That's a lot of adult logistics to manage simultaneously as an 18-year-old in a new city." },
    ],
  },
  {
    id: "dorm-life",
    icon: "🛏️",
    title: "Dorm Life: What to Actually Expect",
    color: "#2563EB",
    items: [
      { heading: "Your roommate is not automatically your best friend", body: "You're matched with a stranger. Set expectations early: sleep schedules, guests, cleanliness, sharing vs. not sharing. A direct conversation in week one prevents months of passive tension. Most conflicts come from unspoken assumptions." },
      { heading: "What to bring (and what not to)", body: "Bring: twin XL bedding, power strip (surge-protected), shower caddy and flip-flops, laundry supplies, mini fridge (check your school's rules), desk lamp, over-door organizer. Don't bring: your entire wardrobe, a full-size printer, anything you'd be devastated to lose or have stolen." },
      { heading: "RA (Resident Advisor) - actually use them", body: "Your RA is a trained student leader whose job is to help you. They're not just enforcers. They know campus resources, can mediate roommate conflicts, and are often the first person to reach out when a student is struggling. Introduce yourself in week one." },
      { heading: "Shared bathrooms and common spaces", body: "Communal bathrooms require flip-flops, a caddy, and tolerance. Shared kitchens and lounges are community spaces - clean up after yourself, label your food in the fridge, and don't monopolize shared equipment. The social glue of a dorm floor is built on these small courtesies." },
      { heading: "Noise and sleep are real academic factors", body: "College dorms can be loud, especially at first. Invest in earplugs or a white noise app. If your floor culture doesn't match yours (you need quiet by 11pm, they're up until 2am), request a room change early - it gets harder the longer you wait." },
    ],
  },
  {
    id: "first-move",
    icon: "📦",
    title: "Moving In: The First 48 Hours",
    color: "#8B5CF6",
    items: [
      { heading: "Move-in day is chaotic - plan for it", body: "Thousands of students move in the same weekend. Elevators are jammed, parking is impossible, and everyone is emotional. Pack in labeled bins not boxes. Do the heaviest trips first. Have a parent or sibling handle logistics while you go introduce yourself to your floor." },
      { heading: "Photograph your room condition", body: "Before you unpack anything, take photos of every wall, the floor, the furniture, and any existing damage. Email them to housing services. This protects your deposit (yes, dorms often have damage deposits) and documents the room's condition if there's a dispute at checkout." },
      { heading: "Figure out your key systems on day one", body: "Campus card access, laundry machines, mail room, dining hall hours, dorm entry codes. Spend 30 minutes walking your building. Know where the exits are. Find the nearest 24-hour campus safety office." },
    ],
  },
];

const DURING_COLLEGE = [
  {
    id: "finding",
    icon: "🔍",
    title: "Finding Off-Campus Housing as a Student",
    color: "#2563EB",
    items: [
      { heading: "Start your search 3-4 months early", body: "Good apartments near campus fill fast, often for the following school year starting in January-February. If you want to move off-campus for junior year, you should be looking in the spring of sophomore year. Waiting until summer means picking from leftovers." },
      { heading: "Where to find student-friendly listings", body: "Your university's off-campus housing board (most schools have one), Facebook housing groups for your school, Zillow, Apartments.com, and Craigslist (verify everything). Ask older students for recommendations - word of mouth about good landlords is invaluable." },
      { heading: "Proximity vs. price trade-offs", body: "A cheaper apartment 20 minutes away may cost more in time, transportation, and missed opportunities than a pricier one walking distance from campus. Calculate the real cost including commute time (your time has value), bus passes or parking, and late-night safety." },
      { heading: "Student-targeted buildings vs. general market", body: "Buildings marketed to students often have flexible lease terms (August-August) and are landlord-experienced with college schedules. General market apartments may be cheaper but require full 12-month leases starting any month, which can create gaps with academic calendars." },
    ],
  },
  {
    id: "roommates",
    icon: "👥",
    title: "Living With Roommates: Making It Work",
    color: "#10B981",
    items: [
      { heading: "Set house rules before you move in, not after a fight", body: "Discuss: cleaning responsibilities (and schedule), groceries (shared vs. separate), guests and overnight visitors, quiet hours, thermostat, shared spaces. Write it down. A quick Notion doc or even a text thread agreement beats a verbal understanding that everyone remembers differently." },
      { heading: "How to split costs fairly", body: "For utilities: split evenly or use an app like Splitwise. For groceries: usually easier to go separate unless you actually cook together. For furniture and shared items: agree in advance who owns what when you move out - it avoids ugly end-of-lease disputes." },
      { heading: "Joint lease reality", body: "If you're all on the lease together, everyone is jointly and severally liable. If one roommate doesn't pay their portion and leaves, you're responsible for their share to the landlord. Only sign with people you trust financially, not just socially." },
      { heading: "What to do when it's not working", body: "Address issues early and directly. A conversation in month two is much easier than month nine. If it's a lease violation or safety issue, document everything in writing. If a roommate needs to leave mid-lease, understand that they can't simply 'remove themselves' from the lease without landlord consent." },
    ],
  },
  {
    id: "student-lease",
    icon: "📄",
    title: "Understanding Your First Lease",
    color: "#8B5CF6",
    items: [
      { heading: "Read the entire lease before signing", body: "Yes, all of it. Pay special attention to: lease term (start and end dates), renewal and notice requirements, guest policies, subletting rules (critical if you want to travel or study abroad), and early termination penalty." },
      { heading: "August-to-July leases and academic calendar gaps", body: "Many student leases run August-July, which means you're paying for July even if you're home for the summer. Factor this in. Some landlords allow subletting during summer; others prohibit it. Know before you sign." },
      { heading: "Security deposit: get it back", body: "Document your move-in condition in photos and email them to your landlord the day you move in. Keep all email records. When you move out, give proper written notice, clean thoroughly, and request a move-out inspection with the landlord present." },
      { heading: "What landlords can and cannot do", body: "They cannot enter without proper notice (usually 24-48 hours except emergencies). They cannot retaliate against you for complaining about habitability issues. They must maintain heat, hot water, and structurally sound conditions. Know your state's tenant rights - most states have free resources online." },
    ],
  },
];

const POST_COLLEGE = [
  {
    id: "before",
    icon: "🔍",
    title: "Before you sign anything",
    color: "var(--accent)",
    items: [
      { heading: "Know your budget first", body: "Calculate your maximum monthly rent before you start looking, not after you fall in love with an apartment. A good rule: no more than 35–40% of your take-home pay including utilities. If you make $4,000/month take-home, keep rent + utilities under $1,400–1,600." },
      { heading: "Check the landlord, not just the apartment", body: "Search the landlord's name + 'reviews' or 'complaints'. Look on Google Maps for the property address and read reviews. One bad landlord can make 12 months miserable regardless of how nice the unit looks." },
      { heading: "Visit at different times of day", body: "A quiet building at 10am may be loud at 10pm. Visit once during the day and once in the evening. Walk the neighborhood both times. Check: street lighting, nearby bars/venues, parking/traffic noise." },
      { heading: "The 'too good to be true' test", body: "If a listing is significantly cheaper than comparable units and available immediately - be skeptical. Scam listings are common. Never wire money or pay a security deposit before seeing the unit in person and confirming the landlord actually owns it." },
    ],
  },
  {
    id: "lease",
    icon: "📄",
    title: "Reading and negotiating the lease",
    color: "#10B981",
    items: [
      { heading: "Read the entire lease - every line", body: "It's 10–20 pages. Read all of it. Pay specific attention to: early termination clause, subletting rules, guest policies, pet rules, noise policies, and what happens if you need to break the lease early." },
      { heading: "Security deposit rules vary by state", body: "Most states cap security deposits at 1–2 months rent. Your landlord must return it within a specific window (often 14–30 days) after move-out with an itemized statement. Keep copies of your move-in inspection photos." },
      { heading: "What to negotiate", body: "More than people think is negotiable: first month free, lower deposit, professional cleaning before move-in, parking included, pet fee waiver. The worst they can say is no." },
      { heading: "Lease renewal terms", body: "Many leases auto-renew at a higher rate. Know your required notice period (usually 30–60 days) if you plan to leave. Mark the date 90 days before lease end so you have time to decide." },
    ],
  },
  {
    id: "insurance",
    icon: "🛡",
    title: "Renter's insurance: get it",
    color: "#8B5CF6",
    items: [
      { heading: "What it covers", body: "Your belongings (theft, fire, water damage), personal liability (if someone gets hurt in your apartment and sues), and additional living expenses if your unit becomes uninhabitable. Your landlord's insurance covers the building, not your stuff." },
      { heading: "What it costs", body: "Typically $10–20/month for $25,000–$50,000 of personal property coverage and $100,000 in liability. One of the highest-value purchases you'll make." },
      { heading: "Where to get it", body: "Lemonade, State Farm, Allstate, and your auto insurer (bundling often gives a discount). Compare quotes on NerdWallet or Policygenius." },
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
      { heading: "Pressure to decide immediately", body: "A legitimate landlord won't evaporate if you take 24 hours to review the lease. High-pressure tactics are a manipulation tactic or a sign of a scam." },
    ],
  },
];

export default function HousingPage({ searchParams }: { searchParams: { from?: string } }) {
  const from = searchParams?.from ?? "";
  const { href: backHref, label: backLabel } = backNav(from);

  const isPreCollege = from === "pre-college";
  const isDuringCollege = from === "during-college";

  const SECTIONS = isPreCollege ? PRE_COLLEGE : isDuringCollege ? DURING_COLLEGE : POST_COLLEGE;
  const title = isPreCollege
    ? "On-Campus vs. Off-Campus Housing"
    : isDuringCollege
    ? "Off-Campus Housing as a Student"
    : "Renting Your First Apartment";
  const subtitle = isPreCollege
    ? "Making the right choice for your first year"
    : isDuringCollege
    ? "Finding a place, understanding leases, and living with roommates"
    : "What to know before you sign";

  return (
    <PremiumShell title={title} subtitle={subtitle}>
      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>
        <div style={{ marginBottom: 20 }}>
          <Link href={backHref} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{backLabel}</Link>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {SECTIONS.map(({ id, icon, title: sTitle, color }) => (
            <a key={id} href={`#${id}`} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--card-border)", background: "var(--card-bg)", color, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{icon}</span>{sTitle.split(":")[0]}
            </a>
          ))}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {SECTIONS.map(({ id, icon, title: sTitle, color, items }) => (
            <div key={id} id={id} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ fontSize: 17, fontWeight: 950, color }}>{sTitle}</div>
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
