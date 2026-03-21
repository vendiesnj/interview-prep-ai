export type Dimension =
  | "teamwork"
  | "leadership"
  | "communication"
  | "criticalThinking"
  | "professionalism"
  | "adaptability"
  | "equityInclusion";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  teamwork: "Teamwork",
  leadership: "Leadership",
  communication: "Communication",
  criticalThinking: "Critical Thinking",
  professionalism: "Professionalism",
  adaptability: "Adaptability",
  equityInclusion: "Equity & Inclusion",
};

export const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  teamwork: "How you collaborate, support, and share with others",
  leadership: "How you take ownership, initiative, and influence",
  communication: "How you exchange information and handle difficult conversations",
  criticalThinking: "How you analyze, decide, and solve problems",
  professionalism: "How you handle ethics, accountability, and boundaries",
  adaptability: "How you respond to change, ambiguity, and pressure",
  equityInclusion: "How you recognize, respond to, and actively support equity and inclusion",
};

export interface Choice {
  text: string;
  dimensions: Partial<Record<Dimension, number>>; // 0-1 contribution to each dim
  insight: string; // what this choice reveals
}

export interface Scenario {
  id: string;
  category: Dimension;
  label: string;
  situation: string;
  choices: [Choice, Choice, Choice, Choice];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "s01",
    category: "teamwork",
    label: "Late Night Crunch",
    situation:
      "It's 8pm the night before a big presentation. A teammate messages saying they're stuck and might not finish their section. You've already completed yours.",
    choices: [
      {
        text: "Jump in and help them — we sink or swim together",
        dimensions: { teamwork: 1.0, communication: 0.6, adaptability: 0.5 },
        insight: "You treat team success as inseparable from personal success, even at personal cost.",
      },
      {
        text: "Send some resources, but the work is theirs to finish",
        dimensions: { teamwork: 0.6, professionalism: 0.8, communication: 0.5 },
        insight: "You support without over-functioning — clear on where your responsibility ends.",
      },
      {
        text: "Escalate to your manager so they can make the call",
        dimensions: { communication: 0.9, professionalism: 0.7, leadership: 0.4 },
        insight: "You default to transparency and involve leadership early — risk-aware rather than heroic.",
      },
      {
        text: "Redistribute their section to other teammates now",
        dimensions: { leadership: 1.0, teamwork: 0.7, adaptability: 0.7 },
        insight: "You're a fast decision-maker who prioritizes the outcome over individual ownership.",
      },
    ],
  },
  {
    id: "s02",
    category: "communication",
    label: "Stolen Credit",
    situation:
      "In a team meeting, a colleague presents an idea you developed together — but frames it entirely as their own. Your manager gives them strong praise.",
    choices: [
      {
        text: "Speak up in the meeting: 'I also worked on this'",
        dimensions: { communication: 1.0, leadership: 0.8, professionalism: 0.6 },
        insight: "You advocate for yourself directly and don't let the moment pass — high self-advocacy.",
      },
      {
        text: "Say nothing now, but address it privately with them afterward",
        dimensions: { communication: 0.8, professionalism: 0.9, teamwork: 0.5 },
        insight: "You choose relationship preservation and private resolution over public correction.",
      },
      {
        text: "Let it go — credit matters less than the work itself",
        dimensions: { adaptability: 0.8, teamwork: 0.6, professionalism: 0.5 },
        insight: "You have a high threshold for credit disputes — mission-focused over recognition-focused.",
      },
      {
        text: "Mention your contributions to your manager one-on-one later",
        dimensions: { communication: 0.7, professionalism: 0.8, leadership: 0.5 },
        insight: "You protect your interests through strategic relationship-building rather than confrontation.",
      },
    ],
  },
  {
    id: "s03",
    category: "leadership",
    label: "Stretch Assignment",
    situation:
      "Your manager asks you to lead a cross-functional project. You're excited, but you genuinely don't have all the skills it requires. The deadline is 6 weeks.",
    choices: [
      {
        text: "Say yes and figure it out as you go",
        dimensions: { leadership: 1.0, adaptability: 1.0, criticalThinking: 0.4 },
        insight: "You're a high-confidence risk-taker who learns by doing, not by waiting to be ready.",
      },
      {
        text: "Accept, but immediately identify what training or help you need",
        dimensions: { leadership: 0.9, criticalThinking: 0.9, communication: 0.8 },
        insight: "You combine ambition with self-awareness — willing to stretch but not recklessly.",
      },
      {
        text: "Negotiate the scope so it fits your actual skill level",
        dimensions: { communication: 0.9, professionalism: 0.8, criticalThinking: 0.7 },
        insight: "You prioritize quality over optics — honest about capacity, even if it looks less confident.",
      },
      {
        text: "Suggest a more senior colleague and offer to support instead",
        dimensions: { teamwork: 0.8, professionalism: 0.7, communication: 0.6 },
        insight: "You optimize for team outcome over personal opportunity — cautious about overreach.",
      },
    ],
  },
  {
    id: "s04",
    category: "criticalThinking",
    label: "Contradicting Data",
    situation:
      "You're one hour from a client deadline. Your analysis shows the opposite of what your team's prior research found. Neither can obviously be wrong.",
    choices: [
      {
        text: "Send your version — you've checked it twice, stand behind it",
        dimensions: { leadership: 0.9, criticalThinking: 0.8, professionalism: 0.6 },
        insight: "You trust your own analysis and act decisively under pressure — high individual confidence.",
      },
      {
        text: "Flag the discrepancy to the team and delay if needed",
        dimensions: { communication: 1.0, teamwork: 0.8, professionalism: 0.9 },
        insight: "You treat accuracy as non-negotiable even when it creates friction — integrity over speed.",
      },
      {
        text: "Send the prior version since it's already validated",
        dimensions: { adaptability: 0.6, professionalism: 0.5, teamwork: 0.6 },
        insight: "You default to consensus and existing validation under high uncertainty.",
      },
      {
        text: "Present both findings with caveats and let the client decide",
        dimensions: { communication: 0.9, criticalThinking: 0.9, adaptability: 0.7 },
        insight: "You're comfortable with ambiguity and transparent about it — data-honest over confident.",
      },
    ],
  },
  {
    id: "s05",
    category: "teamwork",
    label: "Teammate Conflict",
    situation:
      "Two colleagues you work closely with are having an escalating conflict. It's affecting team morale and your own productivity. Neither has asked for your help.",
    choices: [
      {
        text: "Stay out of it — it's not your dynamic to manage",
        dimensions: { professionalism: 0.8, adaptability: 0.6, teamwork: 0.3 },
        insight: "You maintain clear personal boundaries around interpersonal dynamics that aren't yours.",
      },
      {
        text: "Suggest the three of you talk through it together",
        dimensions: { teamwork: 1.0, communication: 0.9, leadership: 0.7 },
        insight: "You step into conflict as a peacemaker — prioritize cohesion over comfort.",
      },
      {
        text: "Talk to each of them separately to understand both sides",
        dimensions: { communication: 0.8, teamwork: 0.8, criticalThinking: 0.7 },
        insight: "You take an investigative approach — want to understand before taking any action.",
      },
      {
        text: "Let your manager know it's affecting the team's work",
        dimensions: { communication: 0.8, professionalism: 0.8, leadership: 0.5 },
        insight: "You involve leadership early when the problem is becoming a structural one.",
      },
    ],
  },
  {
    id: "s06",
    category: "professionalism",
    label: "Public Feedback",
    situation:
      "Your manager critiques your work directly in front of the whole team — some of the feedback feels unfair. The team is watching your reaction.",
    choices: [
      {
        text: "Listen fully, thank them, and address it privately later",
        dimensions: { professionalism: 1.0, communication: 0.8, adaptability: 0.7 },
        insight: "You regulate well under pressure and pick your battles strategically.",
      },
      {
        text: "Respectfully push back in the moment on the points that feel wrong",
        dimensions: { communication: 1.0, leadership: 0.8, professionalism: 0.6 },
        insight: "You're comfortable with constructive friction — advocate for your perspective even publicly.",
      },
      {
        text: "Stay quiet, absorb it, and process later",
        dimensions: { adaptability: 0.7, professionalism: 0.6, teamwork: 0.5 },
        insight: "You internalize rather than react — slow to respond, thoughtful in recovery.",
      },
      {
        text: "Follow up with your manager to understand where it came from",
        dimensions: { communication: 0.9, criticalThinking: 0.8, professionalism: 0.8 },
        insight: "You want context before conclusions — curious about the root cause, not just the critique.",
      },
    ],
  },
  {
    id: "s07",
    category: "professionalism",
    label: "Quiet Error",
    situation:
      "While reviewing a project, you find a minor billing error that no one has caught — and it happens to benefit your department's budget by $2,000.",
    choices: [
      {
        text: "Report it immediately to accounting — no question",
        dimensions: { professionalism: 1.0, communication: 0.8, leadership: 0.5 },
        insight: "You don't tolerate ethical ambiguity regardless of benefit — zero-compromise on integrity.",
      },
      {
        text: "Flag it to your manager first before touching it",
        dimensions: { professionalism: 0.9, communication: 0.9, teamwork: 0.6 },
        insight: "You involve leadership in gray-area decisions — cautious about unilateral action.",
      },
      {
        text: "Investigate how it happened before escalating",
        dimensions: { criticalThinking: 0.9, professionalism: 0.7, leadership: 0.6 },
        insight: "You want to understand the system before fixing a symptom — root-cause minded.",
      },
      {
        text: "Wait to see if anyone else notices — could be intentional",
        dimensions: { adaptability: 0.5, professionalism: 0.3, criticalThinking: 0.4 },
        insight: "You avoid risk by deferring action — sometimes helpful, sometimes a liability.",
      },
    ],
  },
  {
    id: "s08",
    category: "criticalThinking",
    label: "Inefficient Process",
    situation:
      "You're new to a team and realize that a process everyone follows is wasting about 4 hours per person per week. No one seems to notice or care.",
    choices: [
      {
        text: "Map out the problem and present a proposal to leadership",
        dimensions: { leadership: 1.0, criticalThinking: 0.9, communication: 0.8 },
        insight: "You don't wait for permission to improve things — structurally proactive.",
      },
      {
        text: "Ask the team why the process works that way before assuming it doesn't",
        dimensions: { teamwork: 0.8, criticalThinking: 0.9, communication: 0.8 },
        insight: "You check for hidden context before acting — humble about institutional knowledge.",
      },
      {
        text: "Change how you personally do it and let the results speak",
        dimensions: { leadership: 0.8, adaptability: 0.9, professionalism: 0.5 },
        insight: "You lead by example rather than advocacy — show, don't tell.",
      },
      {
        text: "Mention it casually to a trusted colleague and gauge the reaction",
        dimensions: { communication: 0.6, teamwork: 0.7, adaptability: 0.6 },
        insight: "You test the political landscape before committing — read the room first.",
      },
    ],
  },
  {
    id: "s09",
    category: "communication",
    label: "Bad News",
    situation:
      "Your project is two days behind schedule. Your manager hasn't asked yet, but the delay is going to affect two other teams who are counting on your output.",
    choices: [
      {
        text: "Send an update to everyone affected immediately",
        dimensions: { communication: 1.0, professionalism: 0.9, teamwork: 0.8 },
        insight: "You prioritize transparency over optics — others' planning matters more than your discomfort.",
      },
      {
        text: "Tell your manager first and let them decide how to communicate it",
        dimensions: { professionalism: 0.9, communication: 0.7, teamwork: 0.6 },
        insight: "You respect the chain of command and don't jump over your manager in a sensitive moment.",
      },
      {
        text: "Work through the weekend and try to eliminate the delay before anyone notices",
        dimensions: { adaptability: 0.7, leadership: 0.6, professionalism: 0.4 },
        insight: "You prefer to solve before you disclose — high internal drive, potentially poor communication habit.",
      },
      {
        text: "Alert the other teams directly — they need time to replan",
        dimensions: { communication: 0.9, teamwork: 1.0, adaptability: 0.7 },
        insight: "You center stakeholder impact over hierarchy — cross-functional and collaborative.",
      },
    ],
  },
  {
    id: "s10",
    category: "adaptability",
    label: "Total Pivot",
    situation:
      "After 3 weeks of work, leadership changes the project direction entirely. Everything you built is now irrelevant. The new direction starts tomorrow.",
    choices: [
      {
        text: "Push back and explain the cost of the pivot before accepting it",
        dimensions: { communication: 0.9, leadership: 0.8, criticalThinking: 0.8 },
        insight: "You hold leadership accountable for decisions — don't absorb sunken costs silently.",
      },
      {
        text: "Accept it and immediately start planning for the new direction",
        dimensions: { adaptability: 1.0, leadership: 0.8, professionalism: 0.7 },
        insight: "You disengage from sunk costs quickly — forward-focused and emotionally resilient.",
      },
      {
        text: "Request a meeting to understand why before fully committing",
        dimensions: { communication: 0.8, criticalThinking: 0.9, professionalism: 0.7 },
        insight: "You need context to commit — motivated by understanding, not just instruction.",
      },
      {
        text: "Document what was built before pivoting — it may be useful later",
        dimensions: { criticalThinking: 0.8, professionalism: 0.8, adaptability: 0.6 },
        insight: "You preserve institutional knowledge even mid-pivot — systematic and long-term minded.",
      },
    ],
  },
  {
    id: "s11",
    category: "leadership",
    label: "CEO Encounter",
    situation:
      "At a company event, you end up alone in the elevator with the CEO for 45 seconds. You've had an idea you believe could really help the company.",
    choices: [
      {
        text: "Share the idea — this is exactly the kind of moment you need",
        dimensions: { leadership: 1.0, communication: 0.9, adaptability: 0.8 },
        insight: "You seize high-stakes opportunities without hesitation — confident and opportunity-aware.",
      },
      {
        text: "Introduce yourself and keep it relational, not transactional",
        dimensions: { communication: 0.9, teamwork: 0.7, professionalism: 0.8 },
        insight: "You build relationships before pitching — long-term minded, not opportunistic.",
      },
      {
        text: "Say hi, stay professional, and find a proper channel for the idea",
        dimensions: { professionalism: 0.9, communication: 0.6, adaptability: 0.6 },
        insight: "You respect structure and don't jump channels — even when the shortcut presents itself.",
      },
      {
        text: "Ask a genuine question about where the company is headed",
        dimensions: { criticalThinking: 0.8, communication: 0.8, leadership: 0.7 },
        insight: "You use access to gather intelligence, not to sell — strategic and curious.",
      },
    ],
  },
  {
    id: "s12",
    category: "adaptability",
    label: "Overloaded",
    situation:
      "Three different managers send you urgent requests on the same morning. You can realistically complete one and a half of them by end of day.",
    choices: [
      {
        text: "Rank them by business impact and start with the highest",
        dimensions: { criticalThinking: 1.0, leadership: 0.8, adaptability: 0.8 },
        insight: "You triage by value, not by who asked — systematic under pressure.",
      },
      {
        text: "Reply to all three with your capacity and ask them to prioritize",
        dimensions: { communication: 1.0, professionalism: 0.9, adaptability: 0.8 },
        insight: "You create shared visibility around trade-offs — transparent, not heroic.",
      },
      {
        text: "Start all three simultaneously and deliver whatever you can",
        dimensions: { adaptability: 0.6, professionalism: 0.4, teamwork: 0.5 },
        insight: "You try to serve everyone at once — risk of spreading too thin without managing expectations.",
      },
      {
        text: "Ask your direct manager which to prioritize and follow their lead",
        dimensions: { professionalism: 0.8, communication: 0.7, teamwork: 0.6 },
        insight: "You respect hierarchy in ambiguous situations and use escalation as a tool.",
      },
    ],
  },
  {
    id: "s13",
    category: "professionalism",
    label: "Off-Color Joke",
    situation:
      "At a team lunch, a colleague makes a joke that lands as racially insensitive. A few people laugh awkwardly. No one says anything.",
    choices: [
      {
        text: "Say something in the moment — 'I don't think that lands right'",
        dimensions: { communication: 1.0, professionalism: 1.0, leadership: 0.9 },
        insight: "You intervene directly even when it's uncomfortable — high psychological safety and moral courage.",
      },
      {
        text: "Check in privately with anyone who seemed affected",
        dimensions: { teamwork: 1.0, communication: 0.8, professionalism: 0.8 },
        insight: "You prioritize support for affected people over public correction — relational, not performative.",
      },
      {
        text: "Address it with your colleague privately later",
        dimensions: { communication: 0.8, professionalism: 0.9, adaptability: 0.6 },
        insight: "You believe in private accountability over public shaming — relationship-first approach.",
      },
      {
        text: "Report it to HR or your manager",
        dimensions: { professionalism: 0.9, communication: 0.7, teamwork: 0.5 },
        insight: "You use formal channels for formal violations — process-oriented and risk-aware.",
      },
    ],
  },
  {
    id: "s14",
    category: "communication",
    label: "Missed Deadline",
    situation:
      "It's 2 hours before a project deadline and you realize you will not make it. You've never missed a deadline before.",
    choices: [
      {
        text: "Message your stakeholders immediately with an updated ETA",
        dimensions: { communication: 1.0, professionalism: 1.0, teamwork: 0.8 },
        insight: "You communicate failure proactively — high accountability and stakeholder-awareness.",
      },
      {
        text: "Push hard for the next 2 hours and deliver what you can",
        dimensions: { adaptability: 0.7, leadership: 0.7, professionalism: 0.5 },
        insight: "You prefer to show up with something rather than nothing — action-biased.",
      },
      {
        text: "Tell your manager first before going to other stakeholders",
        dimensions: { professionalism: 0.9, communication: 0.8, teamwork: 0.6 },
        insight: "You manage upward first — protect your manager's ability to respond before surprises hit.",
      },
      {
        text: "Ask for a quick extension rather than delivering late without notice",
        dimensions: { communication: 0.9, professionalism: 0.8, criticalThinking: 0.7 },
        insight: "You'd rather renegotiate the contract than break it — clear about what's actually deliverable.",
      },
    ],
  },
  {
    id: "s15",
    category: "criticalThinking",
    label: "Missing Information",
    situation:
      "Your team is stuck waiting on a key piece of data from another department. You need it to make a major product decision. They won't have it for 2 more weeks.",
    choices: [
      {
        text: "Make the decision now using available data and assumptions",
        dimensions: { leadership: 1.0, criticalThinking: 0.8, adaptability: 0.8 },
        insight: "You're comfortable making high-stakes decisions under uncertainty — decisive by nature.",
      },
      {
        text: "Document your assumptions and get sign-off before proceeding",
        dimensions: { criticalThinking: 1.0, professionalism: 0.9, communication: 0.8 },
        insight: "You make the decision, but with explicit accountability — structured and risk-managed.",
      },
      {
        text: "Wait the 2 weeks — a bad decision is worse than a late one",
        dimensions: { criticalThinking: 0.7, professionalism: 0.8, adaptability: 0.4 },
        insight: "You're risk-averse under incomplete information — prefers certainty over speed.",
      },
      {
        text: "Find a proxy data source and test assumptions with a smaller experiment",
        dimensions: { criticalThinking: 1.0, adaptability: 0.9, leadership: 0.8 },
        insight: "You create information when it doesn't exist — resourceful and hypothesis-driven.",
      },
    ],
  },
  {
    id: "s16",
    category: "leadership",
    label: "Your Mistake, Their Pain",
    situation:
      "A recommendation you made three weeks ago turned out to be wrong. It cost the team significant rework. No one has connected the dots back to you yet.",
    choices: [
      {
        text: "Own it proactively — tell your manager before anyone else does",
        dimensions: { professionalism: 1.0, communication: 1.0, leadership: 0.9 },
        insight: "You own failure the same way you own success — accountability is a core identity for you.",
      },
      {
        text: "Investigate what went wrong in your analysis first, then disclose",
        dimensions: { criticalThinking: 0.9, professionalism: 0.8, communication: 0.7 },
        insight: "You show up with answers, not just admissions — want to understand before you explain.",
      },
      {
        text: "Acknowledge it when it naturally comes up, but don't surface it",
        dimensions: { adaptability: 0.5, professionalism: 0.4, communication: 0.4 },
        insight: "You manage disclosure passively — may avoid discomfort at the cost of trust.",
      },
      {
        text: "Focus on fixing the rework now rather than assigning blame",
        dimensions: { teamwork: 0.9, adaptability: 0.8, professionalism: 0.6 },
        insight: "You're solution-first — sometimes at the cost of transparency and accountability.",
      },
    ],
  },
  {
    id: "s17",
    category: "teamwork",
    label: "Low Performer",
    situation:
      "A teammate consistently submits work below the quality standard. The rest of the team is quietly covering for them. It's been going on for months.",
    choices: [
      {
        text: "Talk directly to the teammate — maybe they don't know they're struggling",
        dimensions: { communication: 1.0, teamwork: 0.9, leadership: 0.8 },
        insight: "You believe in direct feedback as an act of respect — high interpersonal courage.",
      },
      {
        text: "Raise it with your manager — this is a management problem, not yours",
        dimensions: { professionalism: 0.9, communication: 0.7, leadership: 0.6 },
        insight: "You recognize the limits of your role — won't take on authority you don't have.",
      },
      {
        text: "Keep covering — the team dynamic is more important than making waves",
        dimensions: { teamwork: 0.6, adaptability: 0.5, professionalism: 0.3 },
        insight: "You protect harmony over accountability — high tolerance for friction, but may enable problems.",
      },
      {
        text: "Stop covering their work and let the natural consequences surface",
        dimensions: { professionalism: 0.8, leadership: 0.7, adaptability: 0.6 },
        insight: "You believe consequences create clarity — willing to let something fail for the right reasons.",
      },
    ],
  },
  {
    id: "s18",
    category: "communication",
    label: "Idea Blocked",
    situation:
      "You have a genuinely strong idea, but your manager has already committed to a different direction in front of leadership. They're not receptive when you raise it.",
    choices: [
      {
        text: "Drop it — your manager has made the call, support the plan",
        dimensions: { teamwork: 0.8, professionalism: 0.7, adaptability: 0.7 },
        insight: "You commit to decisions once made — even ones you disagree with. High organizational loyalty.",
      },
      {
        text: "Document the idea and bring it up again after this project ends",
        dimensions: { criticalThinking: 0.9, adaptability: 0.8, professionalism: 0.8 },
        insight: "You're persistent but patient — ideas don't die, they wait for the right moment.",
      },
      {
        text: "Find a small way to test your idea in parallel without disrupting the plan",
        dimensions: { leadership: 0.9, adaptability: 0.9, criticalThinking: 0.8 },
        insight: "You believe in empirical persuasion — prove the idea, don't argue for it.",
      },
      {
        text: "Request a formal 20-minute meeting to present the tradeoffs clearly",
        dimensions: { communication: 1.0, leadership: 0.8, professionalism: 0.8 },
        insight: "You fight for ideas through structure, not emotion — data-driven and diplomatically persistent.",
      },
    ],
  },
  {
    id: "s19",
    category: "adaptability",
    label: "New Team Culture",
    situation:
      "You join a team where everyone has been working together for 3 years. They have strong unwritten norms and push back when you suggest anything different.",
    choices: [
      {
        text: "Learn their ways for 30 days before suggesting changes",
        dimensions: { adaptability: 0.9, teamwork: 0.9, criticalThinking: 0.8 },
        insight: "You understand that trust comes before influence — disciplined about earning your voice.",
      },
      {
        text: "Ask directly: 'How open is this team to trying new approaches?'",
        dimensions: { communication: 1.0, leadership: 0.7, adaptability: 0.7 },
        insight: "You name the dynamic before navigating it — transparent about your own approach.",
      },
      {
        text: "Quietly adapt to their culture — resistance is rarely worth the cost",
        dimensions: { adaptability: 0.8, teamwork: 0.7, professionalism: 0.5 },
        insight: "You're a cultural chameleon — highly flexible, possibly at the cost of your own perspective.",
      },
      {
        text: "Find one ally on the team and start there",
        dimensions: { teamwork: 0.9, leadership: 0.7, communication: 0.7 },
        insight: "You build from the inside out — change through relationships, not announcements.",
      },
    ],
  },
  {
    id: "s20",
    category: "leadership",
    label: "Unearned Recognition",
    situation:
      "Your manager publicly praises a colleague for a project outcome that you both contributed to equally — but your colleague got far more visible credit.",
    choices: [
      {
        text: "Approach your manager privately to share your contributions",
        dimensions: { communication: 0.9, leadership: 0.8, professionalism: 0.9 },
        insight: "You advocate for visibility without creating conflict — assertive through appropriate channels.",
      },
      {
        text: "Congratulate your colleague genuinely — this time it went their way",
        dimensions: { teamwork: 1.0, adaptability: 0.8, professionalism: 0.7 },
        insight: "You separate recognition from motivation — still show up at full effort regardless.",
      },
      {
        text: "Make sure the next project has your name clearly attached from the start",
        dimensions: { leadership: 0.9, criticalThinking: 0.8, communication: 0.7 },
        insight: "You learn and adjust structurally — won't make the same visibility mistake twice.",
      },
      {
        text: "Let it go — over a career, credit tends to even out",
        dimensions: { adaptability: 0.7, professionalism: 0.6, teamwork: 0.5 },
        insight: "You take the long view on fairness — high patience, low reactivity.",
      },
    ],
  },

  // ── Equity & Inclusion scenarios ─────────────────────────────────────────

  {
    id: "s21",
    category: "equityInclusion",
    label: "Talked Over",
    situation:
      "In a team meeting, a junior colleague keeps getting interrupted mid-sentence. Their ideas are substantive, but the conversation keeps moving past them without acknowledgment.",
    choices: [
      {
        text: "Say something in the moment: 'I think [name] was making a point — let's hear it'",
        dimensions: { equityInclusion: 1.0, communication: 0.9, leadership: 0.8 },
        insight: "You intervene directly when you see someone being excluded — high psychological safety and moral courage.",
      },
      {
        text: "Make a point of asking the colleague for their input directly",
        dimensions: { equityInclusion: 0.9, teamwork: 0.9, communication: 0.7 },
        insight: "You redirect rather than confront — creates space without triggering defensiveness.",
      },
      {
        text: "Mention it to the meeting facilitator privately afterward",
        dimensions: { equityInclusion: 0.7, communication: 0.8, professionalism: 0.7 },
        insight: "You work through the right channel — procedural rather than in-the-moment.",
      },
      {
        text: "Check in with the colleague after the meeting to see if they're okay",
        dimensions: { equityInclusion: 0.6, teamwork: 0.8, communication: 0.7 },
        insight: "You prioritize the person's experience over the system — relational and supportive.",
      },
    ],
  },

  {
    id: "s22",
    category: "equityInclusion",
    label: "Holiday Conflict",
    situation:
      "Your team schedules an important optional team event on a religious holiday. A colleague who observes that holiday says nothing but looks visibly uncomfortable when it's announced.",
    choices: [
      {
        text: "Suggest rescheduling before the event is confirmed: 'We should check for conflicts first'",
        dimensions: { equityInclusion: 1.0, communication: 0.9, professionalism: 0.8 },
        insight: "You address inclusion proactively, before harm is done — systemic, not just reactive.",
      },
      {
        text: "Privately check in with the colleague and advocate for a change if they want one",
        dimensions: { equityInclusion: 0.9, teamwork: 0.9, communication: 0.8 },
        insight: "You center the affected person's agency — ask first, act second.",
      },
      {
        text: "Suggest the team build a shared calendar of religious observances going forward",
        dimensions: { equityInclusion: 0.9, leadership: 0.7, criticalThinking: 0.8 },
        insight: "You solve structurally — address the root cause so this doesn't recur.",
      },
      {
        text: "Hope the colleague speaks up if they're affected — it's not your place to assume",
        dimensions: { equityInclusion: 0.2, adaptability: 0.4, professionalism: 0.3 },
        insight: "You avoid assumption but may leave the burden entirely on the affected person to advocate for themselves.",
      },
    ],
  },

  {
    id: "s23",
    category: "equityInclusion",
    label: "Informal Exclusion",
    situation:
      "You notice that a new hire — who comes from a very different background than the rest of the team — is never included in the informal Slack channels and after-work conversations where real relationships form.",
    choices: [
      {
        text: "Directly invite them into the channels and introduce them to the group",
        dimensions: { equityInclusion: 1.0, teamwork: 1.0, communication: 0.8 },
        insight: "You act rather than observe — include actively, not passively.",
      },
      {
        text: "Mention the pattern to your manager as a team culture observation",
        dimensions: { equityInclusion: 0.8, leadership: 0.7, communication: 0.8 },
        insight: "You escalate structural issues — understand that culture problems require leadership attention.",
      },
      {
        text: "Build a personal relationship with the new hire and bring them into your network",
        dimensions: { equityInclusion: 0.8, teamwork: 0.9, adaptability: 0.6 },
        insight: "You start where you have influence — individual action in service of belonging.",
      },
      {
        text: "Assume they'll find their way in — it just takes time on any new team",
        dimensions: { equityInclusion: 0.2, adaptability: 0.5, teamwork: 0.3 },
        insight: "You normalize the pattern — may underestimate that informal exclusion compounds over time.",
      },
    ],
  },

  {
    id: "s24",
    category: "equityInclusion",
    label: "Client Language",
    situation:
      "During a client call, the client uses an outdated and potentially offensive term for a demographic group. Your teammates say nothing. The call continues.",
    choices: [
      {
        text: "Gently redirect in the moment: 'Just to note, the more current term is...'",
        dimensions: { equityInclusion: 1.0, communication: 1.0, professionalism: 0.8 },
        insight: "You correct even in high-stakes external settings — high-conviction, high-risk intervention.",
      },
      {
        text: "Raise it with your team lead after the call to decide how to handle with the client",
        dimensions: { equityInclusion: 0.8, professionalism: 0.9, communication: 0.8 },
        insight: "You involve the right stakeholders before acting externally — politically aware but still action-oriented.",
      },
      {
        text: "Note it internally and raise it if it happens again",
        dimensions: { equityInclusion: 0.5, adaptability: 0.6, criticalThinking: 0.5 },
        insight: "You choose your battles — first offense gets documented, not escalated.",
      },
      {
        text: "Say nothing — correcting a client mid-call could damage the relationship",
        dimensions: { equityInclusion: 0.1, professionalism: 0.4, adaptability: 0.3 },
        insight: "You prioritize the business relationship over the inclusion signal — may normalize harmful language.",
      },
    ],
  },

  {
    id: "s25",
    category: "equityInclusion",
    label: "Calibration Gap",
    situation:
      "You're on a peer feedback panel for performance reviews. You notice a high-performing colleague consistently receives lower ratings than peers with nearly identical output. The colleague is one of few people from an underrepresented group on the team.",
    choices: [
      {
        text: "Name the pattern directly: 'I want to flag that this person's ratings may not reflect their output'",
        dimensions: { equityInclusion: 1.0, leadership: 0.9, communication: 0.9, professionalism: 0.8 },
        insight: "You're willing to challenge group consensus when you see a pattern that looks like bias — high integrity, high risk.",
      },
      {
        text: "Provide specific evidence of their contributions to counterbalance the ratings",
        dimensions: { equityInclusion: 0.9, criticalThinking: 1.0, communication: 0.8 },
        insight: "You argue with data, not accusation — evidence-based approach to bias correction.",
      },
      {
        text: "Talk to HR about what you observed after the panel concludes",
        dimensions: { equityInclusion: 0.7, professionalism: 0.8, communication: 0.7 },
        insight: "You use the right channel — formal process over in-the-moment confrontation.",
      },
      {
        text: "You're not sure it's bias — stay quiet to avoid making it about something it might not be",
        dimensions: { equityInclusion: 0.1, adaptability: 0.4, criticalThinking: 0.3 },
        insight: "You default to uncertainty over action — risk of inaction when patterns are statistically visible.",
      },
    ],
  },
];

