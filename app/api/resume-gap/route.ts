import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resume, jobDescription } = await req.json();
  if (!resume || !resume.trim()) return NextResponse.json({ error: "Resume text required" }, { status: 400 });

  const hasJD = jobDescription && jobDescription.trim().length > 50;

  const prompt = `You are a senior career coach and hiring manager with 15+ years of recruiting experience. Analyze the following resume${hasJD ? " against the provided job description" : ""}.

RESUME:
${resume.trim()}

${hasJD ? `JOB DESCRIPTION:\n${jobDescription.trim()}\n` : ""}

Return a JSON object with exactly this structure:
{
  "overallScore": <number 0-100>,
  "overallLabel": <"Strong" | "Good" | "Needs Work" | "Significant Gaps">,
  "summary": <2-3 sentence plain-English summary of the resume's overall strength>,
  "strengths": [<up to 4 specific strengths, each 1 sentence>],
  "gaps": [
    {
      "category": <"Experience" | "Skills" | "Quantification" | "Keywords" | "Format" | "Education" | "Relevance">,
      "issue": <1 sentence describing the gap>,
      "fix": <1-2 sentence actionable fix>
    }
  ],
  "keywordsMissing": [<up to 8 important keywords/skills from the JD that are absent from resume, or general industry keywords if no JD>],
  "keywordsPresent": [<up to 6 strong keywords already in the resume>],
  "atsScore": <number 0-100, how well this resume would pass ATS screening${hasJD ? " for this specific JD" : ""}>,
  "topAction": <single most impactful 1-sentence change the candidate should make right now>
}

Be specific and actionable. Reference actual content from the resume. Return only valid JSON, no markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error("resume-gap error", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
