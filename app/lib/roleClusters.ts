/**
 * Role Cluster definitions
 * Maps O*NET occupation categories into interview-prep clusters.
 * Each cluster defines:
 *   - Which O*NET categories belong to it
 *   - Core competencies shared across all roles in the cluster
 *   - Dimension-to-competency weight mappings (using 7-dimension scoring)
 *   - Differentiators per sub-role type
 */

import OCCUPATIONS, { type Occupation } from "@/app/lib/onet-occupations";

export type ClusterKey =
  | "finance"
  | "tech"
  | "consulting"
  | "marketing"
  | "operations"
  | "healthcare"
  | "education"
  | "trades";

export interface ClusterCompetency {
  key: string;
  label: string;
  weight: number;         // 0–1, sum to 1 across cluster
  dimensionKeys: string[]; // which of the 7 dimensions drive this competency
  description: string;
  threshold: number;      // score out of 10 considered "meets bar" for this cluster
}

export interface RoleCluster {
  key: ClusterKey;
  label: string;
  description: string;
  onetCategories: string[];   // matches Occupation.category
  competencies: ClusterCompetency[];
  readinessThresholds: {
    notReady: number;     // < this = not ready
    developing: number;   // < this = developing
    ready: number;        // < this = ready, >= = strong
  };
}

