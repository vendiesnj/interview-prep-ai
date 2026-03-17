export type DeliveryDiagnosisKey =
  | "fast_pressured"
  | "fast_polished"
  | "hesitant_overdeliberate"
  | "careful_low_energy"
  | "clear_but_monotone"
  | "low_impact_presence"
  | "filler_heavy"
  | "unsettled_delivery"
  | "stop_start_rhythm"
  | "measured_understated"
  | "balanced_delivery"
  | "strong_finish"
  | "soft_finish"
  | "energy_fades"
  | "energy_builds";

export type DeliverySeverity = "mild" | "moderate" | "high";

type DeliveryDiagnosisLibrary = Record<
  DeliveryDiagnosisKey,
  {
    title: string[];
    mild: string[];
    moderate: string[];
    high: string[];
  }
>;

type DeliveryDiagnosisEntry = {
  title: string[];
  mild: string[];
  moderate: string[];
  high: string[];
};

export const DELIVERY_DIAGNOSIS_LIBRARY: Record<
  DeliveryDiagnosisKey,
  DeliveryDiagnosisEntry
> = {
  fast_pressured: {
    title: [
      "Fast, pressured delivery",
      "Rushed delivery pattern",
      "Speed is reducing control",
    ],
    mild: [
      "Your pace is only a little too quick, but it is starting to reduce emphasis on key points.",
      "You sound energetic, though slightly more speed-controlled delivery would make the answer land better.",
      "The answer is moving quickly enough that some important lines do not get full emphasis.",
    ],
    moderate: [
      "You likely sound more rushed than intentional in parts of the answer, especially when moving between ideas.",
      "The combination of speed and forward pressure is making strong content feel less settled than it should.",
      "Your delivery likely has energy, but the pace is beginning to work against clarity and control.",
    ],
    high: [
      "The answer likely sounds rushed enough that clarity, polish, and confidence all take a hit.",
      "Speed is becoming a central delivery problem here because your best points are not getting enough time to land.",
      "Right now the pace is pushing the answer forward before the strongest ideas can register clearly.",
    ],
  },

  fast_polished: {
    title: [
      "Fast but polished speaker",
      "Energetic, mostly clean delivery",
      "Quick but controlled style",
    ],
    mild: [
      "You likely sound energetic and fairly clean, with only a small need for more pause on key moments.",
      "Your pace is quick, but not in a way that strongly hurts polish right now.",
      "You likely come across with energy and decent verbal control, though the answer could breathe a little more.",
    ],
    moderate: [
      "You likely sound sharp and energetic, but the answer would land better if strong points had more space around them.",
      "Your delivery is relatively clean for the pace, though slowing slightly on outcomes would improve impact.",
      "The style likely works reasonably well overall, but the speed still trims emphasis on the most important lines.",
    ],
    high: [
      "You likely sound impressive at first because of energy and fluency, but the pace is still too fast to fully maximize impact.",
      "Even though the delivery is cleaner than a rushed pattern, you are still moving fast enough to weaken some key takeaways.",
      "This is a strong baseline style, but the speed is high enough that it still costs you some authority and landing power.",
    ],
  },

  hesitant_overdeliberate: {
    title: [
      "Hesitant, over-deliberate delivery",
      "Thoughtful but too pause-heavy",
      "Careful delivery with too much hesitation",
    ],
    mild: [
      "You likely sound thoughtful, but slightly more direct momentum would help the answer feel stronger.",
      "The delivery may be a little too careful, which softens confidence without fully hurting clarity.",
      "You likely have enough control, though the answer could get to the point faster and with less hesitation.",
    ],
    moderate: [
      "You likely sound more hesitant than you intend because pauses and slower tempo are reducing decisiveness.",
      "The delivery probably feels thoughtful but not fully settled, especially early in the answer.",
      "The answer would likely sound stronger with less deliberation and a more committed opening pace.",
    ],
    high: [
      "The answer likely feels over-deliberate enough that confidence and momentum both suffer.",
      "Too much hesitation is making the response sound less decisive than the content deserves.",
      "Right now the delivery likely feels cautious in a way that weakens authority and interview presence.",
    ],
  },

  careful_low_energy: {
    title: [
      "Careful but slightly low-energy speaker",
      "Clean delivery, limited momentum",
      "Underpowered speaking style",
    ],
    mild: [
      "You likely sound clear and composed, though the pace may be a little too calm to feel fully dynamic.",
      "Your delivery probably stays understandable, but could use a little more forward energy.",
      "The baseline is stable, though slightly more momentum would make the answer feel stronger.",
    ],
    moderate: [
      "You likely sound clean but somewhat underpowered, especially if the answer takes too long to build momentum.",
      "The delivery probably avoids chaos, but it may also be leaving some energy and conviction on the table.",
      "You likely sound understandable, though not quite animated enough for the strongest interview impact.",
    ],
    high: [
      "The answer likely sounds too low-energy overall, even if clarity is decent.",
      "You may be sounding more muted than composed, which weakens engagement and urgency.",
      "Right now the delivery is probably too restrained to feel fully interview-ready.",
    ],
  },

  clear_but_monotone: {
    title: [
      "Clear but monotone delivery",
      "Polished words, flat tone",
      "Clean delivery with limited variation",
    ],
    mild: [
      "Your words likely come through clearly, but slightly more vocal lift would improve memorability.",
      "The delivery probably sounds composed, though a little flat on the moments that should stand out most.",
      "You likely have enough clarity, but not quite enough tonal variation yet.",
    ],
    moderate: [
      "Your language likely sounds fairly clean, but vocal variation is limited enough that strong content may feel flatter than it should.",
      "The answer probably stays understandable, though the tone does not create enough contrast between setup and payoff.",
      "You likely sound controlled, but too even across the moments that should carry the most weight.",
    ],
    high: [
      "Flat delivery is likely making the answer much less engaging than the content deserves.",
      "The main issue here is not your words alone, but that the tone is treating all parts of the answer too similarly.",
      "Right now the answer likely sounds too monotone to make outcomes, decisions, and takeaways land strongly.",
    ],
  },

  low_impact_presence: {
    title: [
      "Low-impact vocal presence",
      "Delivery is not landing strongly enough",
      "Under-emphasized speaking style",
    ],
    mild: [
      "You likely sound steady, but slightly more emphasis would help important lines stand out.",
      "The delivery seems workable, though it is not yet creating enough contrast around your strongest points.",
      "You likely have enough control, but not quite enough vocal presence yet.",
    ],
    moderate: [
      "Your delivery likely stays too even when the answer needs more emphasis, which softens impact.",
      "The answer probably contains useful content, but the vocal presence is not helping it land strongly enough.",
      "You likely sound controlled, though not especially persuasive when you reach the payoff.",
    ],
    high: [
      "A major issue is that the answer likely does not sound impactful enough when it matters most.",
      "The vocal presence is likely too soft to give your strongest ideas the weight they deserve.",
      "Right now the delivery probably undersells the answer by failing to emphasize the moments that should stand out most.",
    ],
  },

  filler_heavy: {
    title: [
      "Filler-heavy delivery",
      "Too many verbal placeholders",
      "Polish is leaking through fillers",
    ],
    mild: [
      "Filler words are noticeable, though still fixable with a little more pause control.",
      "The delivery likely has some filler leakage, especially in transitions.",
      "You likely sound reasonably capable, but a few fillers are trimming polish.",
    ],
    moderate: [
      "Filler usage is likely weakening polish and making the answer feel less controlled than it should.",
      "The content may be decent, but verbal placeholders are softening the delivery in visible ways.",
      "You likely sound less composed than you really are because transitions rely too much on filler language.",
    ],
    high: [
      "Filler overuse is likely a central delivery problem in this answer.",
      "The answer probably sounds much less polished because filler words are appearing too often.",
      "Right now filler usage is likely weakening both confidence and clarity in a noticeable way.",
    ],
  },

  unsettled_delivery: {
    title: [
      "Unsettled delivery pattern",
      "Delivery feels less composed than it should",
      "Too much leakage in fluency",
    ],
    mild: [
      "The delivery likely has a few minor leaks in fluency, though the baseline is still workable.",
      "You probably sound mostly understandable, but not fully polished yet.",
      "There are signs of instability in delivery, though nothing looks impossible to fix quickly.",
    ],
    moderate: [
      "The answer likely feels less composed than the content deserves because fluency is not fully stable.",
      "There is probably enough substance here, but delivery leakage is making it sound less settled.",
      "The overall speaking pattern likely feels somewhat uneven instead of clean and controlled.",
    ],
    high: [
      "The delivery likely feels unsettled enough that it becomes a major part of the performance problem.",
      "Even if the content has value, the answer probably sounds too unstable to feel interview-ready.",
      "Right now the delivery likely lacks enough fluency and composure to support the answer properly.",
    ],
  },

  stop_start_rhythm: {
    title: [
      "Stop-start speaking rhythm",
      "Choppy flow pattern",
      "Rhythm is breaking too often",
    ],
    mild: [
      "The rhythm is likely a little uneven, though the answer is still mostly followable.",
      "You probably have a few breaks in flow that slightly reduce smoothness.",
      "The pacing pattern is workable, but not yet fully steady.",
    ],
    moderate: [
      "Your speaking rhythm likely breaks often enough that the answer feels less smooth than it should.",
      "The flow probably moves in bursts instead of one controlled rhythm, which reduces polish.",
      "The answer likely sounds a bit choppy, especially when moving from one point to the next.",
    ],
    high: [
      "Choppy rhythm is likely a major issue in how this answer comes across.",
      "The delivery probably stops and restarts often enough to weaken confidence and flow.",
      "Right now the speaking rhythm likely feels too broken for the answer to sound fully polished.",
    ],
  },

  measured_understated: {
    title: [
      "Measured but understated speaker",
      "Controlled, but not very dynamic",
      "Stable delivery with limited lift",
    ],
    mild: [
      "You likely sound controlled and fairly steady, though a little more lift would improve memorability.",
      "The delivery probably feels composed, but still slightly understated.",
      "You likely avoid major delivery mistakes, though the answer could sound more alive.",
    ],
    moderate: [
      "You likely sound stable and controlled, but not quite dynamic enough for your best points to stand out.",
      "The answer probably feels reasonably measured, though still a bit too restrained overall.",
      "There is likely enough control here, but not quite enough emphasis or energy contrast.",
    ],
    high: [
      "The delivery likely sounds too understated to fully carry the answer.",
      "You may be avoiding chaos, but also leaving too much impact on the table.",
      "Right now the answer probably sounds more restrained than persuasive.",
    ],
  },

  balanced_delivery: {
    title: [
      "Balanced speaking style",
      "Composed, interview-friendly delivery",
      "Stable overall delivery",
    ],
    mild: [
      "Your pacing, variation, and fluency appear fairly stable overall.",
      "The delivery likely has a solid baseline with no major issue dominating the answer.",
      "You likely sound reasonably composed and interview-friendly in most parts of the response.",
    ],
    moderate: [
      "Your speaking style appears fairly balanced, with enough stability across pace, rhythm, and clarity.",
      "There do not appear to be major delivery leaks dominating this attempt, which is a strong baseline.",
      "The delivery likely feels reasonably controlled overall, even if there is still room for sharper emphasis.",
    ],
    high: [
      "This looks like a fairly healthy overall delivery profile, which means your next gains are more about polish than repair.",
      "No major delivery issue seems to dominate here, so improvements will likely come from refinement rather than correction.",
      "Your speaking profile appears fairly stable overall, which is a good place to build from.",
    ],
  },

  strong_finish: {
    title: [
      "Controlled, confident finish",
      "You likely landed the ending well",
      "The answer seems to settle strongly",
    ],
    mild: [
      "Your ending likely sounds a bit more controlled than the earlier parts of the answer.",
      "There are signs that the close may be landing with decent vocal control.",
      "The answer likely finishes with more certainty than it starts.",
    ],
    moderate: [
      "Your finish likely sounds more settled and confident than the middle of the response.",
      "There are good signs that the answer lands with stronger vocal control near the end.",
      "The close likely works well because the delivery feels firmer as you finish.",
    ],
    high: [
      "One of the strongest traits here is that the answer likely finishes with clear control and confidence.",
      "The ending appears to land better than most of the answer because your delivery settles in a convincing way.",
      "A strong finish is likely helping the answer sound more confident and complete overall.",
    ],
  },

  soft_finish: {
    title: [
      "Slightly tentative finish",
      "The ending likely softens",
      "Your close may not be landing firmly enough",
    ],
    mild: [
      "The ending may rise or soften slightly, which trims some confidence from the last line.",
      "You likely finish a little less firmly than the answer deserves.",
      "The close probably works, though it could sound more settled.",
    ],
    moderate: [
      "The answer likely loses some authority at the end because the final sentence does not sound fully settled.",
      "Your close may be sounding a little tentative, which weakens the final impression.",
      "There are signs the finish is softer than it should be, especially on the last line.",
    ],
    high: [
      "The ending likely sounds noticeably less firm than it should, which weakens the final impression.",
      "A major issue here may be that the answer does not vocally settle when it reaches the close.",
      "Right now the finish likely sounds too tentative to fully land the answer with confidence.",
    ],
  },

  energy_fades: {
    title: [
      "Started stronger than you finished",
      "Energy fades across the answer",
      "The answer loses lift over time",
    ],
    mild: [
      "Your delivery likely begins well, but fades slightly by the time you reach the ending.",
      "There are signs that some energy drops off as the answer progresses.",
      "The answer may be losing a little lift later than it should.",
    ],
    moderate: [
      "Your delivery likely starts stronger than it finishes, which softens the payoff.",
      "Energy appears to drift downward enough that the ending may feel less engaged than the opening.",
      "The answer likely loses some vocal momentum before the most important closing lines.",
    ],
    high: [
      "Energy fade is likely a major reason the answer does not land as strongly as it could.",
      "The response probably loses too much lift by the end, which weakens impact on the payoff.",
      "Right now the answer likely begins with more energy than it can sustain, leaving the close too soft.",
    ],
  },

  energy_builds: {
    title: [
      "Settled in as you went",
      "You likely improved as the answer progressed",
      "The answer builds into itself",
    ],
    mild: [
      "Your delivery likely becomes a little stronger as the answer progresses.",
      "There are signs that you settle in after the opening.",
      "The answer may sound more natural later than at the very start.",
    ],
    moderate: [
      "You likely sound stronger once you get going, which suggests the opening is softer than the rest of the answer.",
      "The delivery probably improves as the answer progresses, which is encouraging but leaves early points underpowered.",
      "There are good signs that you settle into the response, though ideally that stronger version would show up sooner.",
    ],
    high: [
      "A major pattern here is that the answer likely gets better as it goes, which means the opening is leaving value on the table.",
      "You probably sound much more settled later than early, and that gap is large enough to matter.",
      "Right now the delivery likely needs a stronger start so the whole answer feels as confident as the later sections.",
    ],
  },
};