import type { ArchetypeResult, DeliveryArchetype } from "./archetypes";
export type { ArchetypeResult, DeliveryArchetype };

export type RoleFamily =
  | "finance"
  | "operations"
  | "research"
  | "consulting"
  | "general";

export type FeedbackIssue =
  | "weak_closing"
  | "low_specificity"
  | "weak_ownership"
  | "weak_structure"
  | "rushed_delivery"
  | "slow_delivery"
  | "flat_delivery"
  | "filler_overuse"
  | "weak_role_alignment"
  | "shallow_technical"
  | "thin_experience_depth"
  | "partial_answer"
  | "overlong_setup";

export type Severity = "mild" | "moderate" | "high";

export type BehavioralFingerprint = {
  deliveryStyle: "flat" | "polished" | "rushed" | "measured";
  answerStyle: "concise" | "overdetailed" | "structured" | "wandering";
  ownershipStyle: "strong" | "moderate" | "soft";
  evidenceStyle: "metrics_forward" | "example_forward" | "process_forward" | "generalized";
  roleFamily: RoleFamily;
};

export type Diagnosis = {
  primaryIssue: FeedbackIssue;
  secondaryIssue?: FeedbackIssue;
  severity: Severity;
  strengths: string[];
  fingerprint: BehavioralFingerprint;
};

export type ComposeArgs = {
  framework: "star" | "technical_explanation" | "experience_depth";
  jobDesc: string;
  question: string;
  transcript: string;
  deliveryMetrics: any | null;
  faceMetrics?: { eyeContact: number; expressiveness: number; headStability: number; framesAnalyzed?: number } | null;
  eslMode?: boolean;
  fillerStats: {
    total: number;
    wordCount: number;
    fillersPer100Words: number;
    perFiller: Record<string, number>;
  };
  normalized: any;
  prevScore?: number | null;        // previous attempt's overall score (0-100 or 0-10 scale)
  prevAttemptCount?: number | null; // how many total attempts this user has made
};
