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
- role_specific must not be empty.
- If unsure, still generate 5 role_specific questions based on the job’s responsibilities, stakeholders, and success profile.
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

function cleanQuestions(arr: unknown, limit = 5): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x).trim())
    .filter(Boolean)
    .filter((q) => q.length >= 8)
    .slice(0, limit);
}

function uniqueQuestions(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const q of arr) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }

  return out;
}

try {
  const parsed = JSON.parse(text);

  if (parsed && typeof parsed === "object") {
    buckets = {
      behavioral: cleanQuestions((parsed as any).behavioral, 5),
      technical: cleanQuestions((parsed as any).technical, 5),
      role_specific: cleanQuestions((parsed as any).role_specific, 5),
    };
  }
} catch {
  const flat = text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[\).\s-]*/, "").trim())
    .filter(Boolean);

  buckets = {
    behavioral: flat.slice(0, 5),
    technical: flat.slice(5, 10),
    role_specific: flat.slice(10, 15),
  };
}

// de-dupe within each bucket
buckets = {
  behavioral: uniqueQuestions(buckets.behavioral).slice(0, 5),
  technical: uniqueQuestions(buckets.technical).slice(0, 5),
  role_specific: uniqueQuestions(buckets.role_specific).slice(0, 5),
};

// emergency repair: if role_specific came back empty or too short,
// fill it with overflow questions that are not already used
if (buckets.role_specific.length < 5) {
  const used = new Set(
    [...buckets.behavioral, ...buckets.technical, ...buckets.role_specific].map((q) =>
      q.toLowerCase()
    )
  );

  const extras = text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[\).\s-]*/, "").trim())
    .filter(Boolean)
    .filter((q) => q.length >= 8)
    .filter((q) => !used.has(q.toLowerCase()));

  buckets.role_specific = [...buckets.role_specific, ...extras].slice(0, 5);
}

const questions = [
  ...buckets.behavioral,
  ...buckets.technical,
  ...buckets.role_specific,
];

console.log("QUESTION_BUCKETS:", buckets);
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