export function getRandomScenarios(count: number = 10): Scenario[] {
  const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function computeSessionDimensions(
  responses: Array<{ scenarioId: string; choiceIndex: number }>
): Record<Dimension, number> {
  const totals: Record<Dimension, number> = {
    teamwork: 0,
    leadership: 0,
    communication: 0,
    criticalThinking: 0,
    professionalism: 0,
    adaptability: 0,
    equityInclusion: 0,
  };
  const counts: Record<Dimension, number> = { ...totals };

  for (const r of responses) {
    const scenario = SCENARIOS.find((s) => s.id === r.scenarioId);
    if (!scenario) continue;
    const choice = scenario.choices[r.choiceIndex];
    if (!choice) continue;
    for (const [dim, val] of Object.entries(choice.dimensions) as [Dimension, number][]) {
      totals[dim] += val;
      counts[dim]++;
    }
  }

  const result: Record<Dimension, number> = { ...totals };
  for (const dim of Object.keys(totals) as Dimension[]) {
    // equityInclusion: return 0 when no E&I scenarios were played (no fabricated neutral score)
    // All other dimensions: 0.5 neutral when no samples yet
    const fallback = dim === "equityInclusion" ? 0 : 0.5;
    result[dim] = counts[dim] > 0 ? Math.round((totals[dim] / counts[dim]) * 100) / 100 : fallback;
  }
  return result;
}
