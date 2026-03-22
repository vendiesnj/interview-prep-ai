"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

// ── Archetypes ─────────────────────────────────────────────────────────────
type Cat = "A" | "B" | "C" | "H" | "L" | "M" | "T";

const ARCHETYPES: Record<Cat, {
  name: string;
  tagline: string;
  color: string;
  bg: string;
  traits: string[];
  description: string;
  careers: string[];
  majors: string[];
  salary: string;
}> = {
  A: {
    name: "The Analyst",
    tagline: "Logical · Data-driven · Systematic",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.08)",
    traits: ["Logical", "Curious", "Evidence-based", "Precise", "Strategic thinker"],
    description:
      "You're energized by complex problems and find deep satisfaction in turning data into clarity. You ask \"why\" before \"how\" and trust rigorous analysis over gut feeling. Analysts are the people who see the pattern in the noise — and build the systems that make sense of it. You thrive in roles that reward intellectual depth over speed.",
    careers: [
      "Data Scientist",
      "Research Analyst",
      "Software Engineer",
      "Financial Analyst",
      "Actuary",
      "UX Researcher",
      "Economist",
      "Biostatistician",
    ],
    majors: ["Computer Science", "Statistics & Data Science", "Economics", "Mathematics", "Biomedical Engineering"],
    salary: "$70K–$145K+",
  },
  B: {
    name: "The Builder",
    tagline: "Systematic · Engineering-minded · Design-driven",
    color: "#D97706",
    bg: "rgba(217,119,6,0.08)",
    traits: ["Systematic", "Precise", "Resourceful", "Innovative", "Detail-oriented"],
    description:
      "You're energized by the challenge of designing and engineering systems that work. You love understanding how things function at a deep level — and then making them better. Builders thrive where technical knowledge meets structured problem-solving: engineering, architecture, product development, and advanced manufacturing. You want to see your designs become real things people depend on.",
    careers: [
      "Mechanical Engineer",
      "Civil Engineer",
      "Architect",
      "Product Designer",
      "Industrial Engineer",
      "Biomedical Engineer",
      "Construction Manager",
      "Manufacturing Engineer",
    ],
    majors: ["Mechanical Engineering", "Civil Engineering", "Architecture", "Industrial Design", "Computer Engineering"],
    salary: "$65K–$135K+",
  },
  T: {
    name: "The Technician",
    tagline: "Skilled · Precise · Master of the craft",
    color: "#92400E",
    bg: "rgba(146,64,14,0.08)",
    traits: ["Skilled", "Methodical", "Self-reliant", "Reliable", "Hands-on problem-solver"],
    description:
      "You learn best by doing and you're never more satisfied than when you've solved a real-world technical problem with your own hands. Whether it's wiring a building, diagnosing an engine, welding structural steel, or troubleshooting an HVAC system, you bring mastery and precision to physical work. Technicians are in enormous demand, earn excellent incomes, and often achieve financial independence faster than many four-year degree graduates. The trades are the backbone of modern infrastructure.",
    careers: [
      "Electrician (Journeyman / Master)",
      "Plumber / Pipefitter",
      "HVAC/R Technician",
      "Automotive / Diesel Technician",
      "Welder / Fabricator",
      "CNC Machinist / Operator",
      "Aircraft Mechanic / Avionics Tech",
      "Wind Turbine / Solar Technician",
    ],
    majors: ["Electrical Technology", "HVAC/R Technology", "Welding Technology", "Automotive Technology", "Aviation Maintenance", "Plumbing & Pipefitting (Apprenticeship)"],
    salary: "$55K–$120K+ (Master trades regularly exceed $100K)",
  },
  C: {
    name: "The Creator",
    tagline: "Imaginative · Expressive · Original",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.08)",
    traits: ["Imaginative", "Original", "Expressive", "Aesthetic", "Bold"],
    description:
      "You experience the world through a creative lens and feel most alive when making something new. Whether visual, written, or conceptual, your work connects with people emotionally. Creators gravitate toward design, media, advertising, entertainment, and innovation — anywhere that rewards originality and vision.",
    careers: [
      "Graphic Designer",
      "UX/UI Designer",
      "Art Director",
      "Copywriter",
      "Film Director",
      "Creative Director",
      "Animator",
      "Brand Strategist",
    ],
    majors: ["Fine Arts", "Graphic Design", "Film & Media Studies", "Creative Writing", "Architecture"],
    salary: "$55K–$125K+",
  },
  H: {
    name: "The Helper",
    tagline: "Empathetic · Caring · Service-oriented",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.08)",
    traits: ["Empathetic", "Patient", "Collaborative", "Compassionate", "Principled"],
    description:
      "You're driven by the impact your work has on real people. Interpersonal connection and human well-being sit at the center of what motivates you. You're the person who remembers names, notices when someone is struggling, and shows up consistently. Helpers thrive in healthcare, education, social work, and counseling.",
    careers: [
      "Registered Nurse",
      "School Counselor",
      "Social Worker",
      "Physical Therapist",
      "Teacher / Educator",
      "Public Health Officer",
      "Occupational Therapist",
      "HR Specialist",
    ],
    majors: ["Nursing", "Psychology", "Social Work", "Education", "Public Health"],
    salary: "$50K–$115K+",
  },
  L: {
    name: "The Leader",
    tagline: "Driven · Strategic · Entrepreneurial",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.08)",
    traits: ["Driven", "Strategic", "Decisive", "Persuasive", "Entrepreneurial"],
    description:
      "You think in systems, goals, and outcomes. You're energized by challenge, competition, and the opportunity to shape direction. Leaders excel wherever ambition and strategy are rewarded — business, finance, law, entrepreneurship, and management. You're often the one who sees what needs to happen before anyone else does.",
    careers: [
      "Entrepreneur / Founder",
      "Product Manager",
      "Management Consultant",
      "Investment Banker",
      "Attorney",
      "Sales Director",
      "Operations Manager",
      "Chief of Staff",
    ],
    majors: ["Business Administration", "Finance", "Political Science", "Economics", "Pre-Law"],
    salary: "$70K–$165K+",
  },
  M: {
    name: "The Communicator",
    tagline: "Articulate · Social · Storytelling",
    color: "#0891B2",
    bg: "rgba(8,145,178,0.08)",
    traits: ["Articulate", "Social", "Persuasive", "Culturally curious", "Storyteller"],
    description:
      "You think in words, stories, and human connections. Communication is your superpower — whether through writing, speaking, social media, or film. Communicators thrive in journalism, marketing, public relations, media, advocacy, and politics — anywhere that rewards voice and narrative.",
    careers: [
      "Marketing Manager",
      "Journalist",
      "Public Relations Manager",
      "Content Strategist",
      "Documentary Filmmaker",
      "Brand Manager",
      "Speechwriter",
      "Communications Director",
    ],
    majors: ["Communications", "Journalism", "Marketing", "English", "Political Science"],
    salary: "$55K–$120K+",
  },
};

