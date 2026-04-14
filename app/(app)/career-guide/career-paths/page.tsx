import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import OCCUPATIONS, { aiRiskLabel } from "@/app/lib/onet-occupations";

function backNav(from?: string) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

const PRE_COLLEGE_CONTENT = [
  {
    id: "honest-truth",
    title: "The honest truth about majors - and trades",
    body: "Most majors don't lock you into one career. English majors become product managers. Biology majors go to law school. Chemistry majors become consultants. Your major signals interest and teaches a way of thinking - it's not a life sentence. And a four-year degree isn't the only path: apprenticeships, two-year programs, and trade certifications lead to excellent careers that often pay more than many bachelor's degrees - without the debt.",
  },
  {
    id: "high-roi",
    title: "High-ROI paths - degrees and trades",
    body: "STEM (Engineering, CS, Math): high starting salaries, strong demand. Health Sciences (Nursing, Pre-Med): high demand, clear licensing path. Business (Finance, Accounting, Marketing): flexible and widely understood by employers. Skilled Trades (Electrician, Plumber, HVAC, Welder): earn while you learn through apprenticeships, no tuition debt, recession-resistant demand, strong six-figure ceiling. Humanities: lower entry salaries but strong critical thinking - grad school often unlocks higher earning. Creative (Design, Film, Architecture): competitive; portfolio matters more than GPA.",
  },
  {
    id: "questions-before-declaring",
    title: "Questions to ask yourself before declaring",
    body: "What subjects make time disappear? What would you study if salary didn't exist? Do you want grad school or work after graduation? Do you prefer working with systems, people, ideas, or objects? What does your daily work environment look like in 10 years?",
  },
  {
    id: "double-majors",
    title: "Double majors and minors - worth it?",
    body: "A double major signals range, but only if both are strong. More often, a strong major + relevant internships + a minor beats a diluted double major. Minors worth pairing: CS minor with almost anything, Statistics minor with social sciences, Business minor with STEM, Psychology minor with pre-law or HR tracks.",
  },
  {
    id: "explore-before-committing",
    title: "How to explore before committing",
    body: "Take intro courses in 2-3 areas before declaring. Talk to seniors in the major - ask what they wish they knew. Visit the career center - ask which employers recruit from each major. Look up recent graduates on LinkedIn - see where they actually ended up.",
  },
];

const DURING_COLLEGE_CONTENT = [
  {
    id: "switch-majors",
    title: "Should you switch majors?",
    body: "Yes, if: the work feels meaningless to you, your grades reflect disengagement not effort, you've shadowed someone in the field and couldn't see yourself there. No, if: it's just hard - hard ≠ wrong fit. The average student spends $30-50k in extra time switching majors impulsively. Talk to your advisor and a career counselor before deciding.",
  },
  {
    id: "specializing",
    title: "Specializing within your major",
    body: "CS: web dev, data science, ML, systems, security - recruiters care which one. Business: finance, marketing, operations, consulting - generalist resumes get passed over. Psychology: clinical, I/O (industrial-organizational), research, school counseling - very different paths. Pick a direction by junior year and build internships, projects, and coursework around it.",
  },
  {
    id: "grad-vs-work",
    title: "Grad school vs. work after graduation",
    body: "Go to grad school if: your career requires it (medicine, law, academia), you want to specialize deeply, or you have a funded offer. Don't go if: you're avoiding the job market or have no clear reason. An unfunded master's in a humanities field is usually a poor ROI. Professional programs (MBA, JD, MD) are different - they have clear career outcomes.",
  },
  {
    id: "internship-pipeline",
    title: "The internship-to-offer pipeline",
    body: "Most full-time hiring at top companies flows from internship programs. Recruiting for junior-year summer internships starts in September-October of junior year. Fall recruiting is for consulting, banking, and tech. If you miss the structured recruiting cycle, reach out directly - most hiring managers respond to thoughtful cold outreach from students.",
  },
  {
    id: "portfolio-vs-resume",
    title: "Building a portfolio vs. a resume",
    body: "For design, CS, data, and creative roles: your portfolio matters as much as your resume. Start building early. Every class project, internship output, and side project is portfolio material. GitHub, Behance, personal website, or a simple PDF case study - pick the format your industry expects.",
  },
];

