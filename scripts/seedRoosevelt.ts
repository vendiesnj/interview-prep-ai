/**
 * Roosevelt University - Demo Seed (v2)
 *
 * Five student personas with full variable coverage:
 *   face metrics, delivery archetypes, strengths/improvements,
 *   ESL mode (Diego), completedAt/scheduledDate/dueDate on checklist,
 *   user profiles, and productivity stories that tell distinct narratives.
 *
 *  1. Marcus Johnson    - post-grad success (52->81, 38 sessions, Hedger->Polished Performer)
 *  2. Aaliyah Washington- high performer  (72->88, 26 sessions, Polished Performer throughout)
 *  3. Diego Reyes       - CS rapid improver (58->79, 20 sessions, Monotone Expert->Quiet Achiever, ESL mode)
 *  4. Sophie Park       - plateau case    (65->69, 18 sessions, Hedger throughout - needs intervention)
 *  5. Jordan Taylor     - first-gen early (44->62, 12 sessions, Scattered Thinker->Vague Narrator)
 *
 * Run:  npx tsx scripts/seedRoosevelt.ts
 */

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function random(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function round1(v: number) { return Math.round(v * 10) / 10; }
function round2(v: number) { return Math.round(v * 100) / 100; }
function round3(v: number) { return Math.round(v * 1000) / 1000; }
function pickRandom<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function noise(base: number, vol: number) { return base + random(-vol, vol); }
function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}
function daysFromNow(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

type QuestionCategory = "behavioral" | "teamwork" | "leadership" | "technical" | "career_dev";
type Question = { question: string; category: QuestionCategory; transcript: string };

const QUESTIONS: Question[] = [
  {
    question: "Tell me about a time you led a team through a challenge.",
    category: "leadership",
    transcript: "In my campus leadership role I coordinated a five-person team through a compressed timeline for a business plan competition. I delegated based on each person's strengths, held quick daily check-ins, and we finished second in the regional round — our best result in three years.",
  },
  {
    question: "Describe a situation where you had to handle conflict.",
    category: "behavioral",
    transcript: "Two group members disagreed on our financial model assumptions. I set up a working session where each person walked through their logic, then we aligned on a hybrid projection with documented assumptions. The tension dropped immediately and we hit our deadline.",
  },
  {
    question: "Tell me about a time you failed and what you learned.",
    category: "behavioral",
    transcript: "I underestimated how long it would take to build a client-facing report and missed the draft deadline. I owned it to my supervisor, created a buffer system for future projects, and the final version was delivered ahead of schedule.",
  },
  {
    question: "Describe a time you improved a process.",
    category: "career_dev",
    transcript: "Our student organization was tracking event sign-ups in a shared spreadsheet that frequently had version conflicts. I moved us to a form-based system that auto-populated a master sheet. Time to reconcile RSVPs dropped from 40 minutes to under five.",
  },
  {
    question: "Tell me about a difficult decision you had to make.",
    category: "behavioral",
    transcript: "I had to recommend dropping a vendor relationship mid-semester that had a personal connection for a teammate. I laid out the cost data and risk profile objectively, the team agreed, and we found a better partner within two weeks.",
  },
  {
    question: "Walk me through how you would prioritize competing deadlines.",
    category: "technical",
    transcript: "I rank tasks by impact and urgency — not just due date — using a quick two-by-two. I communicate proactively if something has to shift, then batch similar work to protect focus time. That approach got me through a week with three finals and a part-time internship deadline.",
  },
  {
    question: "How would you explain a technical recommendation to a non-technical audience?",
    category: "career_dev",
    transcript: "I lead with the outcome in plain terms, then give one analogy that connects to something familiar. I save the methodology details for follow-up questions rather than front-loading them. A recent presentation I gave to a community nonprofit got a standing ovation from a non-technical board.",
  },
  {
    question: "Walk me through a time you used data to influence a decision.",
    category: "technical",
    transcript: "I analyzed two semesters of tutoring center visit data and showed that Thursday evening drop-in hours had 40% lower utilization but the same staffing cost. The director reallocated those hours to a high-demand Monday slot and saw a 25% increase in weekly sessions.",
  },
  {
    question: "Describe a time you worked effectively as part of a team.",
    category: "teamwork",
    transcript: "For a capstone consulting project we had five students across three majors. I built a shared Notion workspace, set weekly milestones, and created a role assignment doc so no one overlapped. We received an A and the client implemented two of our three recommendations.",
  },
  {
    question: "Tell me about a time you had to adapt quickly to change.",
    category: "career_dev",
    transcript: "My internship project was scoped for eight weeks but the team got a production incident that pulled everyone off for ten days. I independently reprioritized to work on documentation and testing, then re-onboarded the team to my progress in a structured handoff when they returned.",
  },
  {
    question: "Tell me about your greatest professional strength.",
    category: "behavioral",
    transcript: "I'm unusually good at translating ambiguous problems into structured plans. Whether it's a vague assignment from a professor or an open-ended client brief, I instinctively break it into components, assign time to each, and identify the first unknown I need to resolve. That's kept me ahead on almost every complex project.",
  },
  {
    question: "Where do you see yourself in five years?",
    category: "career_dev",
    transcript: "I see myself in a client-facing strategy role, having moved from individual contributor to someone who shapes the framing of problems, not just the solutions. I want to have built real domain depth in two or three industries and have managed at least one direct report through a meaningful project.",
  },
  {
    question: "Tell me about a time you took initiative without being asked.",
    category: "leadership",
    transcript: "I noticed our team had no standard onboarding doc for new project members and people kept asking the same three questions. I spent two evenings building a one-page reference sheet and posted it to our shared drive. Two semesters later it's still being used.",
  },
];

// ---------------------------------------------------------------------------
// STAR evidence excerpts + relevance data per question
// ---------------------------------------------------------------------------

type StarEvidence = { situation: string[]; task: string[]; action: string[]; result: string[] };

const STAR_EVIDENCE: StarEvidence[] = [
  // 0: led a team
  { situation: ["In my campus leadership role I coordinated a five-person team through a compressed timeline"], task: ["for a regional business plan competition with a hard submission deadline"], action: ["I delegated based on each person's strengths and held quick daily check-ins to catch blockers early"], result: ["We finished second in the regional round — our best result in three years"] },
  // 1: handled conflict
  { situation: ["Two group members disagreed on our financial model assumptions late in the project"], task: ["I needed to break the impasse without losing momentum toward our deadline"], action: ["I set up a working session where each person walked through their logic, then we aligned on a hybrid projection with documented assumptions"], result: ["The tension dropped immediately and we hit our deadline on time"] },
  // 2: failed and learned
  { situation: ["I underestimated how long it would take to build a client-facing report"], task: ["I had committed to a draft deadline I couldn't meet"], action: ["I owned it to my supervisor, communicated early, and created a buffer system for future projects"], result: ["The final version was delivered ahead of the revised schedule"] },
  // 3: improved a process
  { situation: ["Our student organization was tracking event sign-ups in a shared spreadsheet that frequently had version conflicts"], task: ["I needed a system that didn't require manual reconciliation after every event"], action: ["I moved us to a form-based system that auto-populated a master sheet with no manual merging"], result: ["Time to reconcile RSVPs dropped from 40 minutes to under five"] },
  // 4: difficult decision
  { situation: ["I had to recommend dropping a vendor relationship mid-semester that had a personal connection for a teammate"], task: ["The decision needed to be made on the merits without damaging the team dynamic"], action: ["I laid out the cost data and risk profile objectively and presented it to the team without framing it as a personal judgment"], result: ["The team agreed and we found a better partner within two weeks"] },
  // 5: prioritize competing deadlines
  { situation: ["I had a week with three finals and a part-time internship deliverable all due within four days"], task: ["I needed a system that would let me protect focus time without missing anything"], action: ["I ranked tasks by impact and urgency using a two-by-two matrix and communicated proactively when anything had to shift"], result: ["I hit every deadline that week without an all-nighter"] },
  // 6: technical to non-technical audience
  { situation: ["I was presenting a cloud migration recommendation to a community nonprofit board with no technical background"], task: ["I needed them to understand the risk and cost tradeoff without getting lost in infrastructure details"], action: ["I led with the outcome in plain terms, gave one analogy, and saved methodology for follow-up questions"], result: ["The board approved the recommendation and the presentation got a standing ovation"] },
  // 7: used data to influence a decision
  { situation: ["The tutoring center director was considering adding more evening drop-in hours based on intuition"], task: ["I had two semesters of visit data that told a different story"], action: ["I analyzed the utilization by time slot and showed that Thursday evenings had 40% lower traffic at the same staffing cost"], result: ["The director reallocated those hours to a high-demand Monday slot and saw a 25% increase in weekly sessions"] },
  // 8: worked as part of a team
  { situation: ["For a capstone consulting project we had five students across three majors with no shared tooling"], task: ["I needed to create coordination structure so work didn't overlap or fall through the cracks"], action: ["I built a shared Notion workspace, set weekly milestones, and created a role assignment doc"], result: ["We received an A and the client implemented two of our three recommendations"] },
  // 9: adapted quickly to change
  { situation: ["My internship project was scoped for eight weeks when a production incident pulled the entire team off for ten days"], task: ["I had to stay productive and re-integrate without creating catch-up chaos"], action: ["I independently reprioritized to documentation and testing, then built a structured handoff to re-onboard the team to my progress"], result: ["The handoff took one meeting and we recovered the timeline within the sprint"] },
  // 10: greatest strength
  { situation: ["I'm asked to describe my greatest professional strength"], task: ["The question is looking for a strength that's specific and backed with evidence"], action: ["I instinctively break ambiguous problems into components, assign time to each, and identify the first unknown I need to resolve"], result: ["That approach has kept me ahead on almost every complex project across internships and coursework"] },
  // 11: five years
  { situation: ["I'm asked where I see myself in five years"], task: ["The answer should show direction without sounding scripted or generic"], action: ["I'm building domain depth in two to three industries and developing my ability to shape problem framing, not just solutions"], result: ["I want to be managing at least one direct report through a meaningful project within that window"] },
  // 12: took initiative
  { situation: ["Our team had no standard onboarding doc and new members kept asking the same three questions"], task: ["No one had been assigned to fix it and it was creating recurring friction"], action: ["I spent two evenings building a one-page reference sheet and posted it to our shared drive unprompted"], result: ["Two semesters later it's still being used by every new project member"] },
];

const RELEVANCE_MISSED_PARTS = [
  "The result was not quantified - a specific metric would close this gap.",
  "The situation was not fully established before moving to action.",
  "The answer addresses the theme but not the specific question asked.",
  "The task or goal was not stated explicitly.",
  "The action taken was described but not differentiated from what anyone would do.",
  "The result was implied rather than stated directly.",
];

// ---------------------------------------------------------------------------
// Archetype definitions
// ---------------------------------------------------------------------------

type DeliveryArchetype =
  | "Polished Performer"
  | "Hedger"
  | "Monotone Expert"
  | "Quiet Achiever"
  | "Scattered Thinker"
  | "Vague Narrator"
  | "Rusher"
  | "Overloader";

const ARCHETYPE_META: Record<DeliveryArchetype, { coaching: string; description: string }> = {
  "Polished Performer": {
    description: "Your fundamentals are solid - clean delivery, clear structure, and ownership language working together.",
    coaching: "You're executing well. The next level is one specific metric or dollar figure in your Result to separate you from other strong candidates.",
  },
  "Hedger": {
    description: "Your content is there but your ownership language is softening it - too much 'we' and conditional phrasing.",
    coaching: "Start your next answer with 'I decided...' or 'I drove...' - first-person ownership in the opening line immediately shifts the confidence signal.",
  },
  "Monotone Expert": {
    description: "Your content is solid but the delivery is acoustically flat - the answer sounds recited rather than lived.",
    coaching: "When you reach your Result, raise your pitch slightly and pause one beat before saying the outcome. That contrast will carry the whole answer.",
  },
  "Quiet Achiever": {
    description: "Your content and ownership are strong but your delivery energy isn't matching the quality of what you're saying.",
    coaching: "The story is there - project 15% more volume on your Action and Result sections and the answer will land the way it deserves to.",
  },
  "Scattered Thinker": {
    description: "Your ideas are present but not sequenced - the interviewer has to work to track your through-line.",
    coaching: "Write S-T-A-R on paper before your next attempt and say 'Situation:' out loud before you start. The label forces structure.",
  },
  "Vague Narrator": {
    description: "The story is plausible but not grounded - no numbers, named tools, or concrete proof points.",
    coaching: "Add one concrete number to your Result - a percentage, timeline, or dollar figure. Even a rough estimate makes the story credible.",
  },
  "Rusher": {
    description: "Your pace is outrunning your content - the interviewer is processing before you finish landing your points.",
    coaching: "Slow down the first sentence of your Result section. That's the moment interviewers decide if they understood you.",
  },
  "Overloader": {
    description: "Strong depth and detail, but you're burying the lead - the setup is longer than the answer can justify.",
    coaching: "Your first two sentences should cover the entire Situation and Task. Everything after that is Action and Result.",
  },
};

const ARCHETYPE_PRIMARY_SIGNALS: Record<DeliveryArchetype, string[]> = {
  "Polished Performer":  ["overall_score", "communication", "confidence"],
  "Hedger":              ["ownership", "confidence_score", "we_vs_i_ratio"],
  "Monotone Expert":     ["monotoneScore", "pitchRange", "vocal_dynamics"],
  "Quiet Achiever":      ["energyMean", "expressiveness", "delivery_energy"],
  "Scattered Thinker":   ["structure", "directness", "communication_score"],
  "Vague Narrator":      ["specificity", "outcome_strength", "star_result"],
  "Rusher":              ["wpm", "pace", "fillers_per_100"],
  "Overloader":          ["word_count", "directness", "structure"],
};

// ---------------------------------------------------------------------------
// Strengths and improvements per archetype stage
// ---------------------------------------------------------------------------

const STRENGTHS: Record<DeliveryArchetype, string[][]> = {
  "Polished Performer": [
    ["Your structure is clean - each section of the answer flows naturally into the next.", "The closing impact lands clearly - the interviewer hears what changed.", "Ownership language is strong throughout - the contribution is unmistakable."],
    ["Your pace is controlled - each point gets the space it needs to land.", "The answer closes the loop: situation, action, and result all accounted for.", "Confidence comes through consistently, not just in flashes."],
    ["Strong first-person framing from the opening line.", "The answer has real specificity - named tools and measurable outcomes.", "Delivery and content are working together here, not against each other."],
  ],
  "Hedger": [
    ["There's genuine structure here - the story has a beginning, middle, and end.", "The detail level is appropriate - you're not padding or rushing.", "The underlying content quality is higher than the delivery currently signals."],
    ["Your context-setting is efficient - the setup doesn't overstay its welcome.", "The answer addresses what was asked without going off-topic.", "There's evidence of real preparation - this isn't a generic answer."],
    ["The completeness is there - you're covering the full question.", "The transition from situation to action is smooth.", "Depth is present - you've developed the idea beyond a headline."],
  ],
  "Monotone Expert": [
    ["The content is technically strong - you clearly understand what you did.", "Your specificity is above average - named tools and actual numbers appear.", "The structure is logical and easy to follow even when delivery is flat."],
    ["You're bringing real depth to the answer - this isn't surface-level.", "The result is stated clearly even if the delivery doesn't emphasize it.", "Your pacing is controlled - you're not rushing through the technical content."],
    ["The answer is complete - all four STAR sections are present.", "Your ownership is direct - you're not hiding behind team language.", "Clarity is genuine here - the listener can follow the technical arc."],
  ],
  "Quiet Achiever": [
    ["The ownership language is strong - your role is unmistakably named.", "The answer has real specificity - numbers and named outcomes are present.", "Your structure is clean and the through-line is easy to follow."],
    ["The result section is your strongest moment - the impact lands.", "You're not hedging - the language is direct and confident.", "The answer covers the full question without padding."],
    ["Good pacing - you're not rushing the key details.", "The story is grounded in something real, not generic.", "The transition from action to result is well-executed."],
  ],
  "Scattered Thinker": [
    ["There are real examples in here - the raw material is workable.", "You have genuine experience behind this answer - it shows.", "Some of your individual sentences are strong even if the sequence needs work."],
    ["The attempt is earnest - you're engaging with the question.", "There's specificity in places - a few concrete details are present.", "The energy is present even if the structure isn't yet."],
    ["You're not repeating yourself - each sentence adds something new.", "The answer stays relevant - you're not going off-topic.", "There are moments of strong ownership scattered through the response."],
  ],
  "Vague Narrator": [
    ["The story arc is present - situation, action, and something like a result.", "You're following the structure - the answer has a beginning and middle.", "The answer is honest - you're not overclaiming what you did."],
    ["Your pace is appropriate - you're not rushing the story.", "The action section has some detail - you're explaining the how.", "The relevance is there - you're answering what was asked."],
    ["You're showing some ownership in the action section.", "The answer is an appropriate length - you're not padding.", "There's real effort here - the foundation is workable."],
  ],
  "Rusher": [
    ["The content quality is higher than the delivery speed suggests.", "Your ideas are organized - if slowed down this would score well.", "You're covering all the STAR components even at speed."],
    ["The specificity is there - you're bringing real examples.", "Ownership language is present - you're claiming your contribution.", "The answer stays on topic throughout."],
    ["The result section exists - you're completing the loop.", "Your preparation shows - this isn't a generic answer.", "There's real experience behind this response."],
  ],
  "Overloader": [
    ["The depth of your knowledge shows - this is clearly a real experience.", "Your answer has strong action detail - you know what you did.", "The result is in there - you do close the loop."],
    ["Specificity is high - you're naming tools, people, and outcomes.", "Your ownership is clear - there's no hiding behind 'we' language.", "Preparation is evident - this is a real story, not a fabrication."],
    ["The technical accuracy is strong - the details are consistent.", "You're bringing context that makes the story believable.", "The underlying answer is stronger than the structure is letting it appear."],
  ],
};

const IMPROVEMENTS: Record<DeliveryArchetype, string[][]> = {
  "Polished Performer": [
    ["Adding one specific metric to your Result would separate this from other strong answers.", "The close is almost there - naming the actual number or percentage would lock it in.", "There's nothing critical to fix - the next iteration is about precision, not foundation."],
    ["A sharper Situation setup in one sentence would tighten an already strong answer.", "The answer is polished enough that the next gain is in the Result specificity.", "Consider adding the timeline to your result - 'within three weeks' adds credibility."],
    ["One more concrete proof point in the Action would raise this from strong to excellent.", "The answer stands on its own - the marginal gain is in the closing precision.", "Specificity in the outcome line is your highest available lever right now."],
  ],
  "Hedger": [
    ["Your role in the outcome isn't clear enough - 'I led' needs to replace 'we worked on' throughout.", "First-person ownership language would immediately raise the confidence signal - 'I decided' rather than 'we decided'.", "The ownership gap is the highest-leverage fix available - name your specific contribution directly."],
    ["The answer is using too much conditional phrasing - 'I tried to' and 'I think I managed' are weakening strong content.", "Replacing 'we' with 'I' in your Action section would change how this answer is read entirely.", "The story needs a clearer main character - that character is you, and the language needs to reflect that."],
    ["First-person verbs in the opening sentence would shift the entire confidence signal.", "The credit is being shared where it should be claimed - 'I drove' over 'we drove'.", "Ownership is the fastest confidence lever available here - use it more directly."],
  ],
  "Monotone Expert": [
    ["Your vocal range is flat - raising pitch slightly on the Result would make the whole answer feel more dynamic.", "The delivery is acoustically consistent in a way that reads as rehearsed - more pitch variation would fix this.", "Vocal variety is the fastest delivery improvement available for this response."],
    ["The answer sounds recited rather than lived - a deliberate pause before your key result would change that.", "More emphasis at key moments - especially the outcome line - would help the answer feel intentional.", "The flatness in delivery is costing more points than the content quality deserves to lose."],
    ["Energy level in the Action section needs to increase - you're describing strong work in a flat voice.", "One beat of silence before your best line would create contrast your voice currently lacks.", "The vocal delivery needs to match the quality of what you're describing."],
  ],
  "Quiet Achiever": [
    ["Your delivery energy isn't matching the content quality - project more volume on the Action and Result.", "The answer sounds quieter than it should - that's a delivery gap, not a content one.", "Expressiveness in your voice needs to come up - the story deserves more presence than it's getting."],
    ["Volume and energy in the closing section would change how confident this reads.", "The content is strong but the delivery is understating it - raise your energy in the final 30 seconds.", "Eye contact and vocal energy need to align with the ownership language you're using."],
    ["The gap between this and a polished answer is purely delivery energy - the content is already there.", "More vocal projection on your Result would make the close land the way it deserves to.", "Your expressiveness needs to catch up to your confidence in the content."],
  ],
  "Scattered Thinker": [
    ["The structure needs deliberate work - STAR labeling out loud would force the sequence you need.", "Ideas are present but not sequenced - the interviewer is working too hard to follow the through-line.", "A cleaner structure would reveal an answer that is stronger than its current delivery suggests."],
    ["Starting with one sentence that names the situation would anchor the rest of the answer.", "The through-line is missing - connect each section explicitly to what came before.", "Structure is the highest-leverage fix - the content is workable, the shape isn't."],
    ["The answer wanders between sections in a way that costs coherence - needs tighter sequencing.", "Write S-T-A-R on paper before your next attempt and label each section as you start it.", "Better organization would immediately raise the perceived quality of this response."],
  ],
  "Vague Narrator": [
    ["One concrete number in the Result would make this story feel real - a percentage, a timeline, or a dollar figure.", "The biggest gap is specificity - the story is plausible but has no proof points.", "A named tool, metric, or outcome would immediately raise the credibility of this response."],
    ["Adding the actual result - even a rough estimate - would close the most significant scoring gap.", "The answer needs one fact that couldn't be made up - a specific number or named decision.", "Specificity is the fastest fix available here - pick one detail and make it concrete."],
    ["The outcome is still too vague to score well - name what actually changed or improved.", "The story stops before it reaches its conclusion - add one sentence with a real outcome.", "A measurable result would make the rest of the answer land much harder."],
  ],
  "Rusher": [
    ["Slowing down on the Result section would let the most important part of the answer land properly.", "The pace is outrunning the content - the interviewer is processing before you've finished making your point.", "One deliberate pause before your outcome would change how confident this sounds."],
    ["The answer needs to breathe - especially in the Action and Result sections.", "A slower pace in the final 20 seconds would raise the perceived confidence level significantly.", "Rushing through your strongest moments is undercutting an otherwise good answer."],
    ["The delivery pace is the main thing preventing this from landing - the content is there.", "Slow down in the places that matter most - the decision and the result.", "Tempo is the most fixable delivery issue in this response."],
  ],
  "Overloader": [
    ["The Situation section is too long - one sentence should cover it, not four.", "You're burying the lead - get to your action faster, the setup is overloading the interviewer.", "Compress the context to give the action and result the space they deserve."],
    ["The answer warms up too long before the real content arrives.", "Your first two sentences should complete the Situation and Task - everything else is Action and Result.", "The answer is covering too much ground before getting to what matters."],
    ["Cut the setup in half and use that time on the Result - that's where the score is.", "The lead is buried under context that would be better as a one-sentence frame.", "Directness is the clearest opportunity here - get to your decision faster."],
  ],
};

// ---------------------------------------------------------------------------
// Persona profiles
// ---------------------------------------------------------------------------

type PersonaKey = "MARCUS" | "AALIYAH" | "DIEGO" | "SOPHIE" | "JORDAN";

type Persona = {
  overallStart: number;   overallEnd: number;
  commStart: number;      commEnd: number;
  confStart: number;      confEnd: number;
  fillersStart: number;   fillersEnd: number;
  wpmStart: number;       wpmEnd: number;
  closingStart: number;   closingEnd: number;
  volatility: number;
  monotoneStart: number;  monotoneEnd: number;
  pitchMeanBase: number;
  pitchStdStart: number;  pitchStdEnd: number;
  pitchRangeStart: number; pitchRangeEnd: number;
  energyMeanBase: number;
  energyStdStart: number; energyStdEnd: number;
  energyVarStart: number; energyVarEnd: number;
  tempoDynStart: number;  tempoDynEnd: number;
  // Face metrics
  eyeContactStart: number;    eyeContactEnd: number;
  expressivenessStart: number; expressivenessEnd: number;
  headStabilityStart: number;  headStabilityEnd: number;
  smileRateStart: number;      smileRateEnd: number;
  blinkRateStart: number;      blinkRateEnd: number;  // blinks/min; 12–20 = ideal
  browEngagementStart: number; browEngagementEnd: number;
  lookAwayRateStart: number;   lookAwayRateEnd: number;
  // ESL mode
  useEslMode: boolean;
  // Archetype progression: [threshold_t, archetype][] - first matching t wins
  archetypeArc: [number, DeliveryArchetype][];
  // Coaching intervention note for admin (Sophie only, effectively)
  interventionNote?: string;
};

const MARCUS: Persona = {
  overallStart: 52,  overallEnd: 81,
  commStart: 5.2,    commEnd: 7.9,
  confStart: 4.8,    confEnd: 7.7,
  fillersStart: 5.1, fillersEnd: 1.6,
  wpmStart: 95,      wpmEnd: 132,
  closingStart: 4.9, closingEnd: 7.8,
  volatility: 3.2,
  monotoneStart: 7.6, monotoneEnd: 4.2,
  pitchMeanBase: 168,
  pitchStdStart: 9,   pitchStdEnd: 26,
  pitchRangeStart: 50, pitchRangeEnd: 140,
  energyMeanBase: 0.10,
  energyStdStart: 0.011, energyStdEnd: 0.040,
  energyVarStart: 2.2,   energyVarEnd: 6.8,
  tempoDynStart: 2.4,    tempoDynEnd: 6.0,
  eyeContactStart: 0.44,    eyeContactEnd: 0.84,
  expressivenessStart: 0.38, expressivenessEnd: 0.76,
  headStabilityStart: 0.58,  headStabilityEnd: 0.88,
  smileRateStart: 0.08,      smileRateEnd: 0.28,
  blinkRateStart: 28,        blinkRateEnd: 17,
  browEngagementStart: 0.20, browEngagementEnd: 0.50,
  lookAwayRateStart: 0.28,   lookAwayRateEnd: 0.12,
  useEslMode: false,
  archetypeArc: [
    [0.30, "Hedger"],
    [0.58, "Quiet Achiever"],
    [1.00, "Polished Performer"],
  ],
};

const AALIYAH: Persona = {
  overallStart: 72,  overallEnd: 88,
  commStart: 7.4,    commEnd: 8.8,
  confStart: 7.2,    confEnd: 8.6,
  fillersStart: 1.8, fillersEnd: 0.9,
  wpmStart: 138,     wpmEnd: 148,
  closingStart: 7.0, closingEnd: 8.6,
  volatility: 1.8,
  monotoneStart: 3.2, monotoneEnd: 2.2,
  pitchMeanBase: 210,
  pitchStdStart: 28,  pitchStdEnd: 38,
  pitchRangeStart: 155, pitchRangeEnd: 195,
  energyMeanBase: 0.17,
  energyStdStart: 0.048, energyStdEnd: 0.062,
  energyVarStart: 8.0,   energyVarEnd: 9.2,
  tempoDynStart: 6.8,    tempoDynEnd: 7.8,
  eyeContactStart: 0.80,    eyeContactEnd: 0.93,
  expressivenessStart: 0.76, expressivenessEnd: 0.91,
  headStabilityStart: 0.82,  headStabilityEnd: 0.94,
  smileRateStart: 0.42,      smileRateEnd: 0.58,
  blinkRateStart: 16,        blinkRateEnd: 15,
  browEngagementStart: 0.55, browEngagementEnd: 0.72,
  lookAwayRateStart: 0.06,   lookAwayRateEnd: 0.04,
  useEslMode: false,
  archetypeArc: [
    [0.10, "Overloader"],  // early attempts front-load too much detail
    [1.00, "Polished Performer"],
  ],
};

const DIEGO: Persona = {
  overallStart: 58,  overallEnd: 79,
  commStart: 5.5,    commEnd: 7.5,
  confStart: 5.0,    confEnd: 7.4,
  fillersStart: 4.2, fillersEnd: 1.9,
  wpmStart: 108,     wpmEnd: 134,
  closingStart: 5.2, closingEnd: 7.2,
  volatility: 2.8,
  monotoneStart: 6.8, monotoneEnd: 3.8,
  pitchMeanBase: 172,
  pitchStdStart: 10,  pitchStdEnd: 24,
  pitchRangeStart: 60, pitchRangeEnd: 135,
  energyMeanBase: 0.11,
  energyStdStart: 0.014, energyStdEnd: 0.038,
  energyVarStart: 2.8,   energyVarEnd: 6.2,
  tempoDynStart: 3.0,    tempoDynEnd: 5.6,
  eyeContactStart: 0.50,    eyeContactEnd: 0.76,
  expressivenessStart: 0.36, expressivenessEnd: 0.64,
  headStabilityStart: 0.68,  headStabilityEnd: 0.86,
  smileRateStart: 0.14,      smileRateEnd: 0.34,
  blinkRateStart: 24,        blinkRateEnd: 16,
  browEngagementStart: 0.18, browEngagementEnd: 0.42,
  lookAwayRateStart: 0.22,   lookAwayRateEnd: 0.10,
  useEslMode: true,  // bilingual - ESL mode active throughout
  archetypeArc: [
    [0.40, "Monotone Expert"],
    [0.80, "Quiet Achiever"],
    [1.00, "Polished Performer"],
  ],
};

const SOPHIE: Persona = {
  overallStart: 65,  overallEnd: 69,
  commStart: 6.5,    commEnd: 6.9,
  confStart: 6.2,    confEnd: 6.6,
  fillersStart: 2.8, fillersEnd: 2.4,
  wpmStart: 124,     wpmEnd: 130,
  closingStart: 6.2, closingEnd: 6.5,
  volatility: 2.6,
  monotoneStart: 5.4, monotoneEnd: 5.2,
  pitchMeanBase: 220,
  pitchStdStart: 15,  pitchStdEnd: 17,
  pitchRangeStart: 90, pitchRangeEnd: 100,
  energyMeanBase: 0.13,
  energyStdStart: 0.024, energyStdEnd: 0.027,
  energyVarStart: 4.5,   energyVarEnd: 4.9,
  tempoDynStart: 4.2,    tempoDynEnd: 4.6,
  eyeContactStart: 0.64,    eyeContactEnd: 0.73,
  expressivenessStart: 0.40, expressivenessEnd: 0.46,
  headStabilityStart: 0.70,  headStabilityEnd: 0.76,
  smileRateStart: 0.20,      smileRateEnd: 0.24,
  blinkRateStart: 19,        blinkRateEnd: 18,
  browEngagementStart: 0.30, browEngagementEnd: 0.34,
  lookAwayRateStart: 0.14,   lookAwayRateEnd: 0.12,
  useEslMode: false,
  // Sophie is always a Hedger - this IS her plateau. Occasional Vague Narrator for variety.
  archetypeArc: [
    [1.00, "Hedger"],
  ],
  interventionNote: "18 sessions with minimal score movement. Archetype has remained Hedger throughout - ownership language is the consistent blocker. Recommend 1:1 coaching session focused on first-person framing.",
};

const JORDAN: Persona = {
  overallStart: 44,  overallEnd: 62,
  commStart: 4.2,    commEnd: 6.1,
  confStart: 3.8,    confEnd: 5.8,
  fillersStart: 6.4, fillersEnd: 3.2,
  wpmStart: 85,      wpmEnd: 115,
  closingStart: 4.0, closingEnd: 5.8,
  volatility: 4.2,
  monotoneStart: 8.4, monotoneEnd: 6.2,
  pitchMeanBase: 195,
  pitchStdStart: 6,   pitchStdEnd: 16,
  pitchRangeStart: 35, pitchRangeEnd: 85,
  energyMeanBase: 0.08,
  energyStdStart: 0.008, energyStdEnd: 0.025,
  energyVarStart: 1.5,   energyVarEnd: 4.2,
  tempoDynStart: 1.8,    tempoDynEnd: 4.0,
  eyeContactStart: 0.26,    eyeContactEnd: 0.56,
  expressivenessStart: 0.22, expressivenessEnd: 0.52,
  headStabilityStart: 0.42,  headStabilityEnd: 0.66,
  smileRateStart: 0.04,      smileRateEnd: 0.14,
  blinkRateStart: 32,        blinkRateEnd: 24,
  browEngagementStart: 0.12, browEngagementEnd: 0.28,
  lookAwayRateStart: 0.38,   lookAwayRateEnd: 0.22,
  useEslMode: false,
  archetypeArc: [
    [0.50, "Scattered Thinker"],
    [1.00, "Vague Narrator"],
  ],
};

// ---------------------------------------------------------------------------
// Archetype selection
// ---------------------------------------------------------------------------

function getArchetype(persona: Persona, t: number): DeliveryArchetype {
  // Sophie occasionally gets Vague Narrator for realism
  if (persona === SOPHIE && Math.random() < 0.25) return "Vague Narrator";
  for (const [threshold, archetype] of persona.archetypeArc) {
    if (t <= threshold) return archetype;
  }
  return persona.archetypeArc[persona.archetypeArc.length - 1][1];
}

// ---------------------------------------------------------------------------
// Attempt builder
// ---------------------------------------------------------------------------

function buildAttempt(
  persona: Persona,
  i: number,
  total: number,
  attemptDate: Date,
  userId: string,
  tenantId: string,
) {
  const t  = total === 1 ? 1 : i / Math.max(1, total - 1);
  const v  = persona.volatility;
  const qIdx = Math.floor(random(0, QUESTIONS.length));
  const q  = QUESTIONS[qIdx];
  const sl = q.category === "technical" ? 0.3 : q.category === "career_dev" ? 0.2 : 0;

  const overallScore       = round1(clamp(noise(lerp(persona.overallStart, persona.overallEnd, t), v), 38, 95));
  const communicationScore = round1(clamp(noise(lerp(persona.commStart,    persona.commEnd,    t), v * 0.12), 3.5, 9.5));
  const confidenceScore    = round1(clamp(noise(lerp(persona.confStart,    persona.confEnd,    t), v * 0.12), 3.5, 9.5));
  const fillersPer100      = round1(clamp(noise(lerp(persona.fillersStart, persona.fillersEnd, t), v * 0.18), 0.3, 7.0));
  const wpm                = Math.round(clamp(noise(lerp(persona.wpmStart, persona.wpmEnd, t), v * 2), 82, 175));
  const closingImpact      = round1(clamp(noise(lerp(persona.closingStart, persona.closingEnd, t), v * 0.15), 3.5, 9.5));

  const monotoneScore  = round1(clamp(noise(lerp(persona.monotoneStart, persona.monotoneEnd, t), v * 0.08), 1.5, 9.2));
  const pitchStd       = round1(clamp(noise(lerp(persona.pitchStdStart, persona.pitchStdEnd, t), v * 0.6), 4, 48));
  const pitchRange     = round1(clamp(noise(lerp(persona.pitchRangeStart, persona.pitchRangeEnd, t), v * 2), 28, 225));
  const pitchMean      = round1(clamp(noise(persona.pitchMeanBase, v * 1.5), 115, 270));
  const energyStd      = round2(clamp(noise(lerp(persona.energyStdStart, persona.energyStdEnd, t), v * 0.002), 0.006, 0.082));
  const energyVar      = round1(clamp(noise(lerp(persona.energyVarStart, persona.energyVarEnd, t), v * 0.15), 1.0, 9.8));
  const energyMean     = round2(clamp(noise(persona.energyMeanBase, v * 0.004), 0.04, 0.24));
  const tempoDyn       = round1(clamp(noise(lerp(persona.tempoDynStart, persona.tempoDynEnd, t), v * 0.2), 1.5, 9.5));
  const tempo          = round1(clamp(wpm + random(-6, 8), 80, 180));

  // Face metrics - webcam-derived, improving over time with persona-specific ranges
  const eyeContact      = round3(clamp(noise(lerp(persona.eyeContactStart, persona.eyeContactEnd, t), 0.06), 0.10, 0.98));
  const expressiveness  = round3(clamp(noise(lerp(persona.expressivenessStart, persona.expressivenessEnd, t), 0.05), 0.08, 0.96));
  const headStability   = round3(clamp(noise(lerp(persona.headStabilityStart, persona.headStabilityEnd, t), 0.04), 0.20, 0.98));
  const smileRate       = round3(clamp(noise(lerp(persona.smileRateStart, persona.smileRateEnd, t), 0.04), 0.00, 0.90));
  const blinkRate       = Math.round(clamp(noise(lerp(persona.blinkRateStart, persona.blinkRateEnd, t), v * 0.8), 8, 45));
  const browEngagement  = round3(clamp(noise(lerp(persona.browEngagementStart, persona.browEngagementEnd, t), 0.04), 0.00, 0.95));
  const lookAwayRate    = round3(clamp(noise(lerp(persona.lookAwayRateStart, persona.lookAwayRateEnd, t), 0.04), 0.00, 0.70));
  const framesAnalyzed  = Math.round(random(380, 520)); // 30fps * ~13-17s window

  // Archetype
  const archetype = getArchetype(persona, t);
  const { coaching, description } = ARCHETYPE_META[archetype];
  const primarySignals = ARCHETYPE_PRIMARY_SIGNALS[archetype];

  // Strengths + improvements - pick a consistent variant set based on attempt index
  const variantIdx = i % 3;
  const strengths   = STRENGTHS[archetype][variantIdx];
  const improvements = IMPROVEMENTS[archetype][variantIdx];

  // Relevance scores - correlate with overall score and archetype
  const relevanceBase = round1(clamp(noise(lerp(overallScore * 0.095, overallScore * 0.105, t), v * 0.04), 3.5, 9.8));
  const directnessBase = round1(clamp(noise(relevanceBase, v * 0.08), 3.2, 9.8));
  const completenessBase = round1(clamp(noise(closingImpact, v * 0.08), 3.5, 9.8));
  const offTopicScore = round1(clamp(10 - relevanceBase + noise(0, v * 0.06), 0.5, 6.5));
  const answeredQuestion = relevanceBase >= 5.2;

  // Missed parts - more for weaker answers
  const missedCount = completenessBase < 6.0 ? (completenessBase < 5.0 ? 2 : 1) : 0;
  const missedParts: string[] = [];
  for (let m = 0; m < missedCount; m++) {
    const candidate = RELEVANCE_MISSED_PARTS[(i + m * 3) % RELEVANCE_MISSED_PARTS.length];
    if (!missedParts.includes(candidate)) missedParts.push(candidate);
  }

  const relevanceExplanationPool = [
    `The answer addresses the question directly with a concrete example and a named outcome.`,
    `The response is on-topic but the connection to the specific role requirements could be sharper.`,
    `The example is relevant to the question but the result section doesn't close the loop on what was asked.`,
    `Strong relevance - the answer maps directly to the core of what was asked.`,
    `The answer is partially relevant but drifts in the middle before returning to the question.`,
  ];
  const relevanceExplanation = relevanceExplanationPool[Math.floor(relevanceBase) % relevanceExplanationPool.length];

  // STAR evidence excerpts - from the pre-mapped pool
  const baseEvidence = STAR_EVIDENCE[qIdx % STAR_EVIDENCE.length];

  // Confidence explanation tied to delivery state
  let confidenceExplanation: string;
  if (confidenceScore >= 7.8) {
    confidenceExplanation = "Strong ownership language and a controlled close are reading as genuine confidence here.";
  } else if (fillersPer100 > 4.0 && confidenceScore < 6.5) {
    confidenceExplanation = "The filler frequency is reducing the confidence signal - the content is stronger than the delivery is suggesting.";
  } else if (wpm > 158) {
    confidenceExplanation = "The pace is the main thing translating as low confidence - slowing down on the result would change the read.";
  } else if (monotoneScore > 6.0) {
    confidenceExplanation = "A flat vocal delivery is making the answer sound more uncertain than the content warrants.";
  } else {
    confidenceExplanation = "Confidence is developing - stronger first-person framing and a deliberate close would raise this meaningfully.";
  }

  return {
    userId,
    tenantId,
    ts: attemptDate,
    createdAt: attemptDate,
    question: q.question,
    questionCategory: q.category,
    evaluationFramework: "star",
    transcript: q.transcript,
    score: overallScore,
    communicationScore,
    confidenceScore,
    wpm,
    inputMethod: "spoken",
    feedback: {
      score: round1(overallScore / 10),
      communication_score: communicationScore,
      confidence_score: confidenceScore,
      confidence_explanation: confidenceExplanation,
      filler: {
        total: Math.round(fillersPer100 * random(8, 14) / 10),
        per100: fillersPer100,
      },
      star: {
        situation: round1(clamp(random(5.5, 8.5) + sl, 1, 10)),
        task:      round1(clamp(random(5.5, 8.5) + sl, 1, 10)),
        action:    round1(clamp(random(6.0, 8.9) + sl, 1, 10)),
        result:    closingImpact,
      },
      strengths,
      improvements,
      relevance: {
        answered_question: answeredQuestion,
        relevance_score: relevanceBase,
        directness_score: directnessBase,
        completeness_score: completenessBase,
        off_topic_score: offTopicScore,
        missed_parts: missedParts,
        relevance_explanation: relevanceExplanation,
      },
      star_evidence: baseEvidence,
      delivery_archetype: archetype,
      archetype_coaching: coaching,
      archetype_description: description,
      archetype_signals: primarySignals,
      esl_mode_active: persona.useEslMode,
      ...(persona.useEslMode && confidenceScore < 7 ? {
        esl_cultural_note: "US interviews reward first-person declarative language as a proxy for leadership potential. 'I led the project' scores differently than 'I was involved in the project' even if the underlying contribution was identical. This is a learnable convention - it's not about changing how you actually work, just how you describe it.",
      } : {}),
      dimension_scores: {
        narrative_clarity:   { score: round1(clamp(noise((communicationScore + relevanceBase + directnessBase) / 3, v * 0.08), 3.5, 9.5)) },
        evidence_quality:    { score: round1(clamp(noise((closingImpact + completenessBase + relevanceBase) / 3, v * 0.08), 3.5, 9.5)) },
        ownership_agency:    { score: round1(clamp(noise(lerp(persona.confStart * 0.9, persona.confEnd * 0.9, t), v * 0.10), 3.5, 9.5)) },
        response_control:    { score: round1(clamp(noise((directnessBase + completenessBase) / 2, v * 0.08), 3.5, 9.5)) },
        cognitive_depth:     { score: round1(clamp(noise((completenessBase + closingImpact) / 2, v * 0.09), 3.5, 9.5)) },
        presence_confidence: { score: round1(clamp(noise(confidenceScore, v * 0.08), 3.5, 9.5)) },
        vocal_engagement:    { score: round1(clamp(noise((tempoDyn + (10 - monotoneScore * 0.5)) / 2, v * 0.10), 3.5, 9.5)) },
      },
    },
    prosody: {
      monotone: monotoneScore,
      monotoneScore,
      pitchMean,
      pitchStd,
      pitchRange,
      energyMean,
      energyVariation: energyVar,
      fillerRate: round2(fillersPer100 / 100),
      tempoDynamics: tempoDyn,
    },
    deliveryMetrics: {
      fillersPer100,
      fillerWordsPerMin: round1(clamp(fillersPer100 * random(0.85, 1.35), 0.6, 9.0)),
      pacingScore: round1(clamp(9 - Math.abs(wpm - 132) / 12, 4.5, 9.2) * 10),
      acoustics: {
        monotoneScore,
        pitchMean,
        pitchStd,
        pitchRange,
        energyMean,
        energyStd,
        energyVariation: energyVar,
        tempo,
        tempoDynamics: tempoDyn,
        durationSec: round1(random(55, 130)),
        sampleRate: 22050,
      },
      face: {
        eyeContact,
        expressiveness,
        headStability,
        smileRate,
        blinkRate,
        browEngagement,
        lookAwayRate,
        framesAnalyzed,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Interview Seed
// ---------------------------------------------------------------------------

function buildMockInterview(
  userId: string,
  tenantId: string,
  role: string,
  daysAgoVal: number,
  overallScore: number,
  readinessLevel: "not_ready" | "developing" | "ready" | "strong",
): object {
  const ts = daysAgo(new Date(), daysAgoVal);
  const dimScores = {
    narrative_clarity:   { score: round1(clamp(noise(overallScore / 12.5, 0.8), 3.5, 9.5)), label: "Narrative Clarity",   coaching: "Good structure on behavioral questions. Keep leading with the outcome when framing your answer." },
    evidence_quality:    { score: round1(clamp(noise(overallScore / 12.8, 0.9), 3.5, 9.5)), label: "Evidence Quality",    coaching: "Specific patient examples land well. Add a measurable outcome (patient satisfaction, recovery time) when you can." },
    ownership_agency:    { score: round1(clamp(noise(overallScore / 11.5, 0.7), 3.5, 9.5)), label: "Ownership & Agency",  coaching: "You use 'I' consistently. Keep that first-person ownership framing throughout." },
    response_control:    { score: round1(clamp(noise(overallScore / 12.2, 0.8), 3.5, 9.5)), label: "Response Control",   coaching: "Answers are focused and on-topic. Watch for over-explaining in the situation setup." },
    cognitive_depth:     { score: round1(clamp(noise(overallScore / 13.0, 0.9), 3.5, 9.5)), label: "Cognitive Depth",    coaching: "Add one sentence on the tradeoff or risk you managed to lift this dimension further." },
    presence_confidence: { score: round1(clamp(noise(overallScore / 12.0, 0.7), 3.5, 9.5)), label: "Presence & Confidence", coaching: "Confident framing throughout. Minor hedging on clinical knowledge questions -- cut 'I think' when describing protocols." },
    vocal_engagement:    { score: round1(clamp(noise(overallScore / 11.8, 0.8), 3.5, 9.5)), label: "Vocal Engagement",   coaching: "Pace is strong. Lift slightly on the result sentence so it lands as a distinct close." },
  };

  const qScores = [
    round1(clamp(noise(overallScore, 8), 45, 95)),
    round1(clamp(noise(overallScore + 2, 8), 45, 95)),
    round1(clamp(noise(overallScore - 1, 8), 45, 95)),
    round1(clamp(noise(overallScore + 1, 7), 45, 95)),
    round1(clamp(noise(overallScore - 2, 9), 45, 95)),
  ];

  return {
    userId,
    tenantId,
    ts,
    createdAt: ts,
    question: `Mock Interview — ${role}`,
    questionCategory: "mock_interview",
    evaluationFramework: "mock_interview",
    inputMethod: "spoken",
    score: round1(overallScore / 10),
    communicationScore: dimScores.narrative_clarity.score,
    confidenceScore: dimScores.presence_confidence.score,
    wpm: Math.round(clamp(noise(132, 12), 110, 165)),
    transcript: [
      `Q: Tell me about a time you had to handle a high-pressure patient situation.`,
      `A: During my clinical rotation at the Roosevelt student clinic, I was assisting with a patient who was showing signs of respiratory distress that the attending nurse had attributed to anxiety. I flagged my concern based on the patient's vitals trend I'd been monitoring, specifically an O2 sat drop from 97% to 91% over 15 minutes. I immediately notified the charge nurse, documented my observations in the EHR, and stayed with the patient to monitor until the attending reassessed. The patient was ultimately transferred to ED and treated for early pneumonia. The nurse manager later noted my observation in my rotation evaluation.`,
      `Q: How do you prioritize when multiple patients need your attention?`,
      `A: I use an ABC approach -- airway, breathing, circulation -- as the baseline triage framework, then layer in contextual urgency. In my last rotation, I had three post-op patients with competing needs: one needed a pain med reassessment, one was due for wound care, and one was flagging concern about a family member. I handled the pain reassessment first because undertreated pain can spiral into other complications, then wound care because it had a time sensitivity, then spent real time with the family concern because that's relationship trust and it affects patient outcomes too.`,
      `Q: What drew you to nursing specifically?`,
      `A: My grandmother had a 4-month hospital stay when I was 16. The nurses were the people she actually talked to every day -- they remembered what she was anxious about, explained things so she could understand, and made her feel like a person, not a case. I went in thinking I wanted to be a doctor, but watching that dynamic shifted me. The nursing relationship with the patient is genuinely different and I want to be in that role.`,
      `Q: Tell me about a time you made a mistake in a clinical setting.`,
      `A: During my first week on the med-surg floor, I administered medication at the wrong time window -- 45 minutes late -- because I had misread the schedule notation. I caught it myself during documentation review. I immediately disclosed to the supervising nurse, completed the incident report, and asked for a full review of the EHR workflow I'd been using. No patient harm resulted, but I implemented a personal double-check system for time-sensitive orders that I still use. The mistake stuck with me but I treated it as a protocol failure I could fix rather than something to hide.`,
      `Q: Where do you see yourself in five years?`,
      `A: ICU nursing, honestly. I want the technical depth and the high-stakes environment. I'm planning to pursue CCRN certification after I'm in practice for a year or two. Long term I'm interested in clinical education -- training new nurses -- but I want to build real floor expertise first so that credibility is earned, not just a credential.`,
    ].join("\n\n"),
    feedback: {
      score: round1(overallScore / 10),
      communication_score: dimScores.narrative_clarity.score,
      confidence_score: dimScores.presence_confidence.score,
      strengths: [
        "Strong patient-centered framing -- you anchor answers in observable outcomes, not just processes.",
        "Transparent mistake disclosure with a structural fix shows strong clinical accountability.",
        "STAR structure is natural and consistent across all five questions without sounding formulaic.",
      ],
      improvements: [
        "Add one quantified outcome per answer where possible -- patient satisfaction scores, recovery metrics, or supervisor ratings.",
        "The five-year answer is strong conceptually but slightly long. Practice a 60-second version.",
      ],
      coaching_summary: "This was a competitive mock interview performance for a nursing externship. Your clinical judgment story (the O2 sat observation) is your strongest answer -- it demonstrates both technical competence and professional courage. The mistake disclosure is also rare and impressive because most candidates deflect. Your biggest lever is quantification: even approximate numbers ('reduced documentation time by roughly 20%') make clinical stories more credible in a competitive candidate pool. You're at a strong developing level and a realistic candidate for the Rush final round.",
      readiness_level: readinessLevel,
      dimension_scores: {
        narrative_clarity:   { ...dimScores.narrative_clarity, isStrength: dimScores.narrative_clarity.score >= 7.5, isGap: dimScores.narrative_clarity.score < 5.5 },
        evidence_quality:    { ...dimScores.evidence_quality,  isStrength: dimScores.evidence_quality.score >= 7.5,  isGap: dimScores.evidence_quality.score < 5.5 },
        ownership_agency:    { ...dimScores.ownership_agency,  isStrength: dimScores.ownership_agency.score >= 7.5,  isGap: dimScores.ownership_agency.score < 5.5 },
        response_control:    { ...dimScores.response_control,  isStrength: dimScores.response_control.score >= 7.5,  isGap: dimScores.response_control.score < 5.5 },
        cognitive_depth:     { ...dimScores.cognitive_depth,   isStrength: dimScores.cognitive_depth.score >= 7.5,   isGap: dimScores.cognitive_depth.score < 5.5 },
        presence_confidence: { ...dimScores.presence_confidence, isStrength: dimScores.presence_confidence.score >= 7.5, isGap: dimScores.presence_confidence.score < 5.5 },
        vocal_engagement:    { ...dimScores.vocal_engagement,  isStrength: dimScores.vocal_engagement.score >= 7.5,  isGap: dimScores.vocal_engagement.score < 5.5 },
      },
      star: { situation: 8.2, task: 7.8, action: 8.5, result: 6.8 },
      question_breakdowns: [
        { question: "Tell me about a time you had to handle a high-pressure patient situation.", competency: "clinical_judgment", score: qScores[0], note: "Strong O2 sat observation story with documented outcome. EHR reference adds credibility.", wordCount: 168, starComplete: true,  confidenceSignal: 7.2, ownershipScore: 8.0, fillerEstimate: 3 },
        { question: "How do you prioritize when multiple patients need your attention?",         competency: "prioritization",    score: qScores[1], note: "ABC framework is exactly what hiring managers want to hear. Concrete example follows well.",    wordCount: 142, starComplete: true,  confidenceSignal: 7.8, ownershipScore: 7.5, fillerEstimate: 2 },
        { question: "What drew you to nursing specifically?",                                   competency: "motivation_fit",    score: qScores[2], note: "Personal and specific. The grandmother story is memorable. Watch that it doesn't run long.",     wordCount: 195, starComplete: false, confidenceSignal: 8.2, ownershipScore: 7.0, fillerEstimate: 4 },
        { question: "Tell me about a time you made a mistake in a clinical setting.",           competency: "accountability",    score: qScores[3], note: "Best answer of the session. Disclosure + systemic fix is rare. Will stand out in a panel.",    wordCount: 158, starComplete: true,  confidenceSignal: 7.5, ownershipScore: 9.0, fillerEstimate: 1 },
        { question: "Where do you see yourself in five years?",                                 competency: "growth_mindset",   score: qScores[4], note: "ICU goal is specific and credible. Mention CCRN certification target upfront.",                 wordCount: 112, starComplete: false, confidenceSignal: 7.0, ownershipScore: 7.8, fillerEstimate: 2 },
      ],
      interview_arc: {
        qualityArc:     [qScores[0], qScores[1], qScores[2], qScores[3], qScores[4]],
        confidenceArc:  [7.2, 7.8, 8.2, 7.5, 7.0],
        ownershipArc:   [8.0, 7.5, 7.0, 9.0, 7.8],
        wordCountArc:   [168, 142, 195, 158, 112],
        warmupEffect:   qScores[0] < (qScores.reduce((a, b) => a + b, 0) / qScores.length - 4),
        fatigueSigns:   false,
        consistencyScore: round1(100 - (Math.max(...qScores) - Math.min(...qScores)) * 1.5),
        pitchDrift: "stable" as const,
        openingNote: "Opened with a strong clinical observation story — concrete detail and good outcome framing from the start.",
        closingNote: "Closed with a forward-looking answer. Energy dipped slightly in the final response — adding a crisp one-sentence summary would strengthen the close.",
      },
      mock_interview: true,
      conversation_turns: 10,
    },
    deliveryMetrics: {
      fillersPer100: round2(random(1.2, 2.8)),
      face: {
        eyeContact: round3(clamp(noise(0.82, 0.06), 0.60, 0.95)),
        expressiveness: round3(clamp(noise(0.74, 0.05), 0.55, 0.90)),
        headStability: round3(clamp(noise(0.88, 0.04), 0.70, 0.97)),
        smileRate: round3(clamp(noise(0.38, 0.05), 0.10, 0.65)),
        blinkRate: Math.round(clamp(noise(18, 4), 10, 35)),
        browEngagement: round3(clamp(noise(0.62, 0.05), 0.35, 0.85)),
        lookAwayRate: round3(clamp(noise(0.14, 0.04), 0.02, 0.30)),
        framesAnalyzed: 1840,
      },
    },
    prosody: {
      monotoneScore: round1(clamp(noise(3.8, 0.6), 1.5, 6.5)),
      energyVariation: round1(clamp(noise(6.8, 0.8), 4.0, 9.2)),
      tempoDynamics: round1(clamp(noise(7.2, 0.7), 4.5, 9.5)),
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);
  const { prisma } = await import("../app/lib/prisma");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "roosevelt" } });
  if (!tenant) {
    console.error("Roosevelt tenant not found. Run setupRoosevelt.ts first.");
    process.exit(1);
  }
  await prisma.tenant.update({ where: { slug: "roosevelt" }, data: { plan: "university", themeKey: "roosevelt" } });
  const tenantId = tenant.id;

  const [marcus, aaliyah, diego, sophie, jordan] = await Promise.all([
    prisma.user.findUnique({ where: { email: "marcus@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "aaliyah@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "diego@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "sophie@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "jordan@roosevelt.edu" } }),
  ]);
  if (!marcus || !aaliyah || !diego || !sophie || !jordan) {
    console.error("One or more Roosevelt students not found. Run setupRoosevelt.ts first.");
    process.exit(1);
  }

  const TODAY = new Date();
  TODAY.setHours(12, 0, 0, 0);

  // ---------------------------------------------------------------------------
  // Update user profiles
  // ---------------------------------------------------------------------------
  await prisma.user.update({ where: { id: marcus.id },  data: { graduationYear: 2026, major: "Health Sciences", targetRole: "Registered Nurse", targetIndustry: "Healthcare", targetRoleKeys: ["registered_nurse"] } });
  await prisma.user.update({ where: { id: aaliyah.id }, data: { graduationYear: 2026, major: "Business Administration", targetRole: "Business Analyst", targetIndustry: "Professional Services", targetRoleKeys: ["financial_analyst", "mgmt_consultant"] } });
  await prisma.user.update({ where: { id: diego.id },   data: { graduationYear: 2027, major: "Computer Science", targetRole: "Software Engineer", targetIndustry: "Technology", targetRoleKeys: ["software_engineer"] } });
  await prisma.user.update({ where: { id: sophie.id },  data: { graduationYear: 2026, major: "Psychology", targetRole: "HR Coordinator", targetIndustry: "Hospitality", targetRoleKeys: ["hr_specialist"] } });
  await prisma.user.update({ where: { id: jordan.id },  data: { graduationYear: 2028, major: "Communications", targetRole: "Marketing Coordinator", targetIndustry: "Media & Entertainment", targetRoleKeys: ["marketing_manager", "copywriter"] } });
  console.log("User profiles updated.");

  // ==========================================================================
  // 1. MARCUS JOHNSON
  //    Junior, Health Sciences major. 38 sessions. Hedger -> Polished Performer.
  //    Targeting nursing clinical internship. Strong trajectory.
  //    Productivity: excellent - schedules ahead, no missed deadlines.
  // ==========================================================================
  console.log("\nSeeding Marcus Johnson...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: marcus.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: marcus.id, tenantId,
      primary: "S", secondary: "I",
      scores: {
        riasecProfile: "SIC",
        riasecScores: { R: 32, I: 62, A: 28, S: 82, E: 45, C: 50 },
        workValues: { achievement: 2, independence: 1, recognition: 1, relationships: 3, support: 3, conditions: 2 },
        entrepreneurProfile: { riskTolerance: 40, autonomyDrive: 50, executionBias: 65, sideIncomeInterest: 35, overall: 45 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: marcus.id, tenantId } });
  const marcusTotal = 38;
  for (let i = 0; i < marcusTotal; i++) {
    const daysBack = Math.round(lerp(185, 3, i / Math.max(1, marcusTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(MARCUS, i, marcusTotal, daysAgo(TODAY, daysBack), marcus.id, tenantId) });
  }
  // Mock interview for Marcus - Rush University prep session, 5 days ago
  await prisma.attempt.create({ data: buildMockInterview(marcus.id, tenantId, "Registered Nurse", 5, 74, "developing") as any });
  console.log(`  ${marcusTotal} attempts + 1 mock interview seeded.`);

  await prisma.careerCheckIn.deleteMany({ where: { userId: marcus.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: marcus.id, tenantId,
      employmentStatus: "student",
      industry: "Healthcare",
      satisfactionScore: 4,
      graduationYear: 2026,
      monthsSinceGrad: null,
    },
  });

  // Checklist - Marcus is during_college, most items done
  await prisma.checklistProgress.deleteMany({ where: { userId: marcus.id } });
  const marcusChecklistItems = [
    { itemId: "resume",            completedDaysAgo: 100, scheduledDaysAgo: 108, dueDaysAgo: 94 },
    { itemId: "linkedin",          completedDaysAgo: 95,  scheduledDaysAgo: 103, dueDaysAgo: 89 },
    { itemId: "internship_apps",   completedDaysAgo: 60,  scheduledDaysAgo: 68,  dueDaysAgo: 55 },
    { itemId: "taxes_filed",       completedDaysAgo: 45,  scheduledDaysAgo: 52,  dueDaysAgo: 40 },
    { itemId: "fafsa_renewed",     completedDaysAgo: 38,  scheduledDaysAgo: 46,  dueDaysAgo: 32 },
    { itemId: "advisor_semester",  completedDaysAgo: 28,  scheduledDaysAgo: 35,  dueDaysAgo: 22 },
    { itemId: "career_fair",       completedDaysAgo: 18,  scheduledDaysAgo: 26,  dueDaysAgo: 12 },
    { itemId: "rec_letter",        completedDaysAgo: 10,  scheduledDaysAgo: 18,  dueDaysAgo: 5  },
  ];
  for (const item of marcusChecklistItems) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: marcus.id, stage: "during_college", itemId: item.itemId } },
      update: { done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
      create: { userId: marcus.id, tenantId, stage: "during_college", itemId: item.itemId, done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: marcus.id } });
  for (const [skill, category] of [
    ["Patient Communication", "interpersonal"], ["Clinical Assessment", "domain"], ["Medical Terminology", "domain"],
    ["Vital Signs Monitoring", "technical"], ["Electronic Health Records", "technical"], ["Empathy & Active Listening", "interpersonal"],
    ["Care Planning", "analytical"], ["Leadership", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: marcus.id, tenantId, skill, category, confidence: round2(random(0.74, 0.96)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: marcus.id } });
  await prisma.interviewActivity.createMany({
    data: [
      { userId: marcus.id, tenantId, company: "Northwestern Medicine", role: "Nursing Clinical Intern", industry: "Healthcare", appliedDate: daysAgo(TODAY, 90), interviewDate: daysAgo(TODAY, 72), stage: "phone_screen", outcome: "rejected", notes: "Rejected after phone screen - feedback cited need for more clinical shadowing hours." },
      { userId: marcus.id, tenantId, company: "Rush University Medical Center", role: "Nursing Extern - Med/Surg", industry: "Healthcare", appliedDate: daysAgo(TODAY, 65), interviewDate: daysAgo(TODAY, 48), stage: "final_round", outcome: "pending", notes: "Final round panel interview next week. Two behavioral rounds with nurse managers." },
      { userId: marcus.id, tenantId, company: "Advocate Health", role: "Patient Care Technician Intern", industry: "Healthcare", appliedDate: daysAgo(TODAY, 45), stage: "applied", outcome: "pending", notes: "Applied through Roosevelt nursing program partnership. Follow-up sent to recruiter." },
    ],
  });

  // Tasks - Marcus is organized and proactive.
  await prisma.task.deleteMany({ where: { userId: marcus.id } });
  await prisma.task.createMany({ data: [
    { userId: marcus.id, tenantId, title: "Prep Rush panel interview - behavioral + clinical scenarios", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 3), dueDate: daysFromNow(TODAY, 2), completedAt: null, createdAt: daysAgo(TODAY, 5) },
    { userId: marcus.id, tenantId, title: "Send thank-you note to Rush first-round nurse manager", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 2), dueDate: daysFromNow(TODAY, 1), completedAt: null, createdAt: daysAgo(TODAY, 4) },
    { userId: marcus.id, tenantId, title: "Log 8 hours clinical shadowing at Roosevelt student clinic", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 4), dueDate: daysFromNow(TODAY, 3), completedAt: null, createdAt: daysAgo(TODAY, 6) },
    { userId: marcus.id, tenantId, title: "Complete Pathophysiology midterm study guide", priority: "high", category: "Academic", scheduledAt: daysAgo(TODAY, 14), dueDate: daysAgo(TODAY, 3), completedAt: daysAgo(TODAY, 4), createdAt: daysAgo(TODAY, 16) },
    { userId: marcus.id, tenantId, title: "Update LinkedIn with clinical rotation experience", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 20), dueDate: daysAgo(TODAY, 10), completedAt: daysAgo(TODAY, 11), createdAt: daysAgo(TODAY, 22) },
    { userId: marcus.id, tenantId, title: "Connect with Roosevelt nursing alumni at Northwestern Medicine", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 26), dueDate: daysAgo(TODAY, 14), completedAt: daysAgo(TODAY, 14), createdAt: daysAgo(TODAY, 28) },
    { userId: marcus.id, tenantId, title: "File FAFSA for next academic year", priority: "high", category: "Finance", scheduledAt: daysAgo(TODAY, 32), dueDate: daysAgo(TODAY, 20), completedAt: daysAgo(TODAY, 21), createdAt: daysAgo(TODAY, 35) },
    { userId: marcus.id, tenantId, title: "Register for Advanced Clinical Skills lab - Spring semester", priority: "medium", category: "Academic", scheduledAt: daysAgo(TODAY, 10), dueDate: daysAgo(TODAY, 2), completedAt: daysAgo(TODAY, 2), createdAt: daysAgo(TODAY, 12) },
  ]});
  console.log("  Tasks, checklist, career check-in, skills, interview activity seeded.");

  // ==========================================================================
  // 2. AALIYAH WASHINGTON
  //    High performer. 26 sessions. Overloader -> Polished Performer.
  //    Targeting Deloitte + PwC final rounds.
  //    Productivity: very good - efficient and on time.
  // ==========================================================================
  console.log("\nSeeding Aaliyah Washington...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: aaliyah.id, tenantId,
      primary: "E", secondary: "S",
      scores: {
        riasecProfile: "ESA",
        riasecScores: { R: 12, I: 44, A: 62, S: 74, E: 88, C: 42 },
        workValues: { achievement: 3, independence: 2, recognition: 3, relationships: 2, support: 1, conditions: 1 },
        entrepreneurProfile: { riskTolerance: 78, autonomyDrive: 72, executionBias: 80, sideIncomeInterest: 65, overall: 74 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: aaliyah.id, tenantId } });
  const aaliyahTotal = 26;
  for (let i = 0; i < aaliyahTotal; i++) {
    const daysBack = Math.round(lerp(130, 4, i / Math.max(1, aaliyahTotal - 1))) + Math.floor(random(0, 3));
    await prisma.attempt.create({ data: buildAttempt(AALIYAH, i, aaliyahTotal, daysAgo(TODAY, daysBack), aaliyah.id, tenantId) });
  }
  console.log(`  ${aaliyahTotal} attempts seeded.`);

  await prisma.careerCheckIn.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: aaliyah.id, tenantId,
      employmentStatus: "student",
      industry: "Professional Services",
      satisfactionScore: 4,
      graduationYear: 2026,
      monthsSinceGrad: null,
    },
  });

  await prisma.checklistProgress.deleteMany({ where: { userId: aaliyah.id } });
  const aaliyahChecklistItems = [
    { itemId: "resume",           completedDaysAgo: 90, scheduledDaysAgo: 96, dueDaysAgo: 84 },
    { itemId: "linkedin",         completedDaysAgo: 85, scheduledDaysAgo: 92, dueDaysAgo: 80 },
    { itemId: "internship_apps",  completedDaysAgo: 70, scheduledDaysAgo: 78, dueDaysAgo: 65 },
    { itemId: "taxes_filed",      completedDaysAgo: 50, scheduledDaysAgo: 58, dueDaysAgo: 46 },
    { itemId: "fafsa_renewed",    completedDaysAgo: 40, scheduledDaysAgo: 48, dueDaysAgo: 35 },
    { itemId: "advisor_semester", completedDaysAgo: 30, scheduledDaysAgo: 36, dueDaysAgo: 26 },
    { itemId: "career_fair",      completedDaysAgo: 20, scheduledDaysAgo: 28, dueDaysAgo: 16 },
    { itemId: "rec_letter",       completedDaysAgo: 14, scheduledDaysAgo: 22, dueDaysAgo: 10 },
    { itemId: "gpa_check",        completedDaysAgo: 8,  scheduledDaysAgo: 14, dueDaysAgo: 4 },
  ];
  for (const item of aaliyahChecklistItems) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: aaliyah.id, stage: "during_college", itemId: item.itemId } },
      update: { done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
      create: { userId: aaliyah.id, tenantId, stage: "during_college", itemId: item.itemId, done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: aaliyah.id } });
  for (const [skill, category] of [
    ["Strategic Consulting", "domain"], ["Slide Decks & Storytelling", "communication"], ["Excel & Modeling", "technical"],
    ["Project Management", "leadership"], ["Research & Synthesis", "analytical"], ["Client Communication", "communication"],
    ["Python (basic)", "technical"], ["Change Management", "domain"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: aaliyah.id, tenantId, skill, category, confidence: round2(random(0.80, 0.97)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.interviewActivity.createMany({
    data: [
      { userId: aaliyah.id, tenantId, company: "PwC", role: "Advisory Associate", industry: "Professional Services", appliedDate: daysAgo(TODAY, 95), interviewDate: daysAgo(TODAY, 78), stage: "offer", outcome: "pending", notes: "Offer pending decision. Great cultural fit, case round went very well." },
      { userId: aaliyah.id, tenantId, company: "Deloitte", role: "Business Analyst", industry: "Professional Services", appliedDate: daysAgo(TODAY, 80), interviewDate: daysAgo(TODAY, 58), stage: "final_round", outcome: "pending", notes: "Final round scheduled next week. Strong first-round case performance." },
      { userId: aaliyah.id, tenantId, company: "Accenture", role: "Technology Analyst", industry: "Professional Services", appliedDate: daysAgo(TODAY, 65), stage: "applied", outcome: "pending", notes: "Applied to Chicago office. Network connection made at Roosevelt career fair." },
    ],
  });

  await prisma.task.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.task.createMany({ data: [
    { userId: aaliyah.id, tenantId, title: "Prep Deloitte final round case framework", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 3), dueDate: daysFromNow(TODAY, 2), completedAt: null, createdAt: daysAgo(TODAY, 5) },
    { userId: aaliyah.id, tenantId, title: "Write thank-you note to PwC interviewer", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 2), dueDate: daysFromNow(TODAY, 1), completedAt: null, createdAt: daysAgo(TODAY, 4) },
    { userId: aaliyah.id, tenantId, title: "Research Deloitte Chicago - industry clients", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 4), dueDate: daysFromNow(TODAY, 3), completedAt: null, createdAt: daysAgo(TODAY, 6) },
    { userId: aaliyah.id, tenantId, title: "Complete senior capstone presentation draft", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 15), dueDate: daysAgo(TODAY, 4), completedAt: daysAgo(TODAY, 5), createdAt: daysAgo(TODAY, 18) },
    { userId: aaliyah.id, tenantId, title: "Submit internship experience to LinkedIn", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 22), dueDate: daysAgo(TODAY, 12), completedAt: daysAgo(TODAY, 13), createdAt: daysAgo(TODAY, 25) },
    { userId: aaliyah.id, tenantId, title: "Request rec letter from Professor Adams", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 28), dueDate: daysAgo(TODAY, 18), completedAt: daysAgo(TODAY, 18), createdAt: daysAgo(TODAY, 30) },
  ]});
  console.log("  Tasks, checklist, career check-in, skills, interview activity seeded.");

  // ==========================================================================
  // 3. DIEGO REYES
  //    CS junior, ESL mode on. 20 sessions. Monotone Expert -> Quiet Achiever.
  //    Some missed deadlines - got rejected from Motorola, planning gaps visible.
  //    Productivity: decent but 2 missed deadlines.
  // ==========================================================================
  console.log("\nSeeding Diego Reyes...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: diego.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: diego.id, tenantId,
      primary: "I", secondary: "R",
      scores: {
        riasecProfile: "IRC",
        riasecScores: { R: 70, I: 85, A: 28, S: 35, E: 42, C: 60 },
        workValues: { achievement: 2, independence: 3, recognition: 1, relationships: 0, support: 1, conditions: 2 },
        entrepreneurProfile: { riskTolerance: 58, autonomyDrive: 80, executionBias: 74, sideIncomeInterest: 70, overall: 70 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: diego.id, tenantId } });
  const diegoTotal = 20;
  for (let i = 0; i < diegoTotal; i++) {
    const daysBack = Math.round(lerp(100, 2, i / Math.max(1, diegoTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(DIEGO, i, diegoTotal, daysAgo(TODAY, daysBack), diego.id, tenantId) });
  }
  console.log(`  ${diegoTotal} attempts seeded.`);

  await prisma.careerCheckIn.deleteMany({ where: { userId: diego.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: diego.id, tenantId,
      employmentStatus: "student",
      industry: "Technology",
      satisfactionScore: 3,
      graduationYear: 2027,
      monthsSinceGrad: null,
    },
  });

  await prisma.checklistProgress.deleteMany({ where: { userId: diego.id } });
  const diegoChecklistItems = [
    { itemId: "resume",          completedDaysAgo: 75, scheduledDaysAgo: 78, dueDaysAgo: 70, late: false },
    { itemId: "linkedin",        completedDaysAgo: 68, scheduledDaysAgo: 72, dueDaysAgo: 64, late: false },
    { itemId: "internship_apps", completedDaysAgo: 52, scheduledDaysAgo: 56, dueDaysAgo: 45, late: true },  // completed 7 days after due - missed
    { itemId: "advisor_semester",completedDaysAgo: 35, scheduledDaysAgo: 38, dueDaysAgo: 28, late: false },
    { itemId: "gpa_check",       completedDaysAgo: 18, scheduledDaysAgo: 20, dueDaysAgo: 10, late: true },  // completed 8 days after due - missed
  ];
  for (const item of diegoChecklistItems) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: diego.id, stage: "during_college", itemId: item.itemId } },
      update: { done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
      create: { userId: diego.id, tenantId, stage: "during_college", itemId: item.itemId, done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: diego.id } });
  for (const [skill, category] of [
    ["Python", "technical"], ["Java", "technical"], ["React", "technical"],
    ["SQL", "technical"], ["System Design", "domain"], ["Data Structures & Algorithms", "domain"],
    ["Git", "technical"], ["Agile/Scrum", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: diego.id, tenantId, skill, category, confidence: round2(random(0.72, 0.94)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: diego.id } });
  await prisma.interviewActivity.createMany({
    data: [
      { userId: diego.id, tenantId, company: "Motorola Solutions", role: "Software Engineer Intern", industry: "Technology", appliedDate: daysAgo(TODAY, 72), interviewDate: daysAgo(TODAY, 55), stage: "phone_screen", outcome: "rejected", notes: "Good technical screen, rejected on behavioral round - communication cited as feedback area." },
      { userId: diego.id, tenantId, company: "Outcome Health", role: "Junior Software Engineer", industry: "Health Tech", appliedDate: daysAgo(TODAY, 45), interviewDate: daysAgo(TODAY, 28), stage: "final_round", outcome: "pending", notes: "Final round scheduled. Noticeably more confident in mock sessions leading up." },
      { userId: diego.id, tenantId, company: "Relativity", role: "Software Engineer Intern", industry: "Technology", appliedDate: daysAgo(TODAY, 20), stage: "applied", outcome: "pending", notes: "Chicago-based legaltech - strong cultural mission fit." },
    ],
  });

  await prisma.task.deleteMany({ where: { userId: diego.id } });
  await prisma.task.createMany({ data: [
    { userId: diego.id, tenantId, title: "LeetCode medium: binary trees (3 problems)", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 1), dueDate: daysFromNow(TODAY, 1), completedAt: null, createdAt: daysAgo(TODAY, 3) },
    { userId: diego.id, tenantId, title: "Prep behavioral stories for Outcome Health final round", priority: "high", category: "Career", dueDate: daysFromNow(TODAY, 1), completedAt: null, createdAt: daysAgo(TODAY, 3) }, // not scheduled - planning gap
    { userId: diego.id, tenantId, title: "Polish GitHub - pin 3 best projects with READMEs", priority: "medium", category: "Career", dueDate: daysFromNow(TODAY, 3), completedAt: null, createdAt: daysAgo(TODAY, 4) }, // not scheduled
    { userId: diego.id, tenantId, title: "Apply to 2 more Chicago tech internships", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 2), dueDate: daysFromNow(TODAY, 5), completedAt: null, createdAt: daysAgo(TODAY, 4) },
    { userId: diego.id, tenantId, title: "Complete Signal mock interview session", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 4), dueDate: daysAgo(TODAY, 1), completedAt: daysAgo(TODAY, 1), createdAt: daysAgo(TODAY, 5) },
    { userId: diego.id, tenantId, title: "Submit FAFSA renewal", priority: "high", category: "Finance", scheduledAt: daysAgo(TODAY, 12), dueDate: daysAgo(TODAY, 6), completedAt: daysAgo(TODAY, 6), createdAt: daysAgo(TODAY, 14) },
    { userId: diego.id, tenantId, title: "Ask Professor Kim for recommendation letter", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 10), dueDate: daysAgo(TODAY, 4), completedAt: daysAgo(TODAY, 4), createdAt: daysAgo(TODAY, 12) },
    // Missed deadline: prep for Motorola - submitted late
    { userId: diego.id, tenantId, title: "Research Motorola Solutions product lines for interview", priority: "high", category: "Career", scheduledAt: daysAgo(TODAY, 60), dueDate: daysAgo(TODAY, 56), completedAt: daysAgo(TODAY, 52), createdAt: daysAgo(TODAY, 64) },
  ]});
  console.log("  Tasks, checklist, career check-in, skills, interview activity seeded.");

  // ==========================================================================
  // 4. SOPHIE PARK
  //    Plateau case. 18 sessions. Hedger throughout - coaching intervention needed.
  //    Productivity: poor - has time but not following through. Multiple missed deadlines.
  // ==========================================================================
  console.log("\nSeeding Sophie Park...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: sophie.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: sophie.id, tenantId,
      primary: "S", secondary: "A",
      scores: {
        riasecProfile: "SAE",
        riasecScores: { R: 15, I: 38, A: 62, S: 78, E: 55, C: 35 },
        workValues: { achievement: 1, independence: 1, recognition: 1, relationships: 3, support: 2, conditions: 1 },
        entrepreneurProfile: { riskTolerance: 38, autonomyDrive: 42, executionBias: 50, sideIncomeInterest: 28, overall: 39 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: sophie.id, tenantId } });
  const sophieTotal = 18;
  for (let i = 0; i < sophieTotal; i++) {
    const daysBack = Math.round(lerp(90, 5, i / Math.max(1, sophieTotal - 1))) + Math.floor(random(0, 3));
    await prisma.attempt.create({ data: buildAttempt(SOPHIE, i, sophieTotal, daysAgo(TODAY, daysBack), sophie.id, tenantId) });
  }
  console.log(`  ${sophieTotal} attempts seeded.`);

  await prisma.careerCheckIn.deleteMany({ where: { userId: sophie.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: sophie.id, tenantId,
      employmentStatus: "student",
      industry: "Hospitality",
      satisfactionScore: 2,
      graduationYear: 2026,
      monthsSinceGrad: null,
    },
  });

  await prisma.checklistProgress.deleteMany({ where: { userId: sophie.id } });
  // Sophie - scheduled late, some missed, completedAt is after due
  const sophieChecklistItems = [
    { itemId: "resume",          completedDaysAgo: 65, scheduledDaysAgo: 68, dueDaysAgo: 70, late: false }, // on time
    { itemId: "linkedin",        completedDaysAgo: 55, scheduledDaysAgo: 58, dueDaysAgo: 60, late: false }, // on time
    { itemId: "internship_apps", completedDaysAgo: 30, scheduledDaysAgo: 35, dueDaysAgo: 45, late: true },  // late - 15 days after due
    { itemId: "advisor_semester",completedDaysAgo: 18, scheduledDaysAgo: 20, dueDaysAgo: 25, late: false }, // on time
    { itemId: "career_fair",     completedDaysAgo: 8,  scheduledDaysAgo: 10, dueDaysAgo: 14, late: false }, // on time
    // rec_letter and gpa_check: not done yet - these are the missing items
  ];
  for (const item of sophieChecklistItems) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: sophie.id, stage: "during_college", itemId: item.itemId } },
      update: { done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
      create: { userId: sophie.id, tenantId, stage: "during_college", itemId: item.itemId, done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: daysAgo(TODAY, item.scheduledDaysAgo), dueDate: daysAgo(TODAY, item.dueDaysAgo) },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: sophie.id } });
  for (const [skill, category] of [
    ["Conflict Resolution", "leadership"], ["Active Listening", "communication"], ["HRIS Systems", "technical"],
    ["Recruiting", "domain"], ["Employee Relations", "domain"], ["Microsoft Office", "technical"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: sophie.id, tenantId, skill, category, confidence: round2(random(0.65, 0.88)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: sophie.id } });
  await prisma.interviewActivity.createMany({
    data: [
      { userId: sophie.id, tenantId, company: "Hyatt Hotels", role: "HR Coordinator", industry: "Hospitality", appliedDate: daysAgo(TODAY, 60), interviewDate: daysAgo(TODAY, 45), stage: "phone_screen", outcome: "rejected", notes: "Passed recruiter screen, rejected after hiring manager call. Needs stronger behavioral stories with clear personal ownership." },
      { userId: sophie.id, tenantId, company: "United Airlines", role: "People & Culture Associate", industry: "Aviation", appliedDate: daysAgo(TODAY, 30), stage: "applied", outcome: "pending", notes: "Strong mission alignment. Following up next week." },
    ],
  });

  // Sophie tasks - creates tasks but doesn't schedule them, misses deadlines
  await prisma.task.deleteMany({ where: { userId: sophie.id } });
  await prisma.task.createMany({ data: [
    { userId: sophie.id, tenantId, title: "Prep 3 behavioral stories with STAR structure", priority: "high", category: "Career", dueDate: daysAgo(TODAY, 5), completedAt: null, createdAt: daysAgo(TODAY, 14) }, // MISSED - past due, not done
    { userId: sophie.id, tenantId, title: "Follow up with United Airlines recruiter", priority: "high", category: "Career", dueDate: daysAgo(TODAY, 2), completedAt: null, createdAt: daysAgo(TODAY, 8) }, // MISSED - past due, not done
    { userId: sophie.id, tenantId, title: "Request rec letter from Professor Chen", priority: "medium", category: "Career", dueDate: daysFromNow(TODAY, 5), completedAt: null, createdAt: daysAgo(TODAY, 6) }, // coming up, not scheduled
    { userId: sophie.id, tenantId, title: "Practice salary negotiation response", priority: "medium", category: "Career", dueDate: daysFromNow(TODAY, 10), completedAt: null, createdAt: daysAgo(TODAY, 3) }, // not scheduled
    { userId: sophie.id, tenantId, title: "Submit FAFSA renewal", priority: "high", category: "Finance", scheduledAt: daysAgo(TODAY, 32), dueDate: daysAgo(TODAY, 28), completedAt: daysAgo(TODAY, 22), createdAt: daysAgo(TODAY, 35) }, // completed 6 days LATE
    { userId: sophie.id, tenantId, title: "Meet with career advisor", priority: "medium", category: "Career", scheduledAt: daysAgo(TODAY, 20), dueDate: daysAgo(TODAY, 15), completedAt: daysAgo(TODAY, 15), createdAt: daysAgo(TODAY, 22) }, // on time
  ]});
  console.log("  Tasks, checklist, career check-in, skills, interview activity seeded.");

  // ==========================================================================
  // 5. JORDAN TAYLOR
  //    First-gen sophomore, early stage. 12 sessions. Scattered Thinker -> Vague Narrator.
  //    Productivity: minimal scheduling, just starting to use the system.
  // ==========================================================================
  console.log("\nSeeding Jordan Taylor...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: jordan.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: jordan.id, tenantId,
      primary: "A", secondary: "S",
      scores: {
        riasecProfile: "ASE",
        riasecScores: { R: 22, I: 35, A: 75, S: 68, E: 48, C: 25 },
        workValues: { achievement: 1, independence: 2, recognition: 2, relationships: 3, support: 2, conditions: 0 },
        entrepreneurProfile: { riskTolerance: 45, autonomyDrive: 55, executionBias: 38, sideIncomeInterest: 60, overall: 49 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: jordan.id, tenantId } });
  const jordanTotal = 12;
  for (let i = 0; i < jordanTotal; i++) {
    const daysBack = Math.round(lerp(55, 3, i / Math.max(1, jordanTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(JORDAN, i, jordanTotal, daysAgo(TODAY, daysBack), jordan.id, tenantId) });
  }
  console.log(`  ${jordanTotal} attempts seeded.`);

  // Jordan - partial checklist, minimal scheduling, just starting out
  await prisma.checklistProgress.deleteMany({ where: { userId: jordan.id } });
  const jordanChecklistItems = [
    { itemId: "fafsa_done",    completedDaysAgo: 20, scheduledDaysAgo: null as null, dueDaysAgo: null as null }, // completed but no planning
    { itemId: "email_setup",   completedDaysAgo: 14, scheduledDaysAgo: null,         dueDaysAgo: null },
    { itemId: "linkedin_setup",completedDaysAgo: 8,  scheduledDaysAgo: 10,           dueDaysAgo: 5 },  // completed 3 days after due
  ];
  for (const item of jordanChecklistItems) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: jordan.id, stage: "pre_college", itemId: item.itemId } },
      update: { done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: item.scheduledDaysAgo ? daysAgo(TODAY, item.scheduledDaysAgo) : null, dueDate: item.dueDaysAgo ? daysAgo(TODAY, item.dueDaysAgo) : null },
      create: { userId: jordan.id, tenantId, stage: "pre_college", itemId: item.itemId, done: true, completedAt: daysAgo(TODAY, item.completedDaysAgo), scheduledDate: item.scheduledDaysAgo ? daysAgo(TODAY, item.scheduledDaysAgo) : null, dueDate: item.dueDaysAgo ? daysAgo(TODAY, item.dueDaysAgo) : null },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: jordan.id } });
  for (const [skill, category] of [
    ["Social Media Content", "communication"], ["Copywriting", "communication"],
    ["Canva", "technical"], ["Event Planning", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: jordan.id, tenantId, skill, category, confidence: round2(random(0.55, 0.78)), source: "ai_extracted" } });
  }

  // Jordan tasks - mostly not scheduled, one missed deadline
  await prisma.task.deleteMany({ where: { userId: jordan.id } });
  await prisma.task.createMany({ data: [
    { userId: jordan.id, tenantId, title: "Submit housing application by deadline", priority: "high", category: "Personal", scheduledAt: daysAgo(TODAY, 1), dueDate: daysFromNow(TODAY, 4), completedAt: null, createdAt: daysAgo(TODAY, 3) },
    { userId: jordan.id, tenantId, title: "Register for orientation", priority: "high", category: "Personal", dueDate: daysFromNow(TODAY, 7), completedAt: null, createdAt: daysAgo(TODAY, 2) }, // not scheduled
    { userId: jordan.id, tenantId, title: "Build first college budget", priority: "medium", category: "Finance", dueDate: daysFromNow(TODAY, 6), completedAt: null, createdAt: daysAgo(TODAY, 2) }, // not scheduled
    { userId: jordan.id, tenantId, title: "Schedule meeting with academic advisor", priority: "medium", category: "Career", dueDate: daysFromNow(TODAY, 10), completedAt: null, createdAt: daysAgo(TODAY, 1) }, // not scheduled
    { userId: jordan.id, tenantId, title: "Complete Signal career assessment", priority: "high", category: "Career", dueDate: daysAgo(TODAY, 3), completedAt: null, createdAt: daysAgo(TODAY, 8) }, // MISSED - past due, not done
    { userId: jordan.id, tenantId, title: "Complete FAFSA application", priority: "high", category: "Finance", dueDate: daysAgo(TODAY, 20), completedAt: daysAgo(TODAY, 20), createdAt: daysAgo(TODAY, 25) }, // done, no scheduling
    { userId: jordan.id, tenantId, title: "Set up student email", priority: "high", category: "Personal", dueDate: daysAgo(TODAY, 14), completedAt: daysAgo(TODAY, 14), createdAt: daysAgo(TODAY, 18) }, // done
  ]});
  console.log("  Tasks, checklist, skills seeded. No interview activity yet (sophomore).");

  const totalAttempts = marcusTotal + aaliyahTotal + diegoTotal + sophieTotal + jordanTotal;
  console.log(`\nRoosevelt University reseed complete.`);
  console.log(`  ${totalAttempts} total attempts across 5 students.`);
  console.log(`  All attempts include: face metrics, delivery archetypes, strengths/improvements.`);
  console.log(`  Diego: ESL mode active throughout.`);
  console.log(`  Sophie: Hedger archetype throughout - coaching intervention data visible.`);
  console.log(`\nAdmin login: careers@roosevelt.edu / RooseveltAdmin2026!`);

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