// ── Questions ──────────────────────────────────────────────────────────────
type Option = { label: string; cat: Cat };
type Question = { q: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    q: "What type of problem gets you most excited to tackle?",
    options: [
      { label: "A complex data puzzle or logical challenge", cat: "A" },
      { label: "An engineering or design challenge — making a system work better", cat: "B" },
      { label: "A creative challenge with no single right answer", cat: "C" },
      { label: "Helping someone overcome a difficult personal situation", cat: "H" },
      { label: "Organizing people and resources toward a clear goal", cat: "L" },
      { label: "Crafting a message that truly resonates with an audience", cat: "M" },
      { label: "A hands-on technical problem — diagnosing, repairing, or installing something", cat: "T" },
    ],
  },
  {
    q: "Which describes your ideal work environment?",
    options: [
      { label: "Quiet, focused, analytical — working independently on deep problems", cat: "A" },
      { label: "Structured and technical — designing systems and engineering solutions", cat: "B" },
      { label: "Open and creative — where bold ideas are encouraged", cat: "C" },
      { label: "Warm and people-centered — where I make a direct difference", cat: "H" },
      { label: "Fast-paced and goal-oriented — where I can lead and drive results", cat: "L" },
      { label: "Social and communicative — where I present, write, or connect", cat: "M" },
      { label: "Active and physical — in the field, shop, or job site solving real problems", cat: "T" },
    ],
  },
  {
    q: "What do your friends or classmates tend to come to you for?",
    options: [
      { label: "Thinking through a hard decision logically", cat: "A" },
      { label: "Help designing something or thinking through engineering challenges", cat: "B" },
      { label: "Creative ideas, design input, or honest aesthetic feedback", cat: "C" },
      { label: "Emotional support and a genuine ear", cat: "H" },
      { label: "Organizing a plan or stepping up to lead the group", cat: "L" },
      { label: "Explaining something clearly or speaking for the group", cat: "M" },
      { label: "Help fixing, building, or setting something up with their hands", cat: "T" },
    ],
  },
  {
    q: "If you had an unexpected free weekend, how would you most likely spend it?",
    options: [
      { label: "Going deep on a topic I have been wanting to research", cat: "A" },
      { label: "Working on a hands-on project — building, fixing, or making", cat: "B" },
      { label: "Creating something — writing, art, film, music, or design", cat: "C" },
      { label: "Spending time with people I care about or volunteering", cat: "H" },
      { label: "Planning something big or working on a side project", cat: "L" },
      { label: "Exploring somewhere new and documenting the experience", cat: "M" },
    ],
  },
  {
    q: "Which type of class came most naturally to you in school?",
    options: [
      { label: "Math, Statistics, Physics, or Computer Science", cat: "A" },
      { label: "Tech Ed, Engineering, Shop, or Design Technology", cat: "B" },
      { label: "Art, Music, Drama, or Creative Writing", cat: "C" },
      { label: "Biology, Health, Psychology, or Human Development", cat: "H" },
      { label: "Economics, Business, or Student Leadership", cat: "L" },
      { label: "English, Journalism, History, or Foreign Language", cat: "M" },
    ],
  },
  {
    q: "On a group project, you naturally take on which role?",
    options: [
      { label: "Researcher — I dig into the data and find what is actually true", cat: "A" },
      { label: "Builder — I take the lead on creating the actual deliverable", cat: "B" },
      { label: "Designer — I make it look and feel right", cat: "C" },
      { label: "Supporter — I keep team morale up and make sure no one falls behind", cat: "H" },
      { label: "Organizer — I set the timeline, assign roles, and hold everyone accountable", cat: "L" },
      { label: "Presenter — I write the narrative and deliver it to the audience", cat: "M" },
    ],
  },
  {
    q: "Which of these careers sounds most interesting to you right now?",
    options: [
      { label: "Data Scientist or Research Analyst", cat: "A" },
      { label: "Civil or Mechanical Engineer", cat: "B" },
      { label: "UX Designer or Creative Director", cat: "C" },
      { label: "Nurse, Therapist, or Social Worker", cat: "H" },
      { label: "Entrepreneur or Operations Manager", cat: "L" },
      { label: "Journalist or Marketing Director", cat: "M" },
      { label: "Master Electrician, Plumber, HVAC Tech, or Welder", cat: "T" },
    ],
  },
  {
    q: "What does meaningful impact look like to you?",
    options: [
      { label: "Uncovering insights that change how people make decisions", cat: "A" },
      { label: "Building something durable that people rely on every day", cat: "B" },
      { label: "Creating something that moves, inspires, or shifts how people see the world", cat: "C" },
      { label: "Directly improving someone's quality of life or well-being", cat: "H" },
      { label: "Growing an organization that creates real opportunity and jobs", cat: "L" },
      { label: "Changing how people think about an issue through storytelling", cat: "M" },
    ],
  },
  {
    q: "Which skill would you most like to develop over the next few years?",
    options: [
      { label: "Data analysis, machine learning, or statistical modeling", cat: "A" },
      { label: "CAD design, simulation software, or advanced engineering systems", cat: "B" },
      { label: "Photography, illustration, animation, or visual design", cat: "C" },
      { label: "Counseling techniques, clinical skills, or empathetic communication", cat: "H" },
      { label: "Negotiation, financial strategy, or executive leadership", cat: "L" },
      { label: "Public speaking, long-form writing, or broadcast journalism", cat: "M" },
      { label: "Electrical systems, pipefitting, welding, or advanced diagnostics", cat: "T" },
    ],
  },
  {
    q: "What frustrates you most in a work or school environment?",
    options: [
      { label: "Decisions made without data or evidence", cat: "A" },
      { label: "Too much talking and planning, not enough doing", cat: "B" },
      { label: "Rigid rules with no room for creativity or originality", cat: "C" },
      { label: "People being treated as numbers instead of human beings", cat: "H" },
      { label: "No one taking charge while everything drifts without direction", cat: "L" },
      { label: "Poor communication that leaves everyone confused and misaligned", cat: "M" },
    ],
  },
  {
    q: "What kind of book would you most enjoy reading?",
    options: [
      { label: "A deep investigation into science, economics, or how systems work", cat: "A" },
      { label: "A biography of an engineer, inventor, or maker", cat: "B" },
      { label: "Fiction, poetry, or a memoir by a creative visionary", cat: "C" },
      { label: "Stories about caregiving, community, or social justice", cat: "H" },
      { label: "Business strategy or a founder building something from scratch", cat: "L" },
      { label: "Narrative journalism, travel writing, or cultural commentary", cat: "M" },
    ],
  },
  {
    q: "How would you describe the way you make decisions?",
    options: [
      { label: "I gather as much data as possible before committing to anything", cat: "A" },
      { label: "I test the most practical option first, then iterate from there", cat: "B" },
      { label: "I trust my intuition and lean into the option that feels most right", cat: "C" },
      { label: "I consider how every option affects the people around me", cat: "H" },
      { label: "I evaluate which path delivers the best outcome with available resources", cat: "L" },
      { label: "I think about how each option will be perceived and communicated externally", cat: "M" },
    ],
  },
  {
    q: "Which skill or tool would you be most excited to master?",
    options: [
      { label: "Python, R, or SQL for data analysis", cat: "A" },
      { label: "CAD software, 3D printing tools, or simulation platforms", cat: "B" },
      { label: "Adobe Creative Suite, Figma, or video editing software", cat: "C" },
      { label: "Electronic health record systems or patient care skills", cat: "H" },
      { label: "CRM tools, financial modeling software, or business intelligence dashboards", cat: "L" },
      { label: "Content management systems, podcasting tools, or social analytics", cat: "M" },
      { label: "Diagnostic equipment, multimeters, pipe threading machines, or welding rigs", cat: "T" },
    ],
  },
  {
    q: "Describe your dream day at work:",
    options: [
      { label: "Finding an unexpected pattern in a dataset that unlocks a key insight", cat: "A" },
      { label: "Designing a prototype in the morning and stress-testing it in the afternoon", cat: "B" },
      { label: "Sketching a concept and watching it come to life on screen", cat: "C" },
      { label: "Having a breakthrough conversation with someone I am supporting", cat: "H" },
      { label: "Closing a deal, launching something, or hitting a major milestone", cat: "L" },
      { label: "Writing a piece I am proud of or delivering a presentation that truly lands", cat: "M" },
    ],
  },
  {
    q: "Your closest friends would most likely describe you as...",
    options: [
      { label: "Analytical — always asking why and digging deeper than most", cat: "A" },
      { label: "Dependable — a person of action who gets things done", cat: "B" },
      { label: "Original — you see things differently and are not afraid to show it", cat: "C" },
      { label: "Caring — you genuinely invest in the people around you", cat: "H" },
      { label: "Driven — ambitious, decisive, and comfortable taking the lead", cat: "L" },
      { label: "Articulate — you express ideas clearly and make people feel heard", cat: "M" },
    ],
  },
  {
    q: "When you face a new problem, your first instinct is to...",
    options: [
      { label: "Research it — understand the root cause before touching anything", cat: "A" },
      { label: "Start experimenting — get your hands on it and figure it out", cat: "B" },
      { label: "Brainstorm widely — imagine every angle, including unconventional ones", cat: "C" },
      { label: "Talk to people affected — understand how they are experiencing it", cat: "H" },
      { label: "Build a plan — figure out the goal, the steps, and who needs to be involved", cat: "L" },
      { label: "Frame it clearly — define what the real question is before anything else", cat: "M" },
    ],
  },
  {
    q: "What matters most to you in a job or career?",
    options: [
      { label: "Intellectual depth — problems that genuinely challenge the way I think", cat: "A" },
      { label: "Tangible results — being able to point to what I built or fixed", cat: "B" },
      { label: "Creative freedom — the ability to express myself through my work", cat: "C" },
      { label: "Direct impact — knowing my work genuinely helps real people", cat: "H" },
      { label: "Advancement — clear paths to grow, lead, and be rewarded for results", cat: "L" },
      { label: "Influence — shaping how people think, feel, or act about something", cat: "M" },
    ],
  },
  {
    q: "Which activity could you do for hours without getting bored?",
    options: [
      { label: "Researching a topic I find fascinating, following rabbit holes", cat: "A" },
      { label: "Working on a physical or hands-on project", cat: "B" },
      { label: "Drawing, writing, composing, designing, or making something", cat: "C" },
      { label: "Volunteering, tutoring, or spending time helping someone I care about", cat: "H" },
      { label: "Planning, negotiating, or building something toward a concrete goal", cat: "L" },
      { label: "Writing, filming, performing, or sharing ideas with an audience", cat: "M" },
    ],
  },
  {
    q: "Pick the description that sounds most like you:",
    options: [
      { label: "I need to understand things fully before I act", cat: "A" },
      { label: "I would rather build a rough version than spend extra time planning", cat: "B" },
      { label: "I need creative outlets to feel fully alive", cat: "C" },
      { label: "Relationships and community are at the center of everything I do", cat: "H" },
      { label: "I am here to grow, compete, and lead — and I am honest about that", cat: "L" },
      { label: "I think in stories, and I believe the right words can change anything", cat: "M" },
    ],
  },
  {
    q: "Which quote resonates with you most?",
    options: [
      { label: "\"The answer is somewhere in the data — you just have to find it.\"", cat: "A" },
      { label: "\"Done is better than perfect. Build it and learn from it.\"", cat: "B" },
      { label: "\"Constraints are for people who lack imagination.\"", cat: "C" },
      { label: "\"The most powerful thing you can do is truly listen.\"", cat: "H" },
      { label: "\"If you want something done right, you have to lead it.\"", cat: "L" },
      { label: "\"A great story can change how the world sees something.\"", cat: "M" },
    ],
  },
  {
    q: "Which program sounds most appealing to you?",
    options: [
      { label: "Computer Science, Statistics, or Economics", cat: "A" },
      { label: "Mechanical Engineering, Architecture, or Industrial Design", cat: "B" },
      { label: "Fine Arts, Film, Graphic Design, or Creative Writing", cat: "C" },
      { label: "Nursing, Psychology, Social Work, or Education", cat: "H" },
      { label: "Business Administration, Finance, or Political Science", cat: "L" },
      { label: "Communications, Journalism, Marketing, or English", cat: "M" },
      { label: "Electrical Technology, HVAC/R, Welding, or an Apprenticeship program", cat: "T" },
    ],
  },
  {
    q: "Which of these real-world challenges would you most want to work on?",
    options: [
      { label: "Building a predictive model to detect disease outbreaks early", cat: "A" },
      { label: "Designing a bridge structure that uses 30% fewer materials", cat: "B" },
      { label: "Rebranding a struggling nonprofit with a fresh identity and campaign", cat: "C" },
      { label: "Expanding mental health access in underserved communities", cat: "H" },
      { label: "Turning a struggling small business into a profitable operation", cat: "L" },
      { label: "Writing a documentary that brings a hidden story to mainstream attention", cat: "M" },
    ],
  },
  {
    q: "How do you tend to relate to risk?",
    options: [
      { label: "I want to fully understand the risk before acting — data first", cat: "A" },
      { label: "I take calculated risks — build a prototype, fail fast, improve", cat: "B" },
      { label: "I embrace risk as a natural part of creative exploration", cat: "C" },
      { label: "I avoid risks that could harm the people who depend on me", cat: "H" },
      { label: "I take bold risks when the potential upside is big enough", cat: "L" },
      { label: "I take social risks — putting my ideas and voice in front of audiences", cat: "M" },
    ],
  },
  {
    q: "Ten years from now, what does success look like to you?",
    options: [
      { label: "Being a recognized expert — someone who knows more about my field than almost anyone", cat: "A" },
      { label: "Having designed systems or structures that people depend on", cat: "B" },
      { label: "Having a body of work I am proud of — art, design, or writing that has touched people", cat: "C" },
      { label: "Knowing I have genuinely improved people's lives through the work I have done", cat: "H" },
      { label: "Leading my own organization or team toward something meaningful", cat: "L" },
      { label: "Having a platform and an audience — being a voice that matters in my field", cat: "M" },
      { label: "Running my own trade business or being a Master-level craftsperson others call on", cat: "T" },
    ],
  },
  {
    q: "What's your honest reaction to the idea of a four-year college degree?",
    options: [
      { label: "It's the right path for me — I want deep academic knowledge in my field", cat: "A" },
      { label: "Worth it for the engineering or design credentials it opens up", cat: "B" },
      { label: "Important for the creative communities and portfolio opportunities", cat: "C" },
      { label: "Necessary for the licensure and credibility my field requires", cat: "H" },
      { label: "A good foundation for business and networking, but not the only path", cat: "L" },
      { label: "Helpful for building connections and a platform, but not essential", cat: "M" },
      { label: "Not for me — I want to earn while I learn through apprenticeship or a 2-year program", cat: "T" },
    ],
  },
  {
    q: "Which scenario would make you feel most proud?",
    options: [
      { label: "Publishing research that changes how an industry operates", cat: "A" },
      { label: "Having my engineering design selected and built at large scale", cat: "B" },
      { label: "Seeing my creative work in a gallery, publication, or on screen", cat: "C" },
      { label: "A client or patient telling you that you changed their life", cat: "H" },
      { label: "Hitting a major milestone or closing a deal that took months to build", cat: "L" },
      { label: "Watching an article or campaign I created go viral and shift opinion", cat: "M" },
      { label: "Completing a complex installation or repair job that no one else could figure out", cat: "T" },
    ],
  },
  {
    q: "Which of these things genuinely appeals to you?",
    options: [
      { label: "Finding patterns in complex datasets that others miss", cat: "A" },
      { label: "Designing and modeling a product before it gets manufactured", cat: "B" },
      { label: "The feeling of finishing something visually beautiful from scratch", cat: "C" },
      { label: "Being the person someone calls during one of the hardest moments of their life", cat: "H" },
      { label: "Owning the outcome — being accountable for the whole result", cat: "L" },
      { label: "Having your voice, writing, or ideas reach a large audience", cat: "M" },
      { label: "Working with your hands to fix or build something essential that wasn't working before", cat: "T" },
    ],
  },
  {
    q: "If you had to bet on what your ideal weekday looks like, which is closest?",
    options: [
      { label: "At a computer, deep in analysis, building models or running experiments", cat: "A" },
      { label: "In front of a CAD screen or on a site visit reviewing drawings and specs", cat: "B" },
      { label: "In a studio, creative agency, or on a shoot or production", cat: "C" },
      { label: "In a clinic, school, or community center working directly with people", cat: "H" },
      { label: "In meetings, on calls, reviewing metrics, and driving toward goals", cat: "L" },
      { label: "Writing, pitching, filming, or presenting in front of an audience", cat: "M" },
      { label: "On a job site, in a shop, or under the hood — doing skilled technical work", cat: "T" },
    ],
  },
];