const PATHS = [
  {
    industry: "Technology",
    color: "var(--accent)",
    icon: "💻",
    tracks: [
      {
        start: "Software Engineer I",
        steps: ["SWE II (2–3 yrs)", "Senior SWE (4–6 yrs)", "Staff Engineer / Tech Lead (7–10 yrs)", "Principal / Distinguished Engineer"],
        pivot: "Product Manager, Engineering Manager, or Founder",
        salaryRange: "$95k – $200k+ depending on level and location",
        notes: "FAANG/big tech compresses timelines significantly. Startup equity can change the math entirely.",
      },
      {
        start: "Product Manager / APM",
        steps: ["PM (2–3 yrs)", "Senior PM (4–6 yrs)", "Group PM / Director of Product (7–10 yrs)", "VP Product / CPO"],
        pivot: "Founder, Venture Capital, or General Management",
        salaryRange: "$110k – $250k+ at senior levels",
        notes: "APM programs at Google, Meta, Microsoft are highly competitive but fast-track. Domain expertise matters - PM with fintech background at a fintech company is very valuable.",
      },
      {
        start: "Data Analyst",
        steps: ["Senior Analyst (2–3 yrs)", "Data Scientist / Analytics Manager (4–6 yrs)", "Principal Data Scientist / Head of Analytics"],
        pivot: "Machine Learning Engineer, Chief Data Officer, or consulting",
        salaryRange: "$75k – $180k+ depending on specialization",
        notes: "SQL is table stakes. Python, ML fundamentals, and business communication are what separate analysts from scientists.",
      },
    ],
  },
  {
    industry: "Finance",
    color: "#10B981",
    icon: "📊",
    tracks: [
      {
        start: "Investment Banking Analyst",
        steps: ["Associate (2–3 yrs, often MBA)", "VP (3–4 yrs)", "Director / MD (7–12 yrs)"],
        pivot: "Private Equity, Hedge Fund, Corporate Development, or CFO track",
        salaryRange: "$120k–$200k all-in as analyst; $300k–$1M+ at MD level",
        notes: "The exit opportunities are the point. Most analysts leave for PE/VC/Corp Dev after 2 years. The hours are brutal but the network is permanent.",
      },
      {
        start: "Financial Analyst (Corporate)",
        steps: ["Senior Financial Analyst (2–3 yrs)", "Finance Manager (4–6 yrs)", "Director of Finance / FP&A (7–10 yrs)", "VP Finance / CFO"],
        pivot: "Strategic finance at a startup, VC-backed company, or general management",
        salaryRange: "$65k – $175k depending on company size and location",
        notes: "MBA from a top program can accelerate the VP+ path significantly.",
      },
    ],
  },
  {
    industry: "Consulting",
    color: "#8B5CF6",
    icon: "🎯",
    tracks: [
      {
        start: "Business Analyst / Analyst (MBB)",
        steps: ["Consultant (post-MBA, 2–3 yrs)", "Engagement Manager (3–4 yrs)", "Principal / Associate Partner", "Partner / Director"],
        pivot: "Private Equity, Corporate Strategy, Startup COO, or General Management",
        salaryRange: "$90k–$115k entry; $200k+ at consultant level; $700k+ at Partner",
        notes: "McKinsey, BCG, Bain (MBB) are the top tier. Most analysts leave after 2 years for industry roles at significantly higher comp. The network from MBB is one of the most valuable in business.",
      },
    ],
  },
  {
    industry: "Marketing",
    color: "#F59E0B",
    icon: "📣",
    tracks: [
      {
        start: "Marketing Coordinator / Associate",
        steps: ["Marketing Manager (2–3 yrs)", "Senior Manager / Director (4–7 yrs)", "VP Marketing (7–12 yrs)", "CMO"],
        pivot: "Brand strategy, Startup growth lead, or Agency founding",
        salaryRange: "$45k–$75k entry; $120k–$200k+ at Director/VP",
        notes: "Specialization matters more than generalist growth. Performance marketing, product marketing, and brand strategy are three very different career tracks. Pick one early.",
      },
    ],
  },
  {
    industry: "Healthcare & Life Sciences",
    color: "#EF4444",
    icon: "⚕️",
    tracks: [
      {
        start: "Clinical Research Associate / Analyst",
        steps: ["Senior CRA / Manager (3–5 yrs)", "Director of Clinical Operations (6–10 yrs)", "VP / SVP"],
        pivot: "Healthcare consulting, Medical Affairs, or Biotech startup",
        salaryRange: "$55k–$90k entry; $130k–$200k+ at Director level",
        notes: "CRO (Contract Research Organization) experience translates broadly across pharma and biotech. Regulatory knowledge is increasingly valuable.",
      },
    ],
  },
  {
    industry: "Skilled Trades & Technical",
    color: "#92400E",
    icon: "🔧",
    tracks: [
      {
        start: "Apprentice Electrician (Year 1–2)",
        steps: ["Journeyman Electrician (4–5 yr apprenticeship)", "Master Electrician (2+ yrs + exam)", "Electrical Contractor / Business Owner"],
        pivot: "Solar / renewable energy, industrial automation, electrical inspector",
        salaryRange: "$45k–$65k journeyman; $80k–$120k+ master; $100k–$200k+ as contractor",
        notes: "Apprenticeships are earn-while-you-learn - no tuition debt. Master Electricians who run their own shop frequently earn more than most white-collar professionals. Demand is nationwide and recession-resistant.",
      },
      {
        start: "HVAC/R Helper / Apprentice",
        steps: ["HVAC Technician (2–3 yrs + EPA 608 cert)", "Senior Tech / Lead (4–6 yrs)", "Service Manager / Business Owner"],
        pivot: "Building automation systems, energy auditor, commercial refrigeration, facilities management",
        salaryRange: "$40k–$55k entry; $65k–$95k experienced; $100k–$150k+ commercial specialist",
        notes: "HVAC technicians are chronically in short supply. Commercial and industrial HVAC work pays substantially more than residential. Refrigeration certifications significantly expand opportunities.",
      },
      {
        start: "Welder Helper / Entry Welder",
        steps: ["Certified Welder (AWS certification)", "Pipe Welder / Structural Welder (3–5 yrs)", "Welding Inspector (CWI) or Supervisor"],
        pivot: "Underwater welding, aerospace fabrication, robotics/automation welding, business owner",
        salaryRange: "$40k–$55k entry; $70k–$100k certified; $80k–$180k+ specialized (underwater/pipeline)",
        notes: "Welding has enormous range - from sheet metal shops at $50k to underwater welding at $150k+. AWS certification opens doors nationally. Pipeline welding requires travel but pays exceptionally well.",
      },
      {
        start: "Automotive / Diesel Technician Apprentice",
        steps: ["ASE-Certified Tech (1–3 yrs)", "Master Tech (5–8 yrs, all 8 ASE certs)", "Shop Owner / Fleet Manager"],
        pivot: "Heavy equipment, EV/hybrid specialist, OEM dealership management, military vehicle tech",
        salaryRange: "$38k–$55k entry; $65k–$90k master tech; $100k+ dealership master tech or owner",
        notes: "EVs are reshaping the field - high-voltage EV certification is a significant differentiator right now. Diesel technicians who work on commercial trucks and heavy equipment often earn more than passenger car techs.",
      },
      {
        start: "Plumbing / Pipefitting Apprentice",
        steps: ["Journeyman Plumber (4–5 yr apprenticeship)", "Master Plumber (exam + years of experience)", "Plumbing Contractor / Business Owner"],
        pivot: "Pipefitter (industrial/commercial), gas fitter, sprinkler systems, medical gas specialist",
        salaryRange: "$45k–$65k journeyman; $80k–$110k master; $100k–$200k+ as contractor",
        notes: "Plumbing is arguably the most shortage-plagued trade in the country. Master Plumbers with their own business routinely earn six figures. Commercial and industrial work pays significantly more than residential.",
      },
    ],
  },
  {
    industry: "Healthcare Support & Allied Health",
    color: "#0891B2",
    icon: "🏥",
    tracks: [
      {
        start: "EMT-Basic (6–12 weeks training)",
        steps: ["EMT-Intermediate / Advanced (1 yr)", "Paramedic (18–24 months total)", "Flight Paramedic / EMS Supervisor / PA School"],
        pivot: "Physician Assistant (with additional education), firefighter/paramedic combo, ER tech",
        salaryRange: "$36k–$48k EMT; $55k–$80k paramedic; $90k–$130k flight paramedic",
        notes: "EMT is a fast on-ramp to healthcare. Many use it as a stepping stone to nursing or PA school. Flight paramedic is one of the most selective and highest-paying pre-hospital roles.",
      },
      {
        start: "Surgical Technologist (AAS degree, 2 yrs)",
        steps: ["CST Certification (after graduation)", "Senior Surg Tech / Specialty Tech (3–5 yrs)", "Surgical First Assist (CSFA certification)"],
        pivot: "OR management, sterile processing management, travel surgical tech (premium pay)",
        salaryRange: "$50k–$65k entry; $70k–$90k experienced; travel roles often $80k–$120k",
        notes: "One of the fastest paths into a hospital surgical environment. Travel surgical techs are in high demand nationwide with tax-free housing stipends on top of base pay.",
      },
      {
        start: "Dental Hygienist (AAS degree, 2–3 yrs)",
        steps: ["Registered Dental Hygienist (RDH)", "Lead Hygienist / Clinical Coordinator", "Public Health Hygienist or Educator"],
        pivot: "Dental assisting management, dental sales rep, dental school (DDS)",
        salaryRange: "$65k–$85k; $90k–$110k in metro areas or with multiple specialties",
        notes: "One of the highest-paying associate's-degree jobs in the country. Excellent work-life balance. High demand in underserved areas and public health.",
      },
    ],
  },
  {
    industry: "Public Safety & Community Service",
    color: "#1D4ED8",
    icon: "🚒",
    tracks: [
      {
        start: "Firefighter Recruit / Academy",
        steps: ["Firefighter I/II (certifications)", "Driver/Engineer (3–5 yrs)", "Lieutenant / Captain (competitive exam)"],
        pivot: "Fire investigator, hazmat specialist, paramedic-firefighter dual role, training officer",
        salaryRange: "$45k–$65k entry; $70k–$100k with OT and specialized certs; $80k–$130k officer rank",
        notes: "Most departments prefer candidates with EMT certification. Pension and benefits packages are exceptional compared to private sector equivalents. Many departments allow significant overtime.",
      },
      {
        start: "Law Enforcement Recruit / Academy",
        steps: ["Patrol Officer (1–3 yrs)", "Detective / Specialized Unit (3–7 yrs)", "Sergeant / Lieutenant"],
        pivot: "Federal law enforcement (FBI, DEA, ATF), private security director, investigations",
        salaryRange: "$50k–$70k entry; $70k–$100k experienced; significantly more in metro departments",
        notes: "Municipal, county, state, and federal agencies offer very different cultures and advancement paths. Many departments offer tuition assistance for degree completion.",
      },
    ],
  },
];

