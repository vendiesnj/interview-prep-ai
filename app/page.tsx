import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Reveal from "@/app/components/Reveal";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const fullName = session?.user?.name ?? "";
  const firstName = (fullName.trim().split(/\s+/)[0] || "there").trim();
  const isAuthed = !!session?.user?.email;

  return (
    <main style={{ width: "100%", minHeight: "100vh", background: "var(--bg)" }}>
      {/* HERO */}
      <section
        style={{
          width: "100%",
          padding: "34px 24px 84px",
          background: `
            radial-gradient(1000px 500px at 10% -10%, var(--accent-2-soft), transparent 60%),
            radial-gradient(900px 420px at 95% 0%, var(--accent-soft), transparent 60%),
            var(--bg)
          `,
          borderBottom: "1px solid var(--card-border-soft)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {/* Top nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginBottom: 52,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              aria-label="Interview Performance Coach"
              style={{
                display: "inline-flex",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 320,
                  height: 84,
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--card-border)",
                  background:
                    "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backdropFilter: "blur(10px)",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Interview Performance Coach"
                  style={{
                    width: "90%",
                    height: "auto",
                    display: "block",
                    transform: "translateY(4px)",
                  }}
                />
              </div>
            </Link>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {isAuthed ? (
                <>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--card-border)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Welcome, {firstName}
                  </div>

                  <Link
                    href="/dashboard"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--accent-strong)",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      textDecoration: "none",
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                      boxShadow: "var(--shadow-glow)",
                    }}
                  >
                    Open app
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--card-border)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontWeight: 900,
                    }}
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--accent-strong)",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      textDecoration: "none",
                      fontWeight: 950,
                      boxShadow: "var(--shadow-glow)",
                    }}
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero content */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 28,
              alignItems: "start",
            }}
          >
            <div>
              <Reveal delayMs={80}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                  }}
                >
                  Interview analytics • Voice delivery • Role-based practice
                </div>
              </Reveal>

              <Reveal delayMs={160}>
                <h1
                  style={{
                    marginTop: 16,
                    fontSize: 58,
                    lineHeight: 1.02,
                    letterSpacing: -1.4,
                    fontWeight: 1000 as any,
                    color: "var(--text-primary)",
                    maxWidth: 760,
                  }}
                >
                  Practice interviews with measurable feedback and real progress tracking.
                </h1>
              </Reveal>

              <Reveal delayMs={240}>
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 17,
                    lineHeight: 1.75,
                    color: "var(--text-muted)",
                    maxWidth: 700,
                  }}
                >
                  Interview Performance Coach helps you improve how you answer, how you sound,
                  and how you perform across roles and question types — with STAR scoring,
                  communication feedback, speech analytics, and insights over time.
                </p>
              </Reveal>

              <Reveal delayMs={320}>
                <div
                  style={{
                    marginTop: 22,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {isAuthed ? (
                    <>
                      <Link
                        href="/practice"
                        style={{
                          padding: "13px 18px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--accent-strong)",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 950,
                          minWidth: 180,
                          textAlign: "center",
                          boxShadow: "var(--shadow-glow)",
                        }}
                      >
                        Practice now
                      </Link>

                      <Link
                        href="/question-bank"
                        style={{
                          padding: "13px 18px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border)",
                          background: "var(--card-bg)",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          fontWeight: 900,
                          minWidth: 170,
                          textAlign: "center",
                        }}
                      >
                        Open question bank
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        style={{
                          padding: "13px 18px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--accent-strong)",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 950,
                          minWidth: 190,
                          textAlign: "center",
                          boxShadow: "var(--shadow-glow)",
                        }}
                      >
                        Start free practice
                      </Link>

                      <Link
                        href="/login"
                        style={{
                          padding: "13px 18px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border)",
                          background: "var(--card-bg)",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          fontWeight: 900,
                          minWidth: 120,
                          textAlign: "center",
                        }}
                      >
                        Log in
                      </Link>
                    </>
                  )}
                </div>
              </Reveal>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                <span>✓ Practice in minutes</span>
                <span>✓ Track strengths and weak spots</span>
                <span>✓ Built for real interview prep</span>
              </div>
            </div>

            <Reveal delayMs={420}>
              <div
                style={{
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--card-border)",
                  background:
                    "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
                  boxShadow: "var(--shadow-card)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -1,
                    background: `
                      radial-gradient(500px 240px at 20% 0%, var(--accent-2-soft), transparent 60%),
                      radial-gradient(420px 220px at 90% 10%, var(--accent-soft), transparent 55%)
                    `,
                    pointerEvents: "none",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      padding: 16,
                      borderBottom: "1px solid var(--card-border-soft)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          fontWeight: 900,
                          letterSpacing: 0.7,
                        }}
                      >
                        SAMPLE INSIGHT
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 950,
                          color: "var(--accent)",
                          border: "1px solid var(--accent-strong)",
                          background: "var(--accent-soft)",
                          padding: "6px 10px",
                          borderRadius: 999,
                        }}
                      >
                        Overall: 7.8 / 10
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        color: "var(--text-primary)",
                        fontWeight: 900,
                        lineHeight: 1.6,
                      }}
                    >
                      “Tell me about a time you handled a difficult stakeholder.”
                    </div>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 14 }}>
                    <BarMetric
                      label="STAR structure"
                      value={7.2}
                      hint="Action is strong. Result needs a clearer metric."
                    />
                    <BarMetric
                      label="Communication"
                      value={7.8}
                      hint="Clear overall flow — tighten the setup."
                    />
                    <BarMetric
                      label="Confidence"
                      value={6.4}
                      hint="Use more ownership language and assertive phrasing."
                    />

                    <div
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 950,
                            fontSize: 12,
                          }}
                        >
                          Progress trend
                        </div>
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          Last 5 attempts
                        </div>
                      </div>

                      <svg
                        viewBox="0 0 320 90"
                        width="100%"
                        height="90"
                        style={{ marginTop: 10, display: "block" }}
                      >
                        <path
                          d="M0 15 H320 M0 45 H320 M0 75 H320"
                          stroke="var(--card-border-soft)"
                          strokeWidth="1"
                          fill="none"
                        />
                        <path
                          d="M10 65 L80 58 L150 52 L220 44 L300 34"
                          stroke="var(--accent)"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {[10, 80, 150, 220, 300].map((x, i) => {
                          const ys = [65, 58, 52, 44, 34];
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={ys[i]}
                              r="4.5"
                              fill="var(--accent)"
                            />
                          );
                        })}
                      </svg>

                      <div
                        style={{
                          marginTop: 8,
                          color: "var(--text-muted)",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        Upward trend. Biggest lift comes from ending with a measurable result.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 950,
                            fontSize: 12,
                          }}
                        >
                          Keyword alignment
                        </div>
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          Missing: 2
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Chip>forecasting</Chip>
                        <Chip>risk mitigation</Chip>
                        <Chip kind="ok">stakeholder alignment</Chip>
                        <Chip kind="ok">cross-functional</Chip>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        lineHeight: 1.7,
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 950 }}>
                        Next rep:
                      </span>{" "}
                      lead with the metric, name the constraint, and end with a measurable outcome.
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section
        style={{
          width: "100%",
          padding: "68px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--card-border-soft)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 0.8,
                color: "var(--accent)",
              }}
            >
              WHY IT WORKS
            </div>

            <h2
              style={{
                marginTop: 10,
                fontSize: 40,
                lineHeight: 1.1,
                letterSpacing: -0.8,
                fontWeight: 950,
                color: "var(--text-primary)",
              }}
            >
              Interview prep should feel structured, measurable, and repeatable.
            </h2>

            <p
              style={{
                marginTop: 12,
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--text-muted)",
              }}
            >
              IPC gives you a real practice loop: answer questions, get scored, review trends,
              and focus on the exact areas that need improvement.
            </p>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <Reveal delayMs={120}>
              <LightCard
                title="Answer breakdowns"
                body="STAR structure, communication, confidence, and role alignment are scored separately so you know exactly what needs work."
              />
            </Reveal>

            <Reveal delayMs={220}>
              <LightCard
                title="Speech analytics"
                body="Track pace, fillers, vocal variety, and speaking rhythm so you improve both content and delivery."
              />
            </Reveal>

            <Reveal delayMs={320}>
              <LightCard
                title="Performance insights"
                body="See strengths, weak spots, category performance, and role-based patterns across your interview practice."
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section
        style={{
          width: "100%",
          padding: "76px 24px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--card-border-soft)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 0.8,
                color: "var(--accent)",
              }}
            >
              BUILT FOR REAL PRACTICE
            </div>

            <h2
              style={{
                marginTop: 10,
                fontSize: 38,
                lineHeight: 1.1,
                letterSpacing: -0.8,
                fontWeight: 950,
                color: "var(--text-primary)",
              }}
            >
              Everything you need to improve before the real interview.
            </h2>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <FeatureCard
              eyebrow="Practice"
              title="Role-based interview practice"
              body="Paste a job description or use a saved job profile to generate tailored interview questions for the role you actually want."
              bullets={[
                "Question bank for saved prompts",
                "Behavioral, technical, and role-specific practice",
                "Custom questions when you want full control",
              ]}
            />

            <FeatureCard
              eyebrow="Results"
              title="Single-attempt analysis that feels actionable"
              body="Every attempt gets structured feedback, delivery breakdowns, and coaching for exactly what to improve on your next rep."
              bullets={[
                "STAR scoring and evidence excerpts",
                "Confidence and communication scoring",
                "Keyword alignment and stronger-answer rewrites",
              ]}
            />

            <FeatureCard
              eyebrow="Delivery"
              title="Speech analytics beyond the transcript"
              body="Improve how you sound, not just what you say, with pace, fillers, monotone risk, pitch variety, and speaking rhythm analysis."
              bullets={[
                "WPM and filler analysis",
                "Vocal presence and rhythm scoring",
                "Timeline view of speech dynamics",
              ]}
            />

            <FeatureCard
              eyebrow="Insights"
              title="Track progress over time"
              body="See where you are strongest, where you struggle, and how your performance changes across categories and job profiles."
              bullets={[
                "Performance by question type",
                "Performance by role/profile",
                "Trend summaries and weak-spot detection",
              ]}
            />
          </div>
        </div>
      </section>

      {/* AUDIENCE STRIP */}
      <section
        style={{
          width: "100%",
          padding: "72px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--card-border-soft)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <AudienceCard
            title="For job seekers"
            body="Practice on your own schedule, build stronger answers, and walk into interviews with more structure, confidence, and clarity."
          />

          <AudienceCard
            title="For universities"
            body="Career-center-ready reporting, benchmarking, and student practice data can expand this into a platform for outcomes-focused programs."
          />
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          width: "100%",
          background: "var(--bg)",
          color: "var(--text-primary)",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--card-border)",
              background:
                "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
              padding: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  letterSpacing: 0.8,
                  color: "var(--accent)",
                }}
              >
                GET STARTED
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 950,
                  letterSpacing: -0.4,
                  color: "var(--text-primary)",
                }}
              >
                Start practicing in minutes.
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "var(--text-muted)",
                  lineHeight: 1.7,
                }}
              >
                Create an account, choose a role, and run your first rep with structured feedback and insights.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={isAuthed ? "/practice" : "/signup"}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--accent-strong)",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 950,
                  minWidth: 180,
                  textAlign: "center",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                {isAuthed ? "Practice now" : "Start free practice"}
              </Link>

              <Link
                href={isAuthed ? "/dashboard" : "/login"}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  fontWeight: 900,
                  minWidth: 120,
                  textAlign: "center",
                }}
              >
                {isAuthed ? "Open dashboard" : "Log in"}
              </Link>
            </div>
          </div>

          <footer
            style={{
              marginTop: 22,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              © {new Date().getFullYear()} Interview Performance Coach
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <Link
                href="/privacy"
                style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 800 }}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 800 }}
              >
                Terms
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function LightCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontWeight: 950,
          fontSize: 15,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 8,
          color: "var(--text-muted)",
          lineHeight: 1.7,
          fontSize: 14,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function FeatureCard({
  eyebrow,
  title,
  body,
  bullets,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border)",
        background:
          "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: 0.8,
          color: "var(--accent)",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 20,
          fontWeight: 950,
          lineHeight: 1.2,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
          lineHeight: 1.7,
          fontSize: 14,
        }}
      >
        {body}
      </div>

      <ul
        style={{
          marginTop: 14,
          marginBottom: 0,
          paddingLeft: 18,
          lineHeight: 1.7,
          color: "var(--text-primary)",
          fontSize: 13,
        }}
      >
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function AudienceCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontWeight: 950,
          marginBottom: 8,
          color: "var(--text-primary)",
          fontSize: 16,
        }}
      >
        {title}
      </div>
      <div style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14 }}>
        {body}
      </div>
    </div>
  );
}

function BarMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));

  return (
    <div
      style={{
        padding: 14,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <div style={{ color: "var(--text-primary)", fontWeight: 950, fontSize: 12 }}>
          {label}
        </div>
        <div style={{ color: "var(--accent)", fontWeight: 950, fontSize: 12 }}>
          {value.toFixed(1)}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 10,
          borderRadius: 999,
          background: "var(--card-border-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          color: "var(--text-muted)",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function Chip({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind?: "ok" | "bad";
}) {
  const ok = kind === "ok";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 999,
        border: ok
          ? "1px solid var(--accent-strong)"
          : "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
        background: ok ? "var(--accent-soft)" : "var(--danger-soft)",
        color: ok ? "var(--accent)" : "var(--danger)",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}