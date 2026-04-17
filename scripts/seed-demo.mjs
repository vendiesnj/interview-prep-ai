/**
 * Demo seed for TikTok video — targets test@gmail.com
 * Run: node scripts/seed-demo.mjs
 *
 * Populates: User profile, Attempts (12, spread over 3 weeks),
 * JobProfiles, ResumeAnalysis, InterviewActivity (job tracker),
 * StudentSkills, LifeBuddyData (calendar + budget + retirement + one-time expenses)
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = "test@gmail.com";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function dateStr(d) { return d.toISOString().split("T")[0]; }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ── 1. Find or create user ────────────────────────────────────────────────────

let user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
if (!user) {
  user = await prisma.user.create({
    data: {
      email: TARGET_EMAIL,
      name: "Alex Morgan",
      subscriptionStatus: "active",
      freeAttemptCap: 999,
    },
  });
  console.log("Created user:", user.id);
} else {
  console.log("Found user:", user.id);
}

const userId = user.id;

// Update profile fields
await prisma.user.update({
  where: { id: userId },
  data: {
    name: "Alex Morgan",
    targetRole: "Product Manager",
    targetIndustry: "Technology",
    graduationYear: 2022,
    major: "Business Administration",
    subscriptionStatus: "active",
    freeAttemptCap: 999,
  },
});

// ── 2. Clear old seed data ────────────────────────────────────────────────────

await prisma.attempt.deleteMany({ where: { userId } });
await prisma.jobProfile.deleteMany({ where: { userId } });
await prisma.resumeAnalysis.deleteMany({ where: { userId } });
await prisma.interviewActivity.deleteMany({ where: { userId } });
await prisma.studentSkill.deleteMany({ where: { userId } });
await prisma.lifeBuddyData.deleteMany({ where: { userId } });
console.log("Cleared existing data");

// ── 3. Job Profiles ───────────────────────────────────────────────────────────

// For consumer users with no tenantId, find any existing tenant as FK anchor
let tenantId = user.tenantId;
if (!tenantId) {
  const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
  tenantId = firstTenant?.id;
}
if (!tenantId) throw new Error("No tenant found — cannot seed JobProfiles");

// JobProfile requires tenantId — use a placeholder if none
const jp1 = await prisma.jobProfile.create({
  data: {
    userId, tenantId,
    title: "Product Manager",
    company: "Stripe",
    roleType: "full_time",
    jobDescription: "Lead cross-functional teams to define, build, and launch payments infrastructure products. Own the roadmap, work with engineering and design, and drive adoption.",
  },
});

const jp2 = await prisma.jobProfile.create({
  data: {
    userId, tenantId,
    title: "Associate Product Manager",
    company: "Google",
    roleType: "full_time",
    jobDescription: "APM program position. Rotate across Google product areas including Search, Maps, and Cloud. Drive product strategy, work with UX and engineering.",
  },
});

console.log("Created job profiles");

// ── 4. Attempts (12 sessions, improving trend over 3 weeks) ──────────────────

function makeFeedback(score, commScore, confScore, archetype, question) {
  return {
    score,
    communication_score: commScore,
    confidence_score: confScore,
    summary: `Your response demonstrated ${score >= 7.5 ? "strong" : score >= 6 ? "solid" : "developing"} communication skills. The STAR structure was ${score >= 7 ? "well-executed" : "partially present"}, with ${score >= 7.5 ? "clear" : "some"} ownership language throughout.`,
    communication_evidence: [
      score >= 7 ? "Used clear transitions: 'The key challenge was...' and 'What I did was...'" : "Transitions were sometimes unclear, making it hard to follow the narrative arc",
      score >= 7.5 ? "Quantified impact with specific metrics ('reduced churn by 18%')" : "Impact was mentioned but lacked specific numbers or timeframes",
    ],
    confidence_evidence: [
      confScore >= 7 ? "Direct eye contact and steady vocal pace projected authority" : "Some vocal hesitation and filler words reduced perceived confidence",
      confScore >= 7 ? "Owned the outcome: 'I decided...' and 'My recommendation was...'" : "Hedging language ('kind of', 'I think maybe') softened the delivery",
    ],
    strengths: [
      score >= 7 ? "Strong narrative arc with clear situation setup" : "Good attempt at structuring the STAR format",
      "Showed genuine enthusiasm for the problem domain",
    ],
    improvements: [
      score < 8 ? "Add more specific, quantified results to the Result section" : "Consider adding a brief reflection on what you'd do differently",
      score < 7.5 ? "Reduce filler words. Aim for deliberate pauses instead of 'um' and 'like'" : "Maintain this delivery consistency under pressure",
    ],
    better_answer: `A stronger version would open with the business context, describe your specific role in the decision, quantify the outcome (e.g. 'increased retention by X%'), and close with what you learned or would do differently.`,
    star: score >= 7.5 ? "strong" : score >= 6 ? "partial" : "weak",
    star_evidence: {
      situation: score >= 6 ? ["Clearly established context: team, timeline, and constraints"] : [],
      task: score >= 6 ? ["Role was defined but could be more specific to your ownership"] : [],
      action: score >= 7 ? ["Actions were concrete and showed decision-making authority"] : ["Actions described but lacked personal ownership language"],
      result: score >= 7.5 ? ["Quantified outcome with timeframe and business impact"] : ["Outcome mentioned but not quantified"],
    },
    star_missing: score < 7 ? ["Specific metrics in the Result", "Clear personal ownership vs team effort"] : [],
    star_advice: score >= 7.5 ? "Your STAR structure is strong. Focus on tightening the Result to one crisp sentence." : "Lead with the Result first (RATS order) to immediately signal impact, then walk back through the context.",
    public_speaking: {
      hook_impact: Math.min(10, commScore + (Math.random() * 0.4 - 0.2)),
      structure: Math.min(10, score + (Math.random() * 0.6 - 0.3)),
      vocal_variety: Math.min(10, commScore - 0.3 + (Math.random() * 0.4)),
      clarity: Math.min(10, commScore + 0.2),
      audience_connection: Math.min(10, confScore - 0.1),
      confidence_presence: Math.min(10, confScore + 0.1),
    },
    delivery_archetype: archetype,
    archetype_coaching: {
      "The Hedger": "Replace softening phrases ('I think maybe', 'kind of') with assertive alternatives. Practice declarative statements: 'I decided...' instead of 'We sort of went with...'",
      "The Rusher": "Pause after each STAR section boundary. A 1-second pause signals structure and lets your key point land before you move on.",
      "The Storyteller": "Channel your narrative strength into the Result. Make it the emotional peak of the story, not just a data point at the end.",
      "The Lecturer": "Add one personal moment or emotional beat to each answer. 'The hardest part was...' makes the technical content stick.",
      "The Pauser": "Your measured delivery reads as confident. Protect it. Avoid the temptation to fill silences with filler words.",
    }[archetype] ?? "Focus on varying vocal pitch and pace to maintain listener engagement.",
    speaking_strengths: ["Clear articulation", score >= 7 ? "Confident vocal projection" : "Appropriate speaking pace"],
    speaking_improvements: [score < 7.5 ? "Reduce filler word frequency" : "Vary sentence length for rhythm", "Add more vocal emphasis on key metrics"],
    filler_analysis: {
      total_fillers: Math.floor(Math.max(0, (10 - score) * 2.5)),
      word_count: 280 + Math.floor(Math.random() * 80),
      fillers_per_100_words: Math.max(0, (10 - score) * 0.9),
      by_type: { "um": Math.floor(Math.max(0, (10 - score))), "like": Math.floor(Math.max(0, (9.5 - score) * 0.8)) },
    },
    // filler in the format results page expects
    filler: {
      total: Math.floor(Math.max(0, (10 - score) * 2.5)),
      words: 280 + Math.floor(Math.random() * 80),
      per100: parseFloat(Math.max(0, (10 - score) * 0.9).toFixed(1)),
      top: [{ word: "um", count: Math.floor(Math.max(0, (10 - score))) }],
    },
    dimension_scores: (() => {
      const v = () => (Math.random() * 2.4 - 1.2); // wide variance so bars spread out
      const dims = {
        narrative_clarity:   { label: "Narrative Clarity",     s: Math.min(10, Math.max(0, score + v())) },
        evidence_quality:    { label: "Evidence Quality",      s: Math.min(10, Math.max(0, score - 0.8 + v())) },
        ownership_agency:    { label: "Ownership & Agency",    s: Math.min(10, Math.max(0, confScore + v())) },
        vocal_engagement:    { label: "Vocal Engagement",      s: Math.min(10, Math.max(0, commScore - 0.5 + v())) },
        response_control:    { label: "Response Control",      s: Math.min(10, Math.max(0, score + 0.3 + v())) },
        cognitive_depth:     { label: "Cognitive Depth",       s: Math.min(10, Math.max(0, score - 1.2 + v())) },
        presence_confidence: { label: "Presence & Confidence", s: Math.min(10, Math.max(0, confScore - 0.4 + v())) },
        audience_awareness:  { label: "Audience Awareness",    s: Math.min(10, Math.max(0, score - 0.5 + v())) },
      };
      // Per-dimension coaching that is score-tier-aware and non-generic
      const coachingMap = {
        narrative_clarity: (sc) => sc >= 7.5
          ? "Your story has a clear through-line. The interviewer can follow the arc from start to finish without effort."
          : sc >= 5.5
          ? "The narrative holds together but needs a tighter opening. Try framing your story in one sentence before you start: 'I did X which led to Y', then build from there."
          : "The answer needs cleaner structure. Write out S-T-A-R before your next attempt and say 'Situation:' out loud as you start. The ideas are there; they need sequencing.",
        evidence_quality: (sc) => sc >= 7.5
          ? "Concrete, specific, and credible. The proof points here would stand out against most candidates."
          : sc >= 5.5
          ? "Good specificity overall. Add one more metric or named result in the final section and this becomes a strong answer."
          : "The story needs harder proof. Name one specific number, tool, or observable outcome. 'Improved efficiency' is generic; 'cut processing time from 4 hours to 40 minutes' is what gets remembered.",
        ownership_agency: (sc) => sc >= 7.5
          ? "Strong first-person ownership throughout. The interviewer understands exactly what you personally drove and decided."
          : sc >= 5.5
          ? "Personal ownership is present. Watch for 'we' slippage in the result section, which is where credit tends to diffuse unintentionally."
          : "The answer shares too much credit. Start the next attempt with 'I decided...' or 'I owned...' and maintain that through the action section. Own your contribution explicitly.",
        vocal_engagement: (sc) => sc >= 7.5
          ? "Vocal variety and energy are working with the content. The delivery is dynamic and holds attention through the answer."
          : sc >= 5.5
          ? "Good vocal variety overall. Add a deliberate pitch lift at the result sentence, which is the moment that deserves the most emphasis."
          : "The delivery is flat in places. Slow down at your result sentence, pause for a beat before it, then lift your pitch slightly. That one moment changes how the whole answer is remembered.",
        response_control: (sc) => sc >= 7.5
          ? "Clean, controlled delivery. Pacing and fluency are working in your favor throughout."
          : sc >= 5.5
          ? "Good control overall. Watch for filler clusters at transitions between STAR sections, where most disfluency tends to appear under pressure."
          : "Filler words are interfering with the content. Replace every 'um' and 'uh' with a one-beat pause. Silence reads as more confident than a filler and gives you a moment to think.",
        cognitive_depth: (sc) => sc >= 7.5
          ? "The answer demonstrates sophisticated thinking. Tradeoffs, nuance, and clear reasoning are all present and would register with a senior interviewer."
          : sc >= 5.5
          ? "Good analytical depth. One more acknowledged tradeoff or constraint would push this toward senior-level thinking."
          : "The answer shows competence but not yet depth. Add one line that names a tradeoff you navigated: 'The challenge was X, so I chose Y over Z because...' That single line changes how a senior interviewer reads the answer.",
        presence_confidence: (sc) => sc >= 7.5
          ? "Strong on-camera presence. Eye contact and expressiveness are projecting genuine confidence consistently."
          : sc >= 5.5
          ? "Good presence overall. Stay on camera during the result sentence specifically, which is the moment eye contact matters most."
          : "Confidence signals are undermining otherwise good content. On your next attempt, commit to sustained eye contact from your first sentence. It will feel uncomfortable, and that discomfort is the signal improving.",
        audience_awareness: (sc) => sc >= 7.5
          ? "You're pitching answers well for the context. The level of detail and framing are landing appropriately for the role and audience."
          : sc >= 5.5
          ? "Good calibration overall. Stay attentive to whether the interviewer looks for technical depth or high-level impact — adjust your detail level accordingly."
          : "The answer needs better audience calibration. Match the level of detail to who's listening — senior interviewers want decision-making judgment; hiring managers want outcomes.",
      };
      const result = {};
      for (const [key, { label, s }] of Object.entries(dims)) {
        const sc = parseFloat(s.toFixed(1));
        result[key] = {
          label,
          score: sc,
          coaching: coachingMap[key] ? coachingMap[key](sc) : "Focus on developing this area in your next sessions.",
          isStrength: sc >= 7.5,
          isGap: sc < 5.5,
          driverSignals: [],
        };
      }
      return result;
    })(),
  };
}

function makeDeliveryMetrics(wpm, fillers, score) {
  const monotone = parseFloat(Math.max(1, Math.min(9, 7 - (score - 6) * 1.2 + (Math.random() * 1.4 - 0.7))).toFixed(1));
  const pitchRange = 80 + Math.floor(score * 8) + Math.floor(Math.random() * 30);
  const energyVar = parseFloat(Math.max(1, Math.min(9, (score - 5) * 1.5 + (Math.random() * 1.0 - 0.5))).toFixed(1));
  const tempoDyn = parseFloat(Math.max(1.5, Math.min(9.5, (score - 4.5) * 1.2 + (Math.random() * 1.2 - 0.6))).toFixed(1));
  const eyeContact = Math.min(0.95, 0.45 + (score - 5.5) * 0.08 + Math.random() * 0.08);
  return {
    wpm,
    fillersPer100: parseFloat((fillers / (wpm * 1.8 / 100)).toFixed(2)),
    fillers: Array(fillers).fill("um"),
    words: Math.floor(wpm * 1.8),
    duration_seconds: 108,
    acoustics: {
      monotoneScore: monotone,
      pitchRange,
      pitchMean: 150 + Math.floor(Math.random() * 30),
      pitchStd: 20 + Math.floor(Math.random() * 15),
      energyVariation: energyVar,
      energyMean: 0.55 + Math.random() * 0.15,
      energyStd: 0.04 + Math.random() * 0.04,
      tempoDynamics: tempoDyn,
      // Azure Speech SDK signals
      pronunciationScore: parseFloat(Math.min(96, Math.max(62, 75 + score * 2.2 + (Math.random() * 6 - 3))).toFixed(1)),
      fluencyScore:       parseFloat(Math.min(95, Math.max(58, 70 + score * 2.8 + (Math.random() * 6 - 3))).toFixed(1)),
      prosodyScore:       parseFloat(Math.min(94, Math.max(50, 62 + score * 3.0 + (Math.random() * 8 - 4))).toFixed(1)),
      mumbleIndex:        parseFloat(Math.max(4,  Math.min(42, 32 - score * 2.8 + (Math.random() * 8 - 4))).toFixed(1)),
    },
    face: {
      eyeContact: parseFloat(eyeContact.toFixed(2)),
      expressiveness: parseFloat(Math.min(0.9, 0.3 + score * 0.05 + Math.random() * 0.1).toFixed(2)),
      headStability: parseFloat(Math.min(0.98, 0.7 + Math.random() * 0.2).toFixed(2)),
      smileRate: parseFloat(Math.min(0.5, 0.05 + score * 0.02 + Math.random() * 0.08).toFixed(2)),
      blinkRate: Math.floor(12 + Math.random() * 8),
      browEngagement: parseFloat(Math.min(0.4, 0.05 + score * 0.02 + Math.random() * 0.05).toFixed(2)),
      lookAwayRate: parseFloat(Math.max(0.02, 0.25 - score * 0.02 + Math.random() * 0.05).toFixed(2)),
      framesAnalyzed: Math.floor(380 + Math.random() * 140),
    },
  };
}

function makeProsody(wpm, score) {
  const monotone = parseFloat(Math.max(1, Math.min(9, 7 - (score - 6) * 1.2 + (Math.random() * 1.4 - 0.7))).toFixed(1));
  const energyVar = parseFloat(Math.max(1, Math.min(9, (score - 5) * 1.5 + (Math.random() * 1.0 - 0.5))).toFixed(1));
  const tempoDyn = parseFloat(Math.max(1.5, Math.min(9.5, (score - 4.5) * 1.2 + (Math.random() * 1.2 - 0.6))).toFixed(1));
  return {
    monotoneScore: monotone,
    pitchMean: parseFloat((150 + Math.random() * 30).toFixed(1)),
    pitchStd: parseFloat((20 + Math.random() * 15).toFixed(1)),
    pitchRange: parseFloat((80 + score * 8 + Math.random() * 30).toFixed(1)),
    energyVariation: energyVar,
    tempoDynamics: tempoDyn,
    energyMean: parseFloat((0.55 + Math.random() * 0.15).toFixed(3)),
  };
}

const questions = [
  { q: "Tell me about a time you had to influence stakeholders without direct authority.", cat: "behavioral" },
  { q: "Describe a product you improved significantly. What was your process?", cat: "product" },
  { q: "Tell me about your biggest professional failure and what you learned.", cat: "behavioral" },
  { q: "Walk me through how you would prioritize a backlog of 50 feature requests.", cat: "product" },
  { q: "Describe a situation where data changed your initial recommendation.", cat: "behavioral" },
  { q: "How would you measure the success of a new onboarding flow?", cat: "product" },
  { q: "Tell me about a time you had to make a decision with incomplete information.", cat: "behavioral" },
  { q: "Walk me through a product launch you owned end-to-end.", cat: "product" },
  { q: "Describe a time you had to push back on an executive decision.", cat: "behavioral" },
  { q: "How do you balance user needs against business constraints?", cat: "product" },
  { q: "Tell me about a time you turned a failing project around.", cat: "behavioral" },
  { q: "What's a product you use every day and how would you improve it?", cat: "product" },
];

// Improving arc: starts around 5.8, ends around 8.2
// Archetypes use the new 12-archetype system (matches coachingWriteup lookup table)
const attemptData = [
  { daysAgoN: 21, score: 5.8, comm: 5.6, conf: 5.4, arch: "Anxious Achiever",   wpm: 148, fillers: 9  },
  { daysAgoN: 19, score: 6.1, comm: 6.0, conf: 5.8, arch: "Anxious Achiever",   wpm: 152, fillers: 7  },
  { daysAgoN: 17, score: 6.3, comm: 6.2, conf: 6.1, arch: "Circling the Point", wpm: 162, fillers: 6  },
  { daysAgoN: 15, score: 6.5, comm: 6.4, conf: 6.3, arch: "Circling the Point", wpm: 158, fillers: 5  },
  { daysAgoN: 13, score: 6.8, comm: 6.7, conf: 6.6, arch: "Vague Narrator",     wpm: 145, fillers: 4  },
  { daysAgoN: 11, score: 7.1, comm: 7.0, conf: 6.9, arch: "Vague Narrator",     wpm: 143, fillers: 4  },
  { daysAgoN: 9,  score: 7.2, comm: 7.1, conf: 7.0, arch: "Fading Closer",      wpm: 138, fillers: 3  },
  { daysAgoN: 7,  score: 7.4, comm: 7.3, conf: 7.2, arch: "Fading Closer",      wpm: 135, fillers: 3  },
  { daysAgoN: 5,  score: 7.6, comm: 7.5, conf: 7.4, arch: "Polished Performer", wpm: 132, fillers: 2  },
  { daysAgoN: 4,  score: 7.8, comm: 7.7, conf: 7.6, arch: "Polished Performer", wpm: 130, fillers: 2  },
  { daysAgoN: 2,  score: 8.0, comm: 7.9, conf: 7.9, arch: "Polished Performer", wpm: 128, fillers: 1  },
  { daysAgoN: 1,  score: 8.2, comm: 8.1, conf: 8.0, arch: "Polished Performer", wpm: 126, fillers: 1  },
];

for (let i = 0; i < attemptData.length; i++) {
  const d = attemptData[i];
  const q = questions[i];
  const ts = daysAgo(d.daysAgoN);
  ts.setHours(9 + Math.floor(Math.random() * 8));

  await prisma.attempt.create({
    data: {
      userId,
      ts,
      question: q.q,
      transcript: `Thank you for that question. ${d.score >= 7.5 ? "I'd like to share a specific example that really shaped how I approach this." : "Sure, let me think about a good example."} In my previous role at a SaaS startup, I was responsible for driving our Q3 retention initiative. The challenge was that we had multiple stakeholders (engineering, marketing, and customer success) all with competing priorities. I had to align them around a single metric: 30-day activation rate. ${d.score >= 7 ? "I set up a weekly sync and created a shared dashboard that made everyone's contribution visible." : "We had some meetings and tried to coordinate."} The result was a ${Math.floor(d.score * 2.5)}% improvement in activation over 8 weeks, which translated to roughly $${Math.floor(d.score * 120)}K in retained ARR. Looking back, I would have involved customer success even earlier in the process.`,
      inputMethod: "microphone",
      score: d.score,
      communicationScore: d.comm,
      confidenceScore: d.conf,
      questionCategory: q.cat,
      questionSource: "question_bank",
      evaluationFramework: "STAR",
      jobProfileId: jp1.id,
      jobProfileTitle: "Product Manager",
      jobProfileCompany: "Stripe",
      jobProfileRoleType: "full_time",
      wpm: d.wpm,
      durationSeconds: 95 + Math.floor(Math.random() * 30),
      feedback: makeFeedback(d.score, d.comm, d.conf, d.arch, q.q),
      deliveryMetrics: makeDeliveryMetrics(d.wpm, d.fillers, d.score),
      prosody: makeProsody(d.wpm, d.score),
    },
  });
}
console.log("Created 12 attempts with improving score arc");

// ── 5. Resume Analysis ────────────────────────────────────────────────────────

await prisma.resumeAnalysis.create({
  data: {
    userId,
    overallScore: 74,
    atsScore: 68,
    overallLabel: "Good. Targeted improvements will significantly boost callbacks",
    summary: "Your resume shows strong product instincts and cross-functional experience. The experience section is well-structured, but several high-impact PM keywords are missing and quantified results could be stronger in 3 of 5 bullet points.",
    topAction: "Add metrics to your Retention Initiative bullet. Change 'improved activation' to 'improved 30-day activation rate by 18%, retaining $340K ARR'",
    gaps: [
      { category: "Keywords", issue: "Missing: 'roadmap', 'go-to-market', 'A/B testing', 'OKRs', all common in PM JDs", fix: "Weave these terms naturally into your experience bullets" },
      { category: "Quantification", issue: "3 of 5 experience bullets lack specific numbers", fix: "Add percentages, dollar amounts, or timeframes to each impact statement" },
      { category: "ATS Format", issue: "Skills section uses a table format that some ATS systems parse incorrectly", fix: "Convert to a simple comma-separated list under 'Core Skills'" },
    ],
    strengths: ["Clear progression from IC to lead roles", "Cross-functional collaboration explicitly mentioned", "Education section is clean and ATS-friendly"],
    keywordsPresent: ["product strategy", "stakeholder management", "user research", "sprint planning", "data analysis"],
    keywordsMissing: ["roadmap", "go-to-market", "A/B testing", "OKRs", "agile", "KPIs", "product-led growth"],
    resumeSnippet: "Product Manager | Retention & Growth | 2022–Present\nLed cross-functional team of 8 to drive Q3 retention initiative...",
    jobDescSnippet: "We're looking for a PM with 2+ years experience owning product roadmaps, running A/B tests, and driving go-to-market strategy...",
  },
});
console.log("Created resume analysis");

// ── 6. Job Tracker (InterviewActivity) ───────────────────────────────────────

const jobApps = [
  { company: "Stripe", role: "Product Manager, Payments", stage: "final_round", appliedDaysAgo: 28, interviewDaysAgo: 7, outcome: "pending" },
  { company: "Google", role: "APM II, Search", stage: "on_site", appliedDaysAgo: 21, interviewDaysAgo: 3, outcome: "pending" },
  { company: "Notion", role: "Senior PM, Core Product", stage: "phone_screen", appliedDaysAgo: 14, interviewDaysAgo: 2, outcome: "pending" },
  { company: "Linear", role: "Product Lead", stage: "applied", appliedDaysAgo: 5, outcome: "pending" },
  { company: "Figma", role: "PM, Developer Platform", stage: "rejected", appliedDaysAgo: 35, interviewDaysAgo: 20, outcome: "rejected" },
  { company: "Vercel", role: "Product Manager", stage: "offer", appliedDaysAgo: 42, interviewDaysAgo: 14, salaryOffered: 175000, outcome: "offer_received" },
];

for (const app of jobApps) {
  await prisma.interviewActivity.create({
    data: {
      userId,
      company: app.company,
      role: app.role,
      industry: "Technology",
      stage: app.stage,
      outcome: app.outcome,
      appliedDate: daysAgo(app.appliedDaysAgo),
      interviewDate: app.interviewDaysAgo ? daysAgo(app.interviewDaysAgo) : null,
      salaryOffered: app.salaryOffered ?? null,
      notes: app.stage === "final_round" ? "Final round with CPO scheduled. Prep case study on payments growth." : null,
    },
  });
}
console.log("Created 6 job tracker entries");

// ── 7. Student Skills (extracted from attempts) ───────────────────────────────

const skills = [
  { skill: "Stakeholder Management", category: "interpersonal", confidence: 0.88 },
  { skill: "Data-Driven Decision Making", category: "analytical", confidence: 0.91 },
  { skill: "Product Roadmapping", category: "domain", confidence: 0.85 },
  { skill: "Cross-Functional Leadership", category: "leadership", confidence: 0.82 },
  { skill: "STAR Storytelling", category: "communication", confidence: 0.87 },
  { skill: "Retention Optimization", category: "domain", confidence: 0.79 },
  { skill: "A/B Testing", category: "technical", confidence: 0.76 },
  { skill: "Executive Communication", category: "communication", confidence: 0.81 },
];

for (const s of skills) {
  await prisma.studentSkill.create({
    data: { userId, tenantId, ...s, source: "ai_extracted", attemptIds: [jp1.id] },
  });
}
console.log("Created 8 student skills");

// ── 8. Life Buddy Data ────────────────────────────────────────────────────────

// Calendar events: mix of completed past events + upcoming
const today = dateStr(new Date());
const calendarEvents = [
  // ── Past week — completed ──
  { id: uid(), title: "Mock interview practice", date: dateStr(daysAgo(6)), startHour: 9, startMin: 0, durationMins: 60, color: "#2563EB", completed: true, completedAt: dateStr(daysAgo(6)), originalDate: dateStr(daysAgo(6)), pushCount: 0 },
  { id: uid(), title: "Review STAR framework notes", date: dateStr(daysAgo(5)), startHour: 18, startMin: 0, durationMins: 30, color: "#10B981", completed: true, completedAt: dateStr(daysAgo(5)), originalDate: dateStr(daysAgo(5)), pushCount: 0 },
  { id: uid(), title: "Stripe final round prep", date: dateStr(daysAgo(4)), startHour: 10, startMin: 0, durationMins: 90, color: "#2563EB", completed: true, completedAt: dateStr(daysAgo(4)), originalDate: dateStr(daysAgo(5)), pushCount: 1 },
  { id: uid(), title: "Update resume bullet points", date: dateStr(daysAgo(4)), startHour: 14, startMin: 0, durationMins: 45, color: "#8B5CF6", completed: true, completedAt: dateStr(daysAgo(4)), originalDate: dateStr(daysAgo(4)), pushCount: 0 },
  { id: uid(), title: "Google APM on-site prep", date: dateStr(daysAgo(3)), startHour: 9, startMin: 30, durationMins: 120, color: "#F59E0B", completed: true, completedAt: dateStr(daysAgo(3)), originalDate: dateStr(daysAgo(3)), pushCount: 0 },
  { id: uid(), title: "Networking coffee chat with Notion PM", date: dateStr(daysAgo(2)), startHour: 11, startMin: 0, durationMins: 45, color: "#10B981", completed: true, completedAt: dateStr(daysAgo(2)), originalDate: dateStr(daysAgo(3)), pushCount: 1 },
  { id: uid(), title: "Review feedback report", date: dateStr(daysAgo(1)), startHour: 8, startMin: 0, durationMins: 30, color: "#2563EB", completed: true, completedAt: dateStr(daysAgo(1)), originalDate: dateStr(daysAgo(1)), pushCount: 0 },
  // ── Today ──
  { id: uid(), title: "Signal practice session", date: today, startHour: 9, startMin: 0, durationMins: 60, color: "#2563EB", completed: false, originalDate: today, pushCount: 0 },
  { id: uid(), title: "Research Stripe product org", date: today, startHour: 13, startMin: 0, durationMins: 45, color: "#F59E0B", completed: false, originalDate: today, pushCount: 0 },
  // ── Upcoming ──
  { id: uid(), title: "Stripe final round interview", date: dateStr(daysFromNow(2)), startHour: 10, startMin: 0, durationMins: 120, color: "#EF4444", completed: false, originalDate: dateStr(daysFromNow(2)), pushCount: 0 },
  { id: uid(), title: "Weekly review + goal setting", date: dateStr(daysFromNow(3)), startHour: 8, startMin: 0, durationMins: 45, color: "#8B5CF6", completed: false, originalDate: dateStr(daysFromNow(3)), pushCount: 0 },
  { id: uid(), title: "Follow up with Stripe recruiter", date: dateStr(daysFromNow(4)), startHour: 9, startMin: 0, durationMins: 15, color: "#10B981", completed: false, originalDate: dateStr(daysFromNow(4)), pushCount: 0 },
  { id: uid(), title: "Mock behavioral question drill", date: dateStr(daysFromNow(5)), startHour: 18, startMin: 30, durationMins: 60, color: "#2563EB", completed: false, originalDate: dateStr(daysFromNow(5)), pushCount: 0 },
];

// Budget — realistic early-career PM in SF
const budgetLines = [
  { id: "rent",      label: "Rent / Mortgage",       category: "needs",   amount: 2200, placeholder: 1400 },
  { id: "utilities", label: "Utilities & Internet",  category: "needs",   amount: 110,  placeholder: 120  },
  { id: "groceries", label: "Groceries",             category: "needs",   amount: 320,  placeholder: 300  },
  { id: "transport", label: "Transportation",        category: "needs",   amount: 185,  placeholder: 200  },
  { id: "insurance", label: "Health Insurance",      category: "needs",   amount: 220,  placeholder: 180  },
  { id: "loans",     label: "Loan Minimums",         category: "needs",   amount: 390,  placeholder: 250  },
  { id: "dining",    label: "Dining Out",            category: "wants",   amount: 240,  placeholder: 150  },
  { id: "entertain", label: "Entertainment",         category: "wants",   amount: 95,   placeholder: 80   },
  { id: "subs",      label: "Subscriptions",         category: "wants",   amount: 72,   placeholder: 60   },
  { id: "shopping",  label: "Shopping",              category: "wants",   amount: 130,  placeholder: 100  },
  { id: "emergency", label: "Emergency Fund",        category: "savings", amount: 300,  placeholder: 150  },
  { id: "k401",      label: "401(k) Contribution",  category: "savings", amount: 500,  placeholder: 300  },
  { id: "roth",      label: "Roth IRA",              category: "savings", amount: 200,  placeholder: 100  },
];

// One-time expenses — realistic upcoming costs
function monthKey(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const oneTimeExpenses = [
  { id: uid(), monthKey: monthKey(0), label: "New laptop (MacBook Air)", amount: 1299 },
  { id: uid(), monthKey: monthKey(1), label: "Flight home for July 4th", amount: 380 },
  { id: uid(), monthKey: monthKey(2), label: "Annual renter's insurance", amount: 220 },
  { id: uid(), monthKey: monthKey(3), label: "Car registration renewal", amount: 185 },
  { id: uid(), monthKey: monthKey(4), label: "Holiday travel (December)", amount: 650 },
  { id: uid(), monthKey: monthKey(5), label: "Course: PM certification", amount: 499 },
];

const retireState = {
  age: 26,
  salary: 115000,
  contribPct: 8,
  currentSavings: 14500,
  retireAge: 60,
};

await prisma.lifeBuddyData.create({
  data: {
    userId,
    calendarEvents,
    budgetLines,
    budgetIncome: 7200,
    oneTimeExpenses,
    retireState,
  },
});
console.log("Created Life Buddy data (calendar, budget, one-time expenses, retirement)");

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("\n✅ Seed complete for", TARGET_EMAIL);
console.log("   12 attempts   | improving arc 5.8 → 8.2");
console.log("   2 job profiles| Stripe PM, Google APM");
console.log("   6 job apps    | 1 offer (Vercel $175K), 1 final round (Stripe)");
console.log("   1 resume scan | score 74, ATS 68");
console.log("   8 skills      | stakeholder mgmt, roadmapping, etc.");
console.log("   Calendar      | 7 completed past + 2 today + 4 upcoming");
console.log("   Budget        | $7,200 income, SF-level expenses");
console.log("   Retirement    | age 26, 8% contrib, retire at 60");
console.log("   One-time exps | 6 months of planned expenses");

await prisma.$disconnect();
await pool.end();