const UNIVERSAL_LESSONS = [
  {
    title: "The first job matters less than you think - and more than you think",
    body: "Your first job doesn't lock you into an industry or function. People switch both all the time. But it does shape your initial network and mental model of how work works. Be deliberate, but don't be paralyzed by fear of the 'wrong' choice.",
  },
  {
    title: "Skills > titles on a resume",
    body: "Hiring managers look at what you built, shipped, or fixed - not what your title was. Two people with the same title can have wildly different skill sets. Track your contributions, not your seniority.",
  },
  {
    title: "Internal transfers beat external job searches for speed",
    body: "The fastest way to change functions is often from inside the company. You have a track record, internal sponsors, and you skip the first-round screening. Before looking externally, see if the move you want is available internally.",
  },
  {
    title: "Your network is your actual career insurance",
    body: "Most senior roles are filled before they're posted. The referral matters. Invest in relationships consistently - not just when you need something. One strong internal sponsor can accelerate a promotion by years.",
  },
  {
    title: "Ask about comp early and often",
    body: "The biggest comp jumps usually happen when changing companies, not during annual reviews. Research your market rate on Levels.fyi, Glassdoor, and LinkedIn Salary. Negotiating your offer is expected - not negotiating costs you more than you think compounded over years.",
  },
];

export default function CareerPathsPage({ searchParams }: { searchParams?: { from?: string } }) {
  const from = searchParams?.from;
  const { href, label } = backNav(from);

  const isPreCollege = from === "pre-college";
  const isDuringCollege = from === "during-college";

  const title = isPreCollege
    ? "How to Choose a Major"
    : isDuringCollege
    ? "Career Paths & Specialization"
    : "Career Path Explorer";

  const subtitle = isPreCollege
    ? "What to study, why it matters less than you think, and how to explore"
    : isDuringCollege
    ? "Specializing, pivoting, and building toward your first career"
    : "Where do people go from entry-level roles?";

  if (isPreCollege) {
    return (
      <PremiumShell title={title} subtitle={subtitle}>
        <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>
          <div style={{ marginBottom: 20 }}>
            <Link href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{label}</Link>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {PRE_COLLEGE_CONTENT.map(({ id, title: sTitle, body }) => (
              <div key={id} style={{ padding: 24, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>{sTitle}</div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </PremiumShell>
    );
  }

  if (isDuringCollege) {
    return (
      <PremiumShell title={title} subtitle={subtitle}>
        <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>
          <div style={{ marginBottom: 20 }}>
            <Link href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{label}</Link>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {DURING_COLLEGE_CONTENT.map(({ id, title: sTitle, body }) => (
              <div key={id} style={{ padding: 24, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>{sTitle}</div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </PremiumShell>
    );
  }

  return (
    <PremiumShell title={title} subtitle={subtitle}>
      <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{label}</Link>
        </div>

        <p style={{ marginTop: 0, marginBottom: 32, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 760 }}>
          These are common progression paths, not guarantees. Timelines vary based on company, geography, performance, and how aggressively you navigate. Use these as orientation, not a script.
        </p>

        {/* Industry paths */}
        <div style={{ display: "grid", gap: 20, marginBottom: 36 }}>
          {PATHS.map(({ industry, color, icon, tracks }) => (
            <div key={industry} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ fontSize: 17, fontWeight: 800, color }}>{industry}</div>
              </div>
              <div style={{ padding: 24, display: "grid", gap: 24 }}>
                {tracks.map((track) => (
                  <div key={track.start} style={{ padding: 18, borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
                      Starting point: <span style={{ color }}>{track.start}</span>
                    </div>

                    {/* Steps */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
                      <div style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: color, color: "#fff", fontSize: 12, fontWeight: 700 }}>{track.start}</div>
                      {track.steps.map((step) => (
                        <>
                          <span key={`arrow-${step}`} style={{ color: "var(--text-soft)", fontSize: 14 }}>→</span>
                          <div key={step} style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}`, color, fontSize: 12, fontWeight: 700 }}>{step}</div>
                        </>
                      ))}
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Common pivot: </span>{track.pivot}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Salary range: </span>{track.salaryRange}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Reality check: </span>{track.notes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Universal lessons */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16 }}>THINGS THAT APPLY TO EVERY PATH</div>
          <div style={{ display: "grid", gap: 12 }}>
            {UNIVERSAL_LESSONS.map(({ title: lessonTitle, body }) => (
              <div key={lessonTitle} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{lessonTitle}</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 28, padding: "18px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Tell us where you landed - help build the salary benchmarks for your peers.</div>
          <Link href="/career-checkin" style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>
            Career check-in →
          </Link>
        </div>

        {/* Occupation browser */}
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)" }}>BROWSE ALL OCCUPATIONS</div>
            <Link href="/aptitude" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
              Take Career Assessment to find your match →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {OCCUPATIONS.map(occ => {
              const risk = aiRiskLabel(occ.aiRisk);
              return (
                <Link key={occ.id} href={`/career-guide/career-paths/${occ.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", transition: "border-color 150ms" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: risk.color, marginBottom: 3 }}>{occ.aiRisk}% AI risk</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>{occ.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>${occ.salary[0]}K–${occ.salary[1]}K</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
