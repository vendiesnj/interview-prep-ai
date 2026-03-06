import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { jobDesc } = await req.json();

    if (!jobDesc || typeof jobDesc !== "string" || jobDesc.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Job description too short." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an interview coach. Based on the job description below, generate interview questions in 3 buckets.

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "behavioral": string[],      // exactly 5
  "technical": string[],       // exactly 5
  "role_specific": string[]    // exactly 5
}

Rules:
- behavioral = transferable STAR-style questions that a candidate could answer from school, internships, part-time work, volunteering, clubs, or projects.
- technical = skill/process/tool/functional questions directly tied to the job.
- role_specific = questions specific to succeeding in this exact role, team context, stakeholder environment, business problems, or responsibilities.
- Do NOT return "culture".
- Keep every question concise, professional, and interview-ready.
- Avoid duplicates.
- Every question must be a single string.

BEHAVIORAL GENERALIZER (IMPORTANT):
- Behavioral questions must be role-relevant but candidate-agnostic.
- Do NOT assume prior experience in this exact job, industry, company size, or specific tools.
- Questions must be answerable using transferable experiences (school, internships, part-time work, volunteering, clubs, personal projects).
- Avoid niche acronyms/tools unless explicitly mentioned in the job description.
- Each behavioral question should naturally prompt a STAR answer and ask for an outcome (metric if available; otherwise a reasonable estimate).

JOB DESCRIPTION:
${jobDesc}
`.trim();


    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = resp.output_text?.trim() ?? "";

    let buckets: { behavioral: string[]; technical: string[]; role_specific: string[] } = {
  behavioral: [],
  technical: [],
  role_specific: [],
};

try {
  const parsed = JSON.parse(text);

  if (parsed && typeof parsed === "object") {
    const b = Array.isArray((parsed as any).behavioral)
      ? (parsed as any).behavioral.map(String)
      : [];

    const t = Array.isArray((parsed as any).technical)
      ? (parsed as any).technical.map(String)
      : [];

    const r = Array.isArray((parsed as any).role_specific)
      ? (parsed as any).role_specific.map(String)
      : [];

    buckets = {
      behavioral: b.slice(0, 5),
      technical: t.slice(0, 5),
      role_specific: r.slice(0, 5),
    };
  }
} catch {
  // Fallback: split lines into a single flat list, then bucket by position
  const flat = text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[\).\s-]*/, "").trim())
    .filter(Boolean)
    .slice(0, 15);

  buckets = {
    behavioral: flat.slice(0, 5),
    technical: flat.slice(5, 10),
    role_specific: flat.slice(10, 15),
  };
}

const questions = [
  ...buckets.behavioral,
  ...buckets.technical,
  ...buckets.role_specific,
];

return new Response(JSON.stringify({ buckets, questions }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});

    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