export const ROLE_CLUSTERS: RoleCluster[] = [
  {
    key: "finance",
    label: "Finance & Business",
    description: "Investment banking, wealth management, accounting, financial analysis, and corporate finance roles.",
    onetCategories: ["Finance & Banking", "Financial Services", "Accounting", "Insurance", "Real Estate"],
    readinessThresholds: { notReady: 45, developing: 62, ready: 78 },
    competencies: [
      { key: "quantitative_precision",  label: "Quantitative Precision",   weight: 0.22, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Using numbers, metrics, and data to back every claim.", threshold: 7.0 },
      { key: "structured_communication",label: "Structured Communication", weight: 0.20, dimensionKeys: ["narrative_clarity", "response_control"],     description: "Clear, organized answers with no meandering.", threshold: 7.5 },
      { key: "ownership_drive",          label: "Ownership & Drive",        weight: 0.18, dimensionKeys: ["ownership_agency"],                          description: "Taking personal accountability and showing initiative.", threshold: 7.0 },
      { key: "professional_presence",    label: "Professional Presence",   weight: 0.18, dimensionKeys: ["presence_confidence", "vocal_engagement"],   description: "Projecting credibility and composure under pressure.", threshold: 7.0 },
      { key: "closing_impact",           label: "Measurable Outcomes",     weight: 0.22, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Every story ends with a result that can be quantified.", threshold: 7.5 },
    ],
  },
  {
    key: "tech",
    label: "Technology & Engineering",
    description: "Software engineering, data science, product management, and technical roles.",
    onetCategories: ["Technology", "Engineering", "Healthcare Technology", "Advanced Manufacturing", "Clean Energy"],
    readinessThresholds: { notReady: 40, developing: 58, ready: 75 },
    competencies: [
      { key: "problem_solving",          label: "Problem-Solving Clarity",  weight: 0.25, dimensionKeys: ["cognitive_depth", "narrative_clarity"],      description: "Breaking down complex problems into logical steps.", threshold: 7.0 },
      { key: "technical_evidence",       label: "Technical Evidence",       weight: 0.22, dimensionKeys: ["evidence_quality"],                          description: "Grounding answers in real technical work and outcomes.", threshold: 7.0 },
      { key: "ownership_initiative",     label: "Initiative & Ownership",   weight: 0.18, dimensionKeys: ["ownership_agency"],                          description: "Showing you drove solutions, not just participated.", threshold: 6.5 },
      { key: "collaboration",            label: "Cross-Functional Collaboration", weight: 0.18, dimensionKeys: ["narrative_clarity", "presence_confidence"], description: "Working across teams and communicating technical concepts clearly.", threshold: 6.5 },
      { key: "response_depth",           label: "Response Depth",           weight: 0.17, dimensionKeys: ["response_control", "cognitive_depth"],       description: "Complete, considered answers with appropriate detail.", threshold: 6.5 },
    ],
  },
  {
    key: "consulting",
    label: "Consulting & Strategy",
    description: "Management consulting, strategy, business analysis, and advisory roles.",
    onetCategories: ["Consulting", "Professional Services", "Strategy"],
    readinessThresholds: { notReady: 50, developing: 65, ready: 80 },
    competencies: [
      { key: "structured_thinking",      label: "Structured Thinking",      weight: 0.25, dimensionKeys: ["cognitive_depth", "narrative_clarity"],      description: "MECE frameworks, top-down communication, and logical flow.", threshold: 7.5 },
      { key: "impact_orientation",       label: "Impact Orientation",       weight: 0.22, dimensionKeys: ["evidence_quality", "ownership_agency"],      description: "Every answer ties back to measurable client or business impact.", threshold: 7.5 },
      { key: "executive_presence",       label: "Executive Presence",       weight: 0.20, dimensionKeys: ["presence_confidence", "vocal_engagement"],   description: "Confident, compelling delivery at any level of the org.", threshold: 7.5 },
      { key: "adaptability",             label: "Adaptability",             weight: 0.16, dimensionKeys: ["response_control", "ownership_agency"],      description: "Pivoting quickly when constraints change or data conflicts.", threshold: 7.0 },
      { key: "communication_polish",     label: "Communication Polish",     weight: 0.17, dimensionKeys: ["narrative_clarity", "response_control"],     description: "Zero filler words, tight pacing, sharp transitions.", threshold: 7.5 },
    ],
  },
  {
    key: "marketing",
    label: "Marketing & Communications",
    description: "Marketing, brand management, public relations, advertising, and content roles.",
    onetCategories: ["Marketing & Advertising", "Media & Entertainment", "Communications", "Public Relations"],
    readinessThresholds: { notReady: 42, developing: 58, ready: 74 },
    competencies: [
      { key: "storytelling",             label: "Storytelling & Narrative",  weight: 0.25, dimensionKeys: ["narrative_clarity", "vocal_engagement"],    description: "Compelling, memorable stories that stick.", threshold: 7.0 },
      { key: "creative_evidence",        label: "Creative with Evidence",   weight: 0.20, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Backing creative ideas with data and results.", threshold: 6.5 },
      { key: "audience_awareness",       label: "Audience Awareness",       weight: 0.18, dimensionKeys: ["presence_confidence", "narrative_clarity"],  description: "Adapting communication style to the audience.", threshold: 6.5 },
      { key: "initiative_brand",         label: "Initiative & Brand POV",   weight: 0.20, dimensionKeys: ["ownership_agency", "cognitive_depth"],       description: "Showing strong opinions backed by market insight.", threshold: 7.0 },
      { key: "delivery_energy",          label: "Delivery Energy",          weight: 0.17, dimensionKeys: ["vocal_engagement", "presence_confidence"],   description: "Enthusiasm and energy that reflects brand passion.", threshold: 6.5 },
    ],
  },
  {
    key: "operations",
    label: "Operations & Supply Chain",
    description: "Operations management, supply chain, logistics, project management, and process improvement.",
    onetCategories: ["Operations", "Supply Chain & Logistics", "Manufacturing", "Transportation"],
    readinessThresholds: { notReady: 42, developing: 58, ready: 74 },
    competencies: [
      { key: "process_clarity",          label: "Process Clarity",          weight: 0.22, dimensionKeys: ["narrative_clarity", "response_control"],     description: "Explaining complex processes in clear, sequential steps.", threshold: 7.0 },
      { key: "quantified_results",       label: "Quantified Results",       weight: 0.22, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Efficiency gains, cost reductions, and throughput numbers.", threshold: 7.0 },
      { key: "ownership_execution",      label: "Execution & Ownership",    weight: 0.20, dimensionKeys: ["ownership_agency"],                          description: "Driving outcomes through direct ownership of work.", threshold: 7.0 },
      { key: "composure_complexity",     label: "Composure Under Complexity", weight: 0.18, dimensionKeys: ["presence_confidence", "response_control"],  description: "Staying clear and decisive when problems compound.", threshold: 6.5 },
      { key: "stakeholder_communication",label: "Stakeholder Communication", weight: 0.18, dimensionKeys: ["narrative_clarity", "vocal_engagement"],    description: "Communicating across levels and functions effectively.", threshold: 6.5 },
    ],
  },
  {
    key: "healthcare",
    label: "Healthcare & Life Sciences",
    description: "Clinical, research, public health, pharmaceutical, and healthcare administration roles.",
    onetCategories: ["Healthcare", "Healthcare Technology", "Life Sciences", "Public Health"],
    readinessThresholds: { notReady: 40, developing: 55, ready: 72 },
    competencies: [
      { key: "empathy_communication",    label: "Empathy & Communication",  weight: 0.24, dimensionKeys: ["narrative_clarity", "presence_confidence"],  description: "Patient-centered, compassionate communication.", threshold: 7.0 },
      { key: "clinical_evidence",        label: "Evidence-Based Reasoning", weight: 0.22, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Grounding decisions in data, research, or protocol.", threshold: 7.0 },
      { key: "ethical_judgment",         label: "Ethical Judgment",         weight: 0.20, dimensionKeys: ["ownership_agency", "cognitive_depth"],       description: "Navigating complex ethical situations with clarity.", threshold: 7.0 },
      { key: "composure_pressure",       label: "Composure Under Pressure", weight: 0.18, dimensionKeys: ["presence_confidence", "response_control"],   description: "Staying calm and methodical in high-stakes environments.", threshold: 7.0 },
      { key: "team_collaboration",       label: "Team Collaboration",       weight: 0.16, dimensionKeys: ["narrative_clarity", "ownership_agency"],      description: "Effective cross-disciplinary teamwork.", threshold: 6.5 },
    ],
  },
  {
    key: "education",
    label: "Education & Social Services",
    description: "Teaching, counseling, social work, nonprofit, and community development roles.",
    onetCategories: ["Education", "Social Services", "Nonprofit", "Government"],
    readinessThresholds: { notReady: 38, developing: 52, ready: 68 },
    competencies: [
      { key: "relational_communication", label: "Relational Communication", weight: 0.26, dimensionKeys: ["narrative_clarity", "presence_confidence"],  description: "Building trust and rapport through warm, clear communication.", threshold: 6.5 },
      { key: "mission_ownership",        label: "Mission & Ownership",      weight: 0.22, dimensionKeys: ["ownership_agency"],                          description: "Deep commitment to outcomes for the communities served.", threshold: 7.0 },
      { key: "evidence_of_impact",       label: "Evidence of Impact",       weight: 0.20, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Measuring and articulating real change in people's lives.", threshold: 6.5 },
      { key: "adaptability",             label: "Adaptability",             weight: 0.16, dimensionKeys: ["response_control", "ownership_agency"],      description: "Adjusting approach when students, clients, or situations change.", threshold: 6.5 },
      { key: "vocal_warmth",             label: "Vocal Warmth & Presence",  weight: 0.16, dimensionKeys: ["vocal_engagement", "narrative_clarity"],     description: "Engaging, accessible delivery that draws people in.", threshold: 6.5 },
    ],
  },
  {
    key: "trades",
    label: "Skilled Trades & Technical",
    description: "Electricians, mechanics, construction, manufacturing, and other skilled trade roles.",
    onetCategories: ["Skilled Trades", "Construction", "Advanced Manufacturing", "Aviation"],
    readinessThresholds: { notReady: 35, developing: 50, ready: 65 },
    competencies: [
      { key: "technical_competence",     label: "Technical Competence",     weight: 0.28, dimensionKeys: ["evidence_quality", "cognitive_depth"],       description: "Demonstrating hands-on knowledge and problem-solving.", threshold: 6.5 },
      { key: "safety_mindset",           label: "Safety & Reliability",     weight: 0.22, dimensionKeys: ["ownership_agency", "response_control"],      description: "Showing commitment to safety protocols and consistent quality.", threshold: 7.0 },
      { key: "clear_explanation",        label: "Clear Explanation",        weight: 0.20, dimensionKeys: ["narrative_clarity"],                         description: "Explaining technical work to non-technical stakeholders.", threshold: 6.0 },
      { key: "work_ownership",           label: "Work Ownership",           weight: 0.18, dimensionKeys: ["ownership_agency"],                          description: "Taking full accountability for quality and completion.", threshold: 7.0 },
      { key: "professionalism",          label: "Professionalism",          weight: 0.12, dimensionKeys: ["presence_confidence", "vocal_engagement"],   description: "Showing up prepared, reliable, and easy to work with.", threshold: 6.0 },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Look up a cluster by key */
export function getCluster(key: ClusterKey): RoleCluster | undefined {
  return ROLE_CLUSTERS.find((c) => c.key === key);
}

/** Infer which cluster an occupation belongs to */
export function inferClusterForOccupation(occ: Occupation): ClusterKey {
  const cat = occ.category;
  for (const cluster of ROLE_CLUSTERS) {
    if (cluster.onetCategories.some((c) => cat.toLowerCase().includes(c.toLowerCase()))) {
      return cluster.key;
    }
  }
  // Fallback by RIASEC
  if (occ.riasec.startsWith("E")) return "consulting";
  if (occ.riasec.startsWith("I")) return "tech";
  if (occ.riasec.startsWith("S")) return "education";
  if (occ.riasec.startsWith("R")) return "trades";
  return "operations";
}

/** Get all O*NET occupations for a cluster */
export function getOccupationsForCluster(clusterKey: ClusterKey): Occupation[] {
  const cluster = getCluster(clusterKey);
  if (!cluster) return [];
  return OCCUPATIONS.filter((occ) => inferClusterForOccupation(occ) === clusterKey);
}

/** Find an occupation by id or fuzzy title match */
export function findOccupation(roleKey: string): Occupation | undefined {
  const byId = OCCUPATIONS.find((o) => o.id === roleKey);
  if (byId) return byId;
  const lower = roleKey.toLowerCase();
  return OCCUPATIONS.find((o) => o.title.toLowerCase().includes(lower) || lower.includes(o.title.toLowerCase()));
}

/** Given a list of role keys, group them by cluster and return cluster summaries */
export function groupRolesByCluster(roleKeys: string[]): Map<ClusterKey, { cluster: RoleCluster; roles: Occupation[] }> {
  const result = new Map<ClusterKey, { cluster: RoleCluster; roles: Occupation[] }>();
  for (const key of roleKeys) {
    const occ = findOccupation(key);
    if (!occ) continue;
    const clusterKey = inferClusterForOccupation(occ);
    const cluster = getCluster(clusterKey);
    if (!cluster) continue;
    if (!result.has(clusterKey)) result.set(clusterKey, { cluster, roles: [] });
    result.get(clusterKey)!.roles.push(occ);
  }
  return result;
}