// ── Scoring ────────────────────────────────────────────────────────────────
function computeScores(answers: (Cat | null)[]): Record<Cat, number> {
  const scores: Record<Cat, number> = { A: 0, B: 0, C: 0, H: 0, L: 0, M: 0, T: 0 };
  for (const cat of answers) {
    if (cat) scores[cat]++;
  }
  return scores;
}

function topTwo(scores: Record<Cat, number>): [Cat, Cat] {
  const sorted = (Object.keys(scores) as Cat[]).sort((a, b) => scores[b] - scores[a]);
  return [sorted[0], sorted[1]];
}

// ── Voice recording hook ────────────────────────────────────────────────────
type VoiceState = "idle" | "recording" | "analyzing" | "done" | "error";

// ── Component ──────────────────────────────────────────────────────────────
export default function AptitudePage() {
  const [answers, setAnswers] = useState<(Cat | null)[]>(Array(QUESTIONS.length).fill(null));
  const [transcripts, setTranscripts] = useState<string[]>(Array(QUESTIONS.length).fill(""));
  const [confidences, setConfidences] = useState<number[]>(Array(QUESTIONS.length).fill(0));
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const totalQ = QUESTIONS.length;
  const current = QUESTIONS[step];
  const answered = answers[step];
  const answeredCount = answers.filter(Boolean).length;

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        scoreVoice(blob, mr.mimeType);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setVoiceState("recording");
    } catch {
      setVoiceError("Microphone access denied. Use the text options below.");
      setVoiceState("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setVoiceState("analyzing");
  }

  async function scoreVoice(blob: Blob, mimeType: string) {
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `aptitude.${ext}`, { type: mimeType });
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("question", current.q);
      fd.append("options", JSON.stringify(current.options));

      const res = await fetch("/api/aptitude/voice-score", { method: "POST", body: fd });
      const data = await res.json();

      if (data.error === "NO_SPEECH") {
        setVoiceError("We didn't catch that. Try again or pick an option below.");
        setVoiceState("idle");
        return;
      }
      if (data.error || !data.category) {
        setVoiceError("Couldn't score that response. Pick an option below.");
        setVoiceState("idle");
        return;
      }

      const cat = data.category as Cat;
      const next = [...answers];
      next[step] = cat;
      setAnswers(next);

      const nextT = [...transcripts];
      nextT[step] = data.transcript ?? "";
      setTranscripts(nextT);

      const nextC = [...confidences];
      nextC[step] = data.confidence ?? 0.5;
      setConfidences(nextC);

      setVoiceState("done");
    } catch {
      setVoiceError("Analysis failed. Pick an option below.");
      setVoiceState("idle");
    }
  }

  function handleSelect(cat: Cat) {
    const next = [...answers];
    next[step] = cat;
    setAnswers(next);
    if (voiceState === "done") setVoiceState("idle");
  }

  function handleNext() {
    setVoiceState("idle");
    setVoiceError(null);
    if (step < totalQ - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  function handleBack() {
    setVoiceState("idle");
    setVoiceError(null);
    if (step > 0) setStep(step - 1);
  }

  function handleRetake() {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setTranscripts(Array(QUESTIONS.length).fill(""));
    setConfidences(Array(QUESTIONS.length).fill(0));
    setStep(0);
    setDone(false);
    setSaved(false);
    setVoiceState("idle");
    setVoiceError(null);
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (done) {
    const scores = computeScores(answers);
    const [primary, secondary] = topTwo(scores);

    if (!saved) {
      setSaved(true);
      fetch("/api/aptitude/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary, secondary, scores }),
      }).catch(() => {});
    }
    const p = ARCHETYPES[primary];
    const s = ARCHETYPES[secondary];
    const maxScore = Math.max(...Object.values(scores));

    return (
      <PremiumShell title="Your Career Personality" subtitle="Based on your responses to 24 personality questions">
        <div style={{ maxWidth: 760, display: "grid", gap: 20 }}>

          {/* Primary type card */}
          <div style={{
            borderRadius: 18,
            border: `1px solid ${p.color}30`,
            background: p.bg,
            padding: "28px 28px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: p.color,
                  marginBottom: 6,
                }}>
                  Your Primary Archetype
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                  {p.tagline}
                </div>
              </div>
              <div style={{
                padding: "6px 14px",
                borderRadius: 99,
                background: p.color,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {scores[primary]} / {totalQ}
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
              {p.description}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {p.traits.map((t) => (
                <span key={t} style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: `${p.color}18`,
                  color: p.color,
                  border: `1px solid ${p.color}30`,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Careers + Majors */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
                Top Careers
              </div>
              <div style={{ display: "grid", gap: 7 }}>
                {p.careers.map((c) => (
                  <div key={c} style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    {c}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)" }}>
                Typical salary: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.salary}</span>
              </div>
            </div>

            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
                Recommended Majors
              </div>
              <div style={{ display: "grid", gap: 7 }}>
                {p.majors.map((m) => (
                  <div key={m} style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    {m}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--card-border-soft)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                  Secondary Archetype
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.tagline}</div>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 14 }}>
              Full Personality Breakdown
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(Object.keys(ARCHETYPES) as Cat[])
                .sort((a, b) => scores[b] - scores[a])
                .map((cat) => {
                  const arch = ARCHETYPES[cat];
                  const pct = Math.round((scores[cat] / totalQ) * 100);
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: cat === primary ? arch.color : "var(--text-primary)" }}>
                          {arch.name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                          {scores[cat]} pts · {pct}%
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${maxScore > 0 ? (scores[cat] / maxScore) * 100 : 0}%`,
                          background: arch.color,
                          borderRadius: 99,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleRetake}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid var(--card-border-soft)",
                background: "var(--card-bg)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retake Assessment
            </button>
            <Link href="/practice" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: p.color,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}>
                Start Practicing Interviews
              </button>
            </Link>
          </div>
        </div>
      </PremiumShell>
    );
  }

  // ── Quiz view ──────────────────────────────────────────────────────────────
  const progressPct = (answeredCount / totalQ) * 100;
  const currentTranscript = transcripts[step];
  const currentConfidence = confidences[step];
  const isRecording = voiceState === "recording";
  const isAnalyzing = voiceState === "analyzing";
  const isVoiceDone = voiceState === "done";

  return (
    <PremiumShell
      title="Career Personality Assessment"
      subtitle="Speak your answers — or pick from the options. 24 questions to discover your archetype."
    >
      <div style={{ maxWidth: 700 }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Answer mode:</span>
            <button
              onClick={() => setVoiceMode(!voiceMode)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 99,
                border: "1px solid var(--card-border-soft)",
                background: voiceMode ? "rgba(37,99,235,0.1)" : "var(--card-bg)",
                color: voiceMode ? "var(--accent)" : "var(--text-muted)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {voiceMode ? "🎤 Voice" : "☰ Text"} — switch
            </button>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
            {step + 1} / {totalQ} · {answeredCount} answered
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--accent)", borderRadius: 99, transition: "width 0.3s ease" }} />
        </div>

        {/* Question card */}
        <div style={{ borderRadius: 18, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", padding: "24px 24px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 20 }}>
            {current.q}
          </div>

          {/* Voice section */}
          {voiceMode && (
            <div style={{ marginBottom: 20 }}>
              {/* Record button */}
              {(voiceState === "idle" || voiceState === "error") && (
                <div style={{ textAlign: "center" as const, padding: "20px 0" }}>
                  <button
                    onClick={startRecording}
                    style={{
                      width: 72, height: 72, borderRadius: "50%",
                      border: "none", cursor: "pointer",
                      background: "var(--accent)",
                      color: "#fff", fontSize: 28,
                      boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
                      transition: "transform 100ms",
                    }}
                  >
                    🎤
                  </button>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                    Tap to speak your answer
                  </div>
                  {voiceError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#EF4444" }}>{voiceError}</div>
                  )}
                </div>
              )}

              {/* Recording state */}
              {isRecording && (
                <div style={{ textAlign: "center" as const, padding: "20px 0" }}>
                  <button
                    onClick={stopRecording}
                    style={{
                      width: 72, height: 72, borderRadius: "50%",
                      border: "none", cursor: "pointer",
                      background: "#EF4444", color: "#fff", fontSize: 24,
                      animation: "pulse 1s ease-in-out infinite",
                      boxShadow: "0 0 0 0 rgba(239,68,68,0.4)",
                    }}
                  >
                    ⏹
                  </button>
                  <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 14px rgba(239,68,68,0)} }`}</style>
                  <div style={{ marginTop: 10, fontSize: 13, color: "#EF4444", fontWeight: 700 }}>
                    Recording… tap to stop
                  </div>
                </div>
              )}

              {/* Analyzing */}
              {isAnalyzing && (
                <div style={{ textAlign: "center" as const, padding: "20px 0" }}>
                  <div style={{ fontSize: 32 }}>🧠</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>Analyzing your response…</div>
                </div>
              )}

              {/* Voice result */}
              {isVoiceDone && answered && (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>
                      Detected: {ARCHETYPES[answered].name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {Math.round(currentConfidence * 100)}% confidence
                    </span>
                  </div>
                  {currentTranscript && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                      "{currentTranscript}"
                    </div>
                  )}
                  <button
                    onClick={startRecording}
                    style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                  >
                    Re-record
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text options — always shown, but labeled differently in voice mode */}
          <div style={{ marginBottom: 4 }}>
            {voiceMode && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4, marginBottom: 8 }}>
                {isVoiceDone ? "OVERRIDE (optional)" : "OR PICK AN OPTION"}
              </div>
            )}
            <div style={{ display: "grid", gap: 8 }}>
              {current.options.map((opt) => {
                const isSelected = answered === opt.cat;
                return (
                  <button
                    key={opt.cat}
                    onClick={() => handleSelect(opt.cat)}
                    style={{
                      padding: "12px 16px", borderRadius: 10,
                      border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--card-border-soft)",
                      background: isSelected ? "rgba(37,99,235,0.07)" : "transparent",
                      color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: 13, fontWeight: isSelected ? 600 : 500,
                      cursor: "pointer", textAlign: "left" as const,
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      border: isSelected ? "5px solid var(--accent)" : "2px solid var(--card-border-soft)",
                      transition: "all 0.15s ease",
                    }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handleBack}
            disabled={step === 0}
            style={{
              padding: "10px 18px", borderRadius: 10,
              border: "1px solid var(--card-border-soft)", background: "transparent",
              color: "var(--text-muted)", fontSize: 13, fontWeight: 600,
              cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!answered || isAnalyzing}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: (answered && !isAnalyzing) ? "var(--accent)" : "var(--card-border-soft)",
              color: (answered && !isAnalyzing) ? "#fff" : "var(--text-soft)",
              fontSize: 13, fontWeight: 700,
              cursor: (answered && !isAnalyzing) ? "pointer" : "default",
              transition: "all 0.15s ease",
            }}
          >
            {step === totalQ - 1 ? "See My Results" : "Next →"}
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 20, justifyContent: "center" }}>
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVoiceState("idle"); setVoiceError(null); setStep(i); }}
              title={`Question ${i + 1}`}
              style={{
                width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                background: i === step ? "var(--accent)" : answers[i] ? "rgba(37,99,235,0.35)" : "var(--card-border-soft)",
                transition: "background 0.15s ease",
              }}
            />
          ))}
        </div>

      </div>
    </PremiumShell>
  );
}
