import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ExcelJS from "exceljs";

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

function asOverall100(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 10 ? Math.round(value) : Math.round(value * 10);
}

function asTenPoint(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 10 ? Math.round(value) / 10 : Math.round(value * 10) / 10;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function getAttemptOverall(a: any) {
  const feedback = feedbackObj(a);
  return asOverall100(a.score ?? feedback?.score);
}

function getAttemptComm(a: any) {
  const feedback = feedbackObj(a);
  return asTenPoint(
    a.communicationScore ?? a.communication_score ?? feedback?.communication_score
  );
}

function getAttemptConf(a: any) {
  const feedback = feedbackObj(a);
  return asTenPoint(
    a.confidenceScore ?? a.confidence_score ?? feedback?.confidence_score
  );
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
  return asTenPoint(feedback?.star?.result);
}

function getCohort(score100: number | null) {
  if (score100 === null) return "Needs Support";
  if (score100 >= 80) return "High";
  if (score100 >= 60) return "Mid";
  return "Needs Support";
}

function getAttemptBand(score100: number | null) {
  if (score100 === null) return "Unknown";
  if (score100 >= 80) return "High";
  if (score100 >= 60) return "Mid";
  return "Needs Support";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function formatMetric(value: number | null, digits = 1) {
  if (value === null) return "";
  return Number(value.toFixed(digits));
}

function scoreGap(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return Math.abs(a - b);
}

function buildPitchReasoning(input: {
  studentName: string;
  cohort: string;
  avgOverall: number | null;
  avgComm: number | null;
  avgConf: number | null;
  avgWpm: number | null;
  avgFillers: number | null;
  avgMonotone: number | null;
  avgClosing: number | null;
  attempts: number;
  topRole: string;
}) {
  const parts: string[] = [];

  if (input.avgOverall !== null && input.avgOverall >= 80) {
    parts.push(
      `${input.studentName} is a strong success-story example because the student is already performing at a high level overall.`
    );
  } else if (input.avgOverall !== null && input.avgOverall < 60) {
    parts.push(
      `${input.studentName} is a strong intervention example because the student is currently below readiness target overall.`
    );
  } else {
    parts.push(
      `${input.studentName} is a useful middle-of-the-funnel example because the profile looks realistic and coachable.`
    );
  }

  const commConfGap = scoreGap(input.avgComm, input.avgConf);
  if (commConfGap !== null && commConfGap >= 1.2) {
    if ((input.avgComm ?? 0) > (input.avgConf ?? 0)) {
      parts.push(
        "Communication is noticeably stronger than confidence, which makes this student good for showing how IPC separates content quality from delivery presence."
      );
    } else {
      parts.push(
        "Confidence is noticeably stronger than communication, which makes this student good for showing how IPC catches polish without over-crediting structure."
      );
    }
  }

  if (input.avgClosing !== null && input.avgClosing < 6.5) {
    parts.push(
      "Closing impact is weak, so this student is strong for demonstrating STAR/result coaching and measurable-outcome improvement."
    );
  }

  if (input.avgFillers !== null && input.avgFillers >= 3) {
    parts.push(
      "Filler rate is elevated, which helps demonstrate voice analytics beyond transcript-only scoring."
    );
  }

  if (input.avgMonotone !== null && input.avgMonotone >= 6) {
    parts.push(
      "Monotone risk is elevated, which helps show the vocal delivery layer and why speaking metrics matter for interview readiness."
    );
  }

  if (input.avgWpm !== null && (input.avgWpm < 105 || input.avgWpm > 165)) {
    parts.push(
      "Pace is outside the ideal range, giving you a clean example of speech delivery coaching."
    );
  }

  if (input.topRole) {
    parts.push(
      `The role targeting also feels believable for demo purposes because this student is primarily practicing for ${input.topRole}.`
    );
  }

  return parts.join(" ");
}

function buildPitchWalkthrough(input: {
  studentName: string;
  avgOverall: number | null;
  avgComm: number | null;
  avgConf: number | null;
  avgFillers: number | null;
  avgMonotone: number | null;
  avgClosing: number | null;
  topRole: string;
}) {
  const talkingPoints: string[] = [];

  talkingPoints.push(
    `1) Start on the admin dashboard and explain that ${input.studentName} was flagged as an interesting student profile for coaching review.`
  );

  talkingPoints.push(
    `2) Open the student drilldown and show that IPC does not just score the student overall — it separates communication, confidence, and delivery quality.`
  );

  if (input.avgClosing !== null && input.avgClosing < 6.5) {
    talkingPoints.push(
      "3) Point out the weak closing/result impact and explain that the platform identifies when answers sound decent but fail to land measurable outcomes."
    );
  } else {
    talkingPoints.push(
      "3) Point out the score pattern and explain how IPC shows where this student is strong versus where coaching is still needed."
    );
  }

  if (input.avgFillers !== null && input.avgFillers >= 3) {
    talkingPoints.push(
      "4) Show filler metrics as an example of speaking-based coaching that universities would not get from a normal mock interview rubric."
    );
  } else if (input.avgMonotone !== null && input.avgMonotone >= 6) {
    talkingPoints.push(
      "4) Show monotone risk to demonstrate that the platform evaluates vocal delivery, not just written answer quality."
    );
  } else {
    talkingPoints.push(
      "4) Show pace and delivery metrics to reinforce that the system evaluates how the student sounds, not just what they say."
    );
  }

  talkingPoints.push(
    `5) Tie it back to career services by explaining that this lets staff quickly identify who is job-ready, who needs support, and what type of coaching matters most for a ${input.topRole || "target role"} candidate.`
  );

  return talkingPoints.join(" ");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const attempts = await prisma.attempt.findMany({
      where: {
        tenantId: currentUser.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        ts: true,
        question: true,
        questionCategory: true,
        inputMethod: true,
        score: true,
        communicationScore: true,
        confidenceScore: true,
        wpm: true,
        feedback: true,
        prosody: true,
        deliveryMetrics: true,
        jobProfileTitle: true,
        jobProfileCompany: true,
        jobProfileRoleType: true,
      },
      orderBy: [
        { userId: "asc" },
        { ts: "desc" },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Interview Performance Coach";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("Student Summary");
    const attemptsSheet = workbook.addWorksheet("Attempt Detail");
    const pitchSheet = workbook.addWorksheet("Pitch Candidates");

    summarySheet.columns = [
      { header: "Student Name", key: "studentName", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Attempts", key: "attempts", width: 12 },
      { header: "Avg Overall", key: "avgOverall", width: 14 },
      { header: "Avg Communication", key: "avgComm", width: 18 },
      { header: "Avg Confidence", key: "avgConf", width: 16 },
      { header: "Avg WPM", key: "avgWpm", width: 12 },
      { header: "Avg Fillers/100", key: "avgFillers", width: 15 },
      { header: "Avg Monotone", key: "avgMonotone", width: 14 },
      { header: "Avg Closing", key: "avgClosing", width: 14 },
      { header: "Cohort", key: "cohort", width: 16 },
      { header: "Top Role", key: "topRole", width: 24 },
      { header: "Company", key: "company", width: 20 },
      { header: "Latest Attempt", key: "latestAttempt", width: 18 },
      { header: "Pitch Note", key: "pitchNote", width: 42 },
    ];

    attemptsSheet.columns = [
      { header: "Student Name", key: "studentName", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Attempt #", key: "attemptNumber", width: 10 },
      { header: "Date", key: "date", width: 18 },
      { header: "Score Band", key: "scoreBand", width: 16 },
      { header: "Question", key: "question", width: 48 },
      { header: "Category", key: "category", width: 18 },
      { header: "Role", key: "role", width: 22 },
      { header: "Company", key: "company", width: 18 },
      { header: "Role Type", key: "roleType", width: 18 },
      { header: "Input Method", key: "inputMethod", width: 14 },
      { header: "Overall", key: "overall", width: 12 },
      { header: "Communication", key: "communication", width: 14 },
      { header: "Confidence", key: "confidence", width: 12 },
      { header: "WPM", key: "wpm", width: 10 },
      { header: "Fillers/100", key: "fillers", width: 12 },
      { header: "Monotone", key: "monotone", width: 12 },
      { header: "Closing", key: "closing", width: 12 },
    ];

    pitchSheet.columns = [
      { header: "Student Name", key: "studentName", width: 24 },
      { header: "Email", key: "email", width: 30 },
      { header: "Attempts", key: "attempts", width: 10 },
      { header: "Cohort", key: "cohort", width: 16 },
      { header: "Top Role", key: "topRole", width: 24 },
      { header: "Company", key: "company", width: 20 },
      { header: "Avg Overall", key: "avgOverall", width: 12 },
      { header: "Avg Communication", key: "avgComm", width: 16 },
      { header: "Avg Confidence", key: "avgConf", width: 14 },
      { header: "Comm-Conf Gap", key: "commConfGap", width: 14 },
      { header: "Avg WPM", key: "avgWpm", width: 10 },
      { header: "Avg Fillers/100", key: "avgFillers", width: 14 },
      { header: "Avg Monotone", key: "avgMonotone", width: 14 },
      { header: "Avg Closing", key: "avgClosing", width: 12 },
      { header: "Reason This Student Is Useful", key: "reasoning", width: 70 },
      { header: "Step-by-Step Pitch Example", key: "pitchWalkthrough", width: 90 },
    ];

    [summarySheet, attemptsSheet, pitchSheet].forEach((sheet) => {
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    });

    summarySheet.autoFilter = { from: "A1", to: "O1" };
    attemptsSheet.autoFilter = { from: "A1", to: "R1" };
    pitchSheet.autoFilter = { from: "A1", to: "P1" };

    const pitchCandidates: Array<{
      studentName: string;
      email: string;
      attempts: number;
      cohort: string;
      topRole: string;
      company: string;
      avgOverall: number | null;
      avgComm: number | null;
      avgConf: number | null;
      commConfGap: number | null;
      avgWpm: number | null;
      avgFillers: number | null;
      avgMonotone: number | null;
      avgClosing: number | null;
      reasoning: string;
      pitchWalkthrough: string;
      score: number;
    }> = [];

    for (const user of users) {
      const userAttempts = attempts
        .filter((a) => a.userId === user.id)
        .sort((a, b) => {
          const at = a.ts ? new Date(a.ts).getTime() : 0;
          const bt = b.ts ? new Date(b.ts).getTime() : 0;
          return bt - at;
        });

      const overalls = userAttempts
        .map(getAttemptOverall)
        .filter((v): v is number => v !== null);

      const comms = userAttempts
        .map(getAttemptComm)
        .filter((v): v is number => v !== null);

      const confs = userAttempts
        .map(getAttemptConf)
        .filter((v): v is number => v !== null);

      const wpms = userAttempts
        .map((a) => num(a.wpm))
        .filter((v): v is number => v !== null);

      const fillers = userAttempts
        .map(getAttemptFillers)
        .filter((v): v is number => v !== null);

      const monotones = userAttempts
        .map(getAttemptMonotone)
        .filter((v): v is number => v !== null);

      const closings = userAttempts
        .map(getAttemptClosing)
        .filter((v): v is number => v !== null);

      const avgOverall = avg(overalls);
      const avgComm = avg(comms);
      const avgConf = avg(confs);
      const avgWpm = avg(wpms);
      const avgFillers = avg(fillers);
      const avgMonotone = avg(monotones);
      const avgClosing = avg(closings);

      const latestAttempt = userAttempts[0]?.ts ?? null;
      const topRole = userAttempts.find((a) => a.jobProfileTitle)?.jobProfileTitle ?? "";
      const topCompany = userAttempts.find((a) => a.jobProfileCompany)?.jobProfileCompany ?? "";
      const cohort = getCohort(avgOverall !== null ? Math.round(avgOverall) : null);

      let pitchNote = "";
      if (avgOverall !== null && avgOverall >= 80) {
        pitchNote = "Strong showcase student for success-story example.";
      } else if (
        avgOverall !== null &&
        avgOverall < 60 &&
        avgFillers !== null &&
        avgFillers >= 3
      ) {
        pitchNote = "Good coaching-opportunity example: low readiness + filler issue.";
      } else if (
        avgComm !== null &&
        avgConf !== null &&
        Math.abs(avgComm - avgConf) >= 1.2
      ) {
        pitchNote = "Interesting contrast between communication and confidence.";
      } else if (avgClosing !== null && avgClosing < 6.5) {
        pitchNote = "Useful example for weak closing/result impact.";
      } else {
        pitchNote = "Balanced student profile.";
      }

      summarySheet.addRow({
        studentName: user.name || (user.email ? user.email.split("@")[0] : "Student"),
        email: user.email ?? "",
        attempts: userAttempts.length,
        avgOverall: avgOverall !== null ? Math.round(avgOverall) : "",
        avgComm: avgComm !== null ? Math.round(avgComm * 10) / 10 : "",
        avgConf: avgConf !== null ? Math.round(avgConf * 10) / 10 : "",
        avgWpm: avgWpm !== null ? Math.round(avgWpm) : "",
        avgFillers: avgFillers !== null ? Math.round(avgFillers * 10) / 10 : "",
        avgMonotone: avgMonotone !== null ? Math.round(avgMonotone * 10) / 10 : "",
        avgClosing: avgClosing !== null ? Math.round(avgClosing * 10) / 10 : "",
        cohort,
        topRole,
        company: topCompany,
        latestAttempt: formatDate(latestAttempt),
        pitchNote,
      });

      userAttempts.forEach((attempt, index) => {
        const overall = getAttemptOverall(attempt);

        attemptsSheet.addRow({
          studentName: user.name || (user.email ? user.email.split("@")[0] : "Student"),
          email: user.email ?? "",
          attemptNumber: index + 1,
          date: formatDate(attempt.ts),
          scoreBand: getAttemptBand(overall),
          question: attempt.question ?? "",
          category: attempt.questionCategory ?? "",
          role: attempt.jobProfileTitle ?? "",
          company: attempt.jobProfileCompany ?? "",
          roleType: attempt.jobProfileRoleType ?? "",
          inputMethod: attempt.inputMethod ?? "",
          overall: overall ?? "",
          communication: getAttemptComm(attempt) ?? "",
          confidence: getAttemptConf(attempt) ?? "",
          wpm: num(attempt.wpm) ?? "",
          fillers: getAttemptFillers(attempt) ?? "",
          monotone: getAttemptMonotone(attempt) ?? "",
          closing: getAttemptClosing(attempt) ?? "",
        });
      });

      const commConfGap = scoreGap(avgComm, avgConf);

      const reasoning = buildPitchReasoning({
        studentName: user.name || (user.email ? user.email.split("@")[0] : "Student"),
        cohort,
        avgOverall,
        avgComm,
        avgConf,
        avgWpm,
        avgFillers,
        avgMonotone,
        avgClosing,
        attempts: userAttempts.length,
        topRole,
      });

      const pitchWalkthrough = buildPitchWalkthrough({
        studentName: user.name || (user.email ? user.email.split("@")[0] : "Student"),
        avgOverall,
        avgComm,
        avgConf,
        avgFillers,
        avgMonotone,
        avgClosing,
        topRole,
      });

      let pitchCandidateScore = 0;
      if (avgOverall !== null && avgOverall >= 80) pitchCandidateScore += 3;
      if (avgOverall !== null && avgOverall < 60) pitchCandidateScore += 3;
      if (commConfGap !== null && commConfGap >= 1.2) pitchCandidateScore += 2;
      if (avgClosing !== null && avgClosing < 6.5) pitchCandidateScore += 2;
      if (avgFillers !== null && avgFillers >= 3) pitchCandidateScore += 2;
      if (avgMonotone !== null && avgMonotone >= 6) pitchCandidateScore += 2;
      if (avgWpm !== null && (avgWpm < 105 || avgWpm > 165)) pitchCandidateScore += 1;
      if (userAttempts.length >= 6) pitchCandidateScore += 1;

      pitchCandidates.push({
        studentName: user.name || (user.email ? user.email.split("@")[0] : "Student"),
        email: user.email ?? "",
        attempts: userAttempts.length,
        cohort,
        topRole,
        company: topCompany,
        avgOverall: avgOverall !== null ? Math.round(avgOverall) : null,
        avgComm: avgComm !== null ? Math.round(avgComm * 10) / 10 : null,
avgConf: avgConf !== null ? Math.round(avgConf * 10) / 10 : null,
commConfGap: commConfGap !== null ? Math.round(commConfGap * 10) / 10 : null,
avgWpm: avgWpm !== null ? Math.round(avgWpm) : null,
avgFillers: avgFillers !== null ? Math.round(avgFillers * 10) / 10 : null,
avgMonotone: avgMonotone !== null ? Math.round(avgMonotone * 10) / 10 : null,
avgClosing: avgClosing !== null ? Math.round(avgClosing * 10) / 10 : null,
        reasoning,
        pitchWalkthrough,
        score: pitchCandidateScore,
      });
    }

    pitchCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .forEach((row) => {
        pitchSheet.addRow({
          studentName: row.studentName,
          email: row.email,
          attempts: row.attempts,
          cohort: row.cohort,
          topRole: row.topRole,
          company: row.company,
          avgOverall: row.avgOverall ?? "",
          avgComm: row.avgComm ?? "",
          avgConf: row.avgConf ?? "",
          commConfGap: row.commConfGap ?? "",
          avgWpm: row.avgWpm ?? "",
          avgFillers: row.avgFillers ?? "",
          avgMonotone: row.avgMonotone ?? "",
          avgClosing: row.avgClosing ?? "",
          reasoning: row.reasoning,
          pitchWalkthrough: row.pitchWalkthrough,
        });
      });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="ipc-student-export.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "EXPORT_FAILED",
        message: error?.message ?? "Unknown export error",
      },
      { status: 500 }
    );
  }
}