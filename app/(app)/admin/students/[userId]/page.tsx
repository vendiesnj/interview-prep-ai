import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  displayTenPointAs100,
  avgOverall100,
  avgTenPoint,
} from "@/app/lib/scoreScale";
import StageSetterClient from "./StageSetterClient";
import { ARCHETYPE_COLOR, ARCHETYPE_DATA } from "@/app/lib/feedback/archetypes";


function num(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function feedbackObj(a: any): any {
  return a?.feedback && typeof a.feedback === "object" ? a.feedback : null;
}

function prosodyObj(a: any): any {
  return a?.prosody && typeof a.prosody === "object" ? a.prosody : null;
}

function deliveryMetricsObj(a: any): any {
  return a?.deliveryMetrics && typeof a.deliveryMetrics === "object"
    ? a.deliveryMetrics
    : null;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}



function getAttemptPresence(a: any): number | null {
  const feedback = feedbackObj(a);
  const ds = feedback?.dimension_scores;
  if (!ds) return null;
  const ve = num(ds.vocal_engagement?.score);
  const pc = num(ds.presence_confidence?.score);
  if (ve === null && pc === null) return null;
  if (ve === null) return pc;
  if (pc === null) return ve;
  return (ve + pc) / 2;
}

function getAttemptFillers(a: any) {
  const feedback = feedbackObj(a);
  const deliveryMetrics = deliveryMetricsObj(a);

  return (
    num(feedback?.filler?.per100) ??
    num(deliveryMetrics?.fillersPer100) ??
    null
  );
}

function getAttemptMonotone(a: any) {
  const prosody = prosodyObj(a);
  const deliveryMetrics = deliveryMetricsObj(a);

  return (
    num(prosody?.monotoneScore) ??
    num(deliveryMetrics?.acoustics?.monotoneScore) ??
    null
  );
}

function getAttemptClosing(a: any) {
  const feedback = feedbackObj(a);
  return num(feedback?.star?.result);
}

function GlowCard({
  children,
  padding = 20,
  radius = 22,
}: {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        borderRadius: radius,
        padding,
        background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
        border: "1px solid var(--card-border-soft)",
        boxShadow: "var(--shadow-card-soft)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <GlowCard padding={18} radius={20}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.7,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: value.length > 8 ? 18 : 30,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: "var(--text-primary)",
          lineHeight: 1.2,
          marginBottom: 2,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.65,
          maxWidth: 220,
        }}
      >
        {subtext}
      </div>
    </GlowCard>
  );
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const { userId } = await params;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!currentUser) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const student = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: currentUser.tenantId ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      tenantId: true,
      demoPersona: true,
    },
  });

  if (!student) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Student not found</div>;
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      userId: student.id,
      tenantId: currentUser.tenantId ?? null,
      deletedAt: null,
    },
    select: {
      id: true,
      ts: true,
      question: true,
      questionCategory: true,
      score: true,
      communicationScore: true,
      confidenceScore: true,
      wpm: true,
      inputMethod: true,
      feedback: true,
      prosody: true,
      deliveryMetrics: true,
      jobProfileTitle: true,
      jobProfileCompany: true,
      jobProfileRoleType: true,
    },
    orderBy: {
      ts: "desc",
    },
  });
  const overallScores = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asOverall100(a.score ?? feedback?.score);
    })
    .filter((v): v is number => v !== null);

  const presenceScores = attempts
    .map(getAttemptPresence)
    .filter((v): v is number => v !== null);

  const wpms = attempts
    .map((a) => num(a.wpm))
    .filter((v): v is number => v !== null);

  const fillers = attempts
    .map(getAttemptFillers)
    .filter((v): v is number => v !== null);

  const monotones = attempts
    .map(getAttemptMonotone)
    .filter((v): v is number => v !== null);

  const closings = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asTenPoint(feedback?.star?.result);
    })
    .filter((v): v is number => v !== null);

  const avgScore = avgOverall100(overallScores);
  
  const avgPresence = round1(avg(presenceScores));
  const avgWpm = round1(avg(wpms));
  const avgFillers = round1(avg(fillers));
  const avgMonotone = round1(avg(monotones));
  const avgClosing = avgTenPoint(closings);

  const highPerformers = overallScores.filter((s) => s >= 80).length;
const midPerformers = overallScores.filter((s) => s >= 60 && s < 80).length;
const lowPerformers = overallScores.filter((s) => s < 60).length;

const total = overallScores.length || 1;

const highPct = Math.round((highPerformers / total) * 100);
const midPct = Math.round((midPerformers / total) * 100);
const lowPct = Math.round((lowPerformers / total) * 100);

const isAtRisk =
  avgScore !== null &&
  avgScore < 60 &&
  avgFillers !== null &&
  avgFillers > 8;

// Question category performance
const categoryPerf = new Map<string, { count: number; scores: number[] }>();
for (const a of attempts) {
  const cat = (a.questionCategory as string | null) ?? "other";
  const s = asOverall100((a.score as number | null) ?? (feedbackObj(a) as any)?.score);
  if (!categoryPerf.has(cat)) categoryPerf.set(cat, { count: 0, scores: [] });
  const entry = categoryPerf.get(cat)!;
  entry.count++;
  if (s !== null) entry.scores.push(s);
}
const categoryRows = Array.from(categoryPerf.entries())
  .map(([cat, { count, scores }]) => ({
    cat,
    count,
    avg: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  }))
  .sort((a, b) => b.count - a.count);

// Delivery trend (last 5 attempts)
const recentScores = attempts
  .slice(0, 5)
  .map((a) => asOverall100((a.score as number | null) ?? (feedbackObj(a) as any)?.score))
  .filter((v): v is number => v !== null);
const trendDelta =
  recentScores.length >= 2
    ? recentScores[0] - recentScores[recentScores.length - 1]
    : null;
const trendLabel =
  trendDelta === null
    ? " - "
    : trendDelta > 3
    ? `↑ +${trendDelta} pts`
    : trendDelta < -3
    ? `↓ ${trendDelta} pts`
    : "→ Stable";

  const strongestRole =
    attempts.find((a) => a.jobProfileTitle)?.jobProfileTitle ?? "No role data yet";

  // Archetype progression - chronological (oldest first)
  const archetypeTimeline = [...attempts]
    .reverse()
    .map((a, i) => ({
      idx: i + 1,
      archetype: (feedbackObj(a) as any)?.delivery_archetype as string | null,
      coaching: (feedbackObj(a) as any)?.archetype_coaching as string | null,
      signals: ((feedbackObj(a) as any)?.archetype_signals ?? []) as string[],
      score: asOverall100((a.score as number | null) ?? (feedbackObj(a) as any)?.score),
      ts: a.ts,
    }))
    .filter((entry) => entry.archetype !== null);

  // Detect transitions: flag entries where archetype changed from previous
  for (let i = 1; i < archetypeTimeline.length; i++) {
    (archetypeTimeline[i] as any).changed = archetypeTimeline[i].archetype !== archetypeTimeline[i - 1].archetype;
  }
  if (archetypeTimeline.length > 0) (archetypeTimeline[0] as any).changed = false;

  return (
    <PremiumShell
      title="Student Drilldown"
      subtitle="Review one student’s practice volume, interview quality, voice delivery, and recent role targeting."
    >
      <div style={{ marginTop: 8, display: "grid", gap: 18 }}>
        <div>
          <Link
            href="/admin"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <GlowCard padding={24} radius={24}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            Student Profile
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: -0.8,
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            {student.name || (student.email ? student.email.split("@")[0] : "Student")}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
            }}
          >
            {student.email}
          </div>

          {/* Stage setter */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--card-border-soft)" }}>
            <StageSetterClient userId={student.id} currentStage={student.demoPersona ?? null} />
          </div>
        </GlowCard>

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 14,
  }}
