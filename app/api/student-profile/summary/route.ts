import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await req.json();

  // ── Build NACE top 3 strengths / 2 growth areas ──────────────────────────
  const naceScores: { competency: string; score: number | null }[] =
    profile.naceScores ?? [];

  const scoredNace = naceScores.filter((n) => n.score !== null) as {
    competency: string;
    score: number;
  }[];

  const sortedNace = [...scoredNace].sort((a, b) => b.score - a.score);
  const top3Nace = sortedNace.slice(0, 3);
  const bottom2Nace = [...sortedNace].reverse().slice(0, 2);

  // ── Top 5 skills ─────────────────────────────────────────────────────────
  const skillsByCategory: Record<
    string,
    { skill: string; confidence: number }[]
  > = profile.skills?.byCategory ?? {};

  const allSkills = Object.values(skillsByCategory).flat();
  const top5Skills = [...allSkills]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map((s) => s.skill);

  // ── Latest resume score ───────────────────────────────────────────────────
  const resumeHistory: { overallScore: number; createdAt: string }[] =
    profile.resumeHistory ?? [];
  const latestResume =
    resumeHistory.length > 0
      ? resumeHistory.reduce((latest, r) =>
          new Date(r.createdAt) > new Date(latest.createdAt) ? r : latest
        )
      : null;

  // ── Checklist percentages ─────────────────────────────────────────────────
  const checklist = profile.checklist ?? {};
  function pct(seg: { done: number; total: number } | undefined) {
    if (!seg || seg.total === 0) return null;
    return Math.round((seg.done / seg.total) * 100);
  }
  const preCollegePct = pct(checklist.preCollege);
  const duringCollegePct = pct(checklist.duringCollege);
  const postCollegePct = pct(checklist.postCollege);
  const financialPct = pct(checklist.financialLiteracy);

  // ── Build prompt ─────────────────────────────────────────────────────────
  const p = profile.profile ?? {};
  const speaking = profile.speaking ?? {};
  const aptitude = profile.aptitude ?? null;
  const careerCheckIn = profile.careerCheckIn ?? null;
  const interviewPipeline = profile.interviewPipeline ?? null;

  const lines: string[] = [];

  lines.push(`STUDENT PROFILE DATA`);
  lines.push(`--------------------`);

  if (p.name) lines.push(`Name: ${p.name}`);
  if (p.graduationYear) lines.push(`Graduation Year: ${p.graduationYear}`);
  if (p.major) lines.push(`Major: ${p.major}`);
  if (p.targetRole) lines.push(`Target Role: ${p.targetRole}`);
  if (p.targetIndustry) lines.push(`Target Industry: ${p.targetIndustry}`);

  lines.push(``);
  lines.push(`SPEAKING PERFORMANCE`);

  const interview = speaking.interview ?? { count: 0, avgScore: null };
  lines.push(
    `Interview Prep: ${interview.count} session(s)` +
      (interview.avgScore !== null ? `, avg score ${interview.avgScore}/100` : `, no score yet`)
  );

  const networking = speaking.networking ?? { count: 0, avgScore: null };
  lines.push(
    `Networking: ${networking.count} session(s)` +
      (networking.avgScore !== null ? `, avg score ${networking.avgScore}/100` : `, no score yet`) +
      (networking.topPitchStyle ? `, top pitch style: ${networking.topPitchStyle}` : ``)
  );

  const publicSpeaking = speaking.publicSpeaking ?? { count: 0, avgScore: null };
  lines.push(
    `Public Speaking: ${publicSpeaking.count} session(s)` +
      (publicSpeaking.avgScore !== null
        ? `, avg score ${publicSpeaking.avgScore}/100`
        : `, no score yet`) +
      (publicSpeaking.topArchetype ? `, archetype: ${publicSpeaking.topArchetype}` : ``)
  );

  if (aptitude) {
    lines.push(``);
    lines.push(`APTITUDE`);
    lines.push(`Primary type: ${aptitude.primary}`);
    if (aptitude.secondary) lines.push(`Secondary type: ${aptitude.secondary}`);
  }

  if (top3Nace.length > 0 || bottom2Nace.length > 0) {
    lines.push(``);
    lines.push(`NACE COMPETENCIES`);
    if (top3Nace.length > 0) {
      lines.push(
        `Top strengths: ${top3Nace.map((n) => `${n.competency} (${n.score})`).join(", ")}`
      );
    }
    if (bottom2Nace.length > 0) {
      lines.push(
        `Growth areas: ${bottom2Nace.map((n) => `${n.competency} (${n.score})`).join(", ")}`
      );
    }
  }

  const checklistParts: string[] = [];
  if (preCollegePct !== null) checklistParts.push(`Pre-College ${preCollegePct}%`);
  if (duringCollegePct !== null) checklistParts.push(`During College ${duringCollegePct}%`);
  if (postCollegePct !== null) checklistParts.push(`Post-College ${postCollegePct}%`);
  if (financialPct !== null) checklistParts.push(`Financial Literacy ${financialPct}%`);
  if (checklistParts.length > 0) {
    lines.push(``);
    lines.push(`CHECKLIST COMPLETION`);
    lines.push(checklistParts.join(", "));
  }

  if (careerCheckIn) {
    lines.push(``);
    lines.push(`CAREER CHECK-IN`);
    lines.push(`Employment status: ${careerCheckIn.employmentStatus}`);
    if (careerCheckIn.salaryRange) lines.push(`Salary range: ${careerCheckIn.salaryRange}`);
    if (careerCheckIn.satisfactionScore !== null && careerCheckIn.satisfactionScore !== undefined) {
      lines.push(`Satisfaction: ${careerCheckIn.satisfactionScore}/5`);
    }
  }

  if (top5Skills.length > 0) {
    lines.push(``);
    lines.push(`SKILLS`);
    lines.push(`Total skills extracted: ${profile.skills?.total ?? 0}`);
    lines.push(`Top skills: ${top5Skills.join(", ")}`);
  }

  if (latestResume) {
    lines.push(``);
    lines.push(`RESUME`);
    lines.push(`Latest resume score: ${latestResume.overallScore}/100`);
  }

  if (interviewPipeline) {
    lines.push(``);
    lines.push(`INTERVIEW PIPELINE`);
    lines.push(`Total pipeline entries: ${interviewPipeline.total}`);
  }

  const dataBlock = lines.join("\n");

  const systemPrompt =
    "You are a career development coach writing a holistic profile summary for a student. " +
    "Based on their performance data below, write a warm, encouraging, and specific 2-3 paragraph " +
    "narrative summary of who this student is as a professional. Be specific — reference their actual " +
    "scores, skills, and patterns. Highlight their standout strengths, note 1-2 areas of clear growth " +
    "opportunity without being harsh, and end with an encouraging statement about their trajectory. " +
    "Write in second person ('You are...', 'Your...'). Be conversational, not clinical. 200-300 words.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: dataBlock },
      ],
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("student-profile/summary error", err);
    return NextResponse.json({ error: "Summary generation failed" }, { status: 500 });
  }
}