>
          <StatCard
            label="Attempts"
            value={String(attempts.length)}
            subtext="Total interview attempts by this student."
          />
                    <StatCard
            label="Avg Score"
            value={displayOverall100(avgScore)}
            subtext="Average overall interview score."
          />
                    <StatCard
            label="Avg Presence"
            value={avgPresence !== null ? `${avgPresence}/10` : "—"}
            subtext="Vocal engagement + visual confidence, averaged."
          />
          
          <StatCard
            label="Top Role"
            value={strongestRole}
            subtext="Most visible target role in attempts."
          />
          <StatCard
            label="Recent Trend"
            value={trendLabel}
            subtext="last 5 attempts"
          />
        </div>

        {/* Score Progression dot plot */}
        {(() => {
          const progressionAttempts = [...attempts].reverse().slice(-10);
          const svgW = 600;
          const svgH = 100;
          const padL = 24;
          const padR = 24;
          const padT = 18;
          const padB = 18;
          const chartW = svgW - padL - padR;
          const chartH = svgH - padT - padB;
          const n = progressionAttempts.length;
          if (n === 0) return null;

          const points = progressionAttempts.map((a, i) => {
            const s = asOverall100((a.score as number | null) ?? (feedbackObj(a) as any)?.score) ?? 0;
            const x = n === 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
            const y = padT + chartH - (s / 100) * chartH;
            const color =
              s >= 70
                ? "var(--chart-positive)"
                : s >= 50
                ? "var(--chart-neutral)"
                : "var(--chart-negative, var(--danger))";
            return { x, y, s, color, idx: i + 1 };
          });

          return (
            <div
              style={{
                borderRadius: 22,
                padding: 20,
                background:
                  "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
                border: "1px solid var(--card-border-soft)",
                boxShadow: "var(--shadow-card-soft)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.7,
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Score Progression
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: -0.25,
                  marginBottom: 12,
                }}
              >
                Attempt-by-Attempt Scores
              </div>
              <svg
                width="100%"
                height={svgH}
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", overflow: "visible" }}
              >
                {/* connecting lines */}
                {points.slice(1).map((pt, i) => (
                  <line
                    key={`line-${i}`}
                    x1={points[i].x}
                    y1={points[i].y}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="var(--card-border)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                ))}
                {/* dots + labels */}
                {points.map((pt) => (
                  <g key={pt.idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={6}
                      fill={pt.color}
                      stroke="var(--card-bg)"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="var(--text-muted)"
                    >
                      {pt.s}
                    </text>
                    <text
                      x={pt.x}
                      y={svgH - 2}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="700"
                      fill="var(--text-muted)"
                    >
                      #{pt.idx}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          );
        })()}

        {/* Archetype Journey */}
        {archetypeTimeline.length > 0 && (() => {
          const latestEntry = archetypeTimeline[archetypeTimeline.length - 1];
          const latestColor = latestEntry.archetype
            ? (ARCHETYPE_COLOR[latestEntry.archetype as keyof typeof ARCHETYPE_COLOR] ?? "#6B7280")
            : "#6B7280";

          return (
            <div style={{
              borderRadius: 22,
              padding: 22,
              background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
              border: "1px solid var(--card-border-soft)",
              boxShadow: "var(--shadow-card-soft)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
                Delivery Archetype
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3, color: latestColor }}>
                  {latestEntry.archetype}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>current</div>
              </div>
              {latestEntry.coaching && (
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 16, maxWidth: 600 }}>
                  {latestEntry.coaching}
                </div>
              )}
              {latestEntry.signals.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "center" }}>signals:</span>
                  {latestEntry.signals.map((sig) => (
                    <span key={sig} style={{
                      padding: "2px 7px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 700,
                      color: latestColor, background: `${latestColor}15`, border: `1px solid ${latestColor}35`,
                    }}>
                      {sig.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                Progression across {archetypeTimeline.length} attempt{archetypeTimeline.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {archetypeTimeline.map((entry, i) => {
                  const color = entry.archetype
                    ? (ARCHETYPE_COLOR[entry.archetype as keyof typeof ARCHETYPE_COLOR] ?? "#6B7280")
                    : "#6B7280";
                  const changed = (entry as any).changed;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {i > 0 && (
                        <span style={{ color: changed ? "var(--accent)" : "var(--card-border)", fontSize: 12, fontWeight: changed ? 900 : 400 }}>
                          {changed ? "→" : "·"}
                        </span>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{
                          padding: "2px 7px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 700,
                          color, background: `${color}15`, border: `1px solid ${color}${changed ? "60" : "30"}`,
                          whiteSpace: "nowrap",
                        }}>
                          {entry.archetype}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>#{entry.idx}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Archetype Definitions */}
        <div style={{
          borderRadius: 22,
          padding: 22,
          background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
          border: "1px solid var(--card-border-soft)",
          boxShadow: "var(--shadow-card-soft)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
            Archetype Reference
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.25, marginBottom: 16 }}>
            What each archetype means
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {(Object.entries(ARCHETYPE_DATA) as [keyof typeof ARCHETYPE_DATA, { description: string; coaching: string }][]).map(([name, data]) => {
              const color = ARCHETYPE_COLOR[name];
              return (
                <div key={name} style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${color}30`,
                  background: `${color}08`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 700,
                      color, background: `${color}18`, border: `1px solid ${color}40`,
                    }}>
                      {name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 6 }}>
                    {data.description}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55, fontStyle: "italic", borderTop: `1px solid ${color}20`, paddingTop: 6 }}>
                    Coaching: {data.coaching}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >

          {isAtRisk && (
  <GlowCard padding={18} radius={22}>
    <div style={{ color: "var(--danger)", fontWeight: 700 }}>
      ⚠️ At-Risk Student
    </div>

    <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
      This student shows below-average performance and elevated filler usage.
      Recommend targeted coaching or mock interview intervention.
    </div>
  </GlowCard>
)}
<GlowCard padding={20} radius={22}>
  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
    Cohort Distribution
  </div>

  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
    {[
      { label: "High Performers", value: highPct, color: "var(--chart-positive)" },
      { label: "Mid Performers", value: midPct, color: "var(--chart-neutral)" },
      { label: "Needs Improvement", value: lowPct, color: "var(--chart-critical)" },
    ].map((item) => (
      <div key={item.label}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            marginBottom: 6,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>
            {item.value}%
          </span>
        </div>

        <div
          style={{
            height: 8,
            borderRadius: "var(--radius-sm)",
            background: "var(--card-border-soft)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${item.value}%`,
              height: "100%",
              background: item.color,
              borderRadius: "var(--radius-sm)",
            }}
          />
        </div>
      </div>
    ))}
  </div>
</GlowCard>

          <GlowCard padding={18} radius={22}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              Voice Metrics
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ color: "var(--text-muted)" }}>
                Filler Rate:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {avgFillers !== null ? `${avgFillers}/100` : " - "}
                </strong>
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                Monotone Risk:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {avgMonotone !== null ? `${avgMonotone}/10` : " - "}
                </strong>
              </div>
                            <div style={{ color: "var(--text-muted)" }}>
                Closing Impact:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {displayTenPointAs100(avgClosing)}
                </strong>
              </div>
            </div>
          </GlowCard>

          <GlowCard padding={18} radius={22}>
  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
    Student Summary
  </div>

  <div
    style={{
      marginTop: 14,
      color: "var(--text-muted)",
      fontSize: 13,
      lineHeight: 1.8,
    }}
  >
    This student has completed {attempts.length} practice sessions with an average score of{" "}
    <strong style={{ color: "var(--text-primary)" }}>
      {displayOverall100(avgScore)}
    </strong>
    . Their presence score suggests{" "}
    <strong style={{ color: "var(--text-primary)" }}>
      {avgPresence !== null && avgPresence >= 7 ? "strong delivery presence" : "developing vocal and visual presence"}
    </strong>
    , while delivery metrics indicate{" "}
    <strong style={{ color: "var(--text-primary)" }}>
      {avgFillers !== null && avgFillers > 8 ? "excessive filler usage" : "controlled speaking patterns"}
    </strong>
    . Focus areas should include improving clarity, tightening responses, and strengthening STAR result impact.
  </div>
</GlowCard>

{categoryRows.length > 0 ? (
  <div
    style={{
      padding: 20,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 14 }}>
      Performance by Category
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {categoryRows.map((row) => (
        <div key={row.cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, textTransform: "capitalize" }}>
            {row.cat.replace(/_/g, " ")}
          </span>
          <span style={{ color: "var(--text-muted)", fontWeight: 800 }}>
            {row.avg !== null ? `${row.avg}/100` : " - "} · {row.count} attempt{row.count !== 1 ? "s" : ""}
          </span>
        </div>
      ))}
    </div>
  </div>
) : null}


        </div>

        <GlowCard padding={18} radius={22}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Recent Attempts
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "1.8fr 100px 100px 100px 100px 100px 120px 130px",
    gap: 12,
    alignItems: "center",
    padding: "0 14px 8px 14px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: "var(--text-muted)",
    textTransform: "uppercase",
  }}
>
  <div>Question / Role</div>
  <div>Overall</div>
  <div>Comm</div>
  <div>Conf</div>
  <div>Fillers</div>
  <div>Monotone</div>
  <div>Date</div>
  <div>Archetype</div>
</div>
            {attempts.length > 0 ? (
              attempts.slice(0, 12).map((attempt) => (
                <div
                  key={attempt.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.8fr 100px 100px 100px 100px 100px 120px 130px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {attempt.question || "Practice attempt"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {attempt.questionCategory || "other"} ·{" "}
                      {attempt.jobProfileTitle || "General Target Role"}
                    </div>
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                    {displayOverall100(
  asOverall100(attempt.score ?? feedbackObj(attempt)?.score)
)}
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                   {displayTenPointAs100(
  asTenPoint(
    attempt.communicationScore ?? feedbackObj(attempt)?.communication_score
  )
)}
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                    {displayTenPointAs100(
  asTenPoint(
    attempt.confidenceScore ?? feedbackObj(attempt)?.confidence_score
  )
)}
                  </div>

              <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
  {getAttemptFillers(attempt) !== null ? `${getAttemptFillers(attempt)}/100` : " - "}
</div>

<div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
  {getAttemptMonotone(attempt) !== null ? `${getAttemptMonotone(attempt)}/10` : " - "}
</div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800 }}>
                    {attempt.ts ? new Date(attempt.ts).toLocaleDateString() : " - "}
                  </div>
                  {(() => {
                    const arch = (feedbackObj(attempt) as any)?.delivery_archetype as string | null;
                    if (!arch) return <div style={{ fontSize: 11, color: "var(--text-muted)" }}> - </div>;
                    const archColor = ARCHETYPE_COLOR[arch as keyof typeof ARCHETYPE_COLOR] ?? "#6B7280";
                    return (
                      <div style={{
                        padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 700,
                        color: archColor, background: `${archColor}15`, border: `1px solid ${archColor}40`,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        display: "inline-block", maxWidth: "100%",
                      }}>
                        {arch}
                      </div>
                    );
                  })()}
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                No attempts available for this student yet.
              </div>
            )}
          </div>
        </GlowCard>
      </div>
    </PremiumShell>
  );
}