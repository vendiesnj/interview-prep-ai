export interface Article {
  slug: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  date: string;
  readTime: string;
  content: string;
}

export const articles: Article[] = [
  {
    slug: "will-ai-take-my-job",
    title: "Will AI Take Your Job? The Honest Answer Is More Complicated Than You've Been Told",
    description:
      "The question everyone is asking right now. Here's what the actual research shows, which jobs are most exposed, and what makes people genuinely harder to replace.",
    tag: "Career & AI",
    tagColor: "#8B5CF6",
    date: "May 4, 2026",
    readTime: "6 min read",
    content: `
The question isn't paranoid. Real jobs are disappearing. The more useful question is which ones, on what timeline, and what you can do about it.

The short version: AI is better at eliminating tasks than eliminating jobs. But tasks make up jobs, and when enough tasks get automated, the headcount math changes. That's already happening in certain roles and it's going to keep happening.

## Where the Exposure Is Highest

The roles most at risk share a few characteristics. The outputs are well-defined. The inputs are largely digital. The work is repetitive across cases. And the judgment required is narrow enough that a well-prompted model can replicate it.

Data entry, basic research and summarization, first-draft writing, routine customer support, simple code review, and templated financial analysis all fall into this category. These aren't bad jobs. But the volume of humans needed to do them is contracting.

The roles that are harder to automate share a different profile. The inputs are messy and human. The judgment calls depend on context that isn't in any document. The work requires building trust with real people in real time. And the consequences of being wrong are high enough that someone accountable needs to own the outcome.

Senior strategy work, complex sales, clinical judgment, skilled trades, therapy, and leadership all fit here. Not because AI can't generate output in these areas. It can. But because the value isn't just in the output. It's in the person who produced it taking responsibility for it.

## The Part Most Predictions Miss

Most AI job displacement conversations focus on what models can generate. They underestimate what organizations are willing to trust a model to decide.

There's a large category of work where AI can produce a draft, a plan, or an analysis that's 80% of the way there. But the 20% that remains requires someone who understands the politics of the room, the history of the relationship, or the regulatory risk that isn't in any training dataset. That person still has a job. Their job just looks different now.

## What You Can Actually Do

Two things are genuinely useful here.

The first is becoming the person on your team who uses the tools well. The people who get cut in AI-driven restructuring are usually the ones who resisted the tools. The ones who get promoted or reassigned are the ones who figured out how to multiply their output using them.

The second is strengthening the skills that are harder to replicate. Judgment under ambiguity. Communication that moves people. The ability to synthesize information from conflicting sources and make a call. These capabilities have always mattered. They matter more now because they're increasingly what's left after automation takes everything else.

Being able to articulate your professional value clearly and specifically is one of those skills. If you can't explain what you do and why it matters in a way that lands with someone who doesn't already know your work, that's a liability that compounds as hiring gets more competitive.
    `,
  },
  {
    slug: "how-to-explain-layoff-in-interview",
    title: "How to Explain a Layoff in an Interview Without It Becoming the Whole Story",
    description:
      "Layoffs are common enough now that most interviewers won't hold one against you. What they're evaluating is how you handle it. Here's the structure that works.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "May 2, 2026",
    readTime: "5 min read",
    content: `
Mass layoffs have been consistent enough over the past few years that most interviewers have either been through one or know people who have. The stigma around being laid off has dropped significantly. What hasn't changed is how much interviewers learn from watching how you talk about it.

## What the Interviewer Is Actually Evaluating

They're not trying to figure out if you were laid off because you were bad at your job. They're watching for three things.

**Composure.** Can you talk about something difficult without becoming defensive, bitter, or visibly uncomfortable? Losing a job is stressful. That's understood. But if the topic derails you, it raises questions about how you handle harder conversations.

**Honesty.** Does the explanation make sense? Large-scale layoffs are easy to verify and the details usually check out. Vague or evasive answers about a small company's layoff are more likely to be questioned.

**Forward momentum.** What have you done with the time since? Candidates who treated the gap purposefully, whether through skill development, freelance work, caregiving, or a genuine search with thought behind it, come across differently from candidates who clearly just waited.

## The Structure That Works

The answer to "what happened at your last role?" should take about 30 to 45 seconds.

**The factual sentence.** One sentence describing what happened without editorializing. "The company did a company-wide reduction that affected my department" or "The role was eliminated as part of a restructuring." Keep it clean and don't over-explain.

**What you did with the time.** One or two sentences. "I used the first few weeks to decompress and then started a structured search. I've also been doing some consulting work and completed a certification in X." If you've been doing Signal sessions to sharpen your interview skills, that counts too.

**What you're looking for.** One sentence that pivots the conversation forward. "I'm specifically targeting roles where I can do X, which is why this opportunity stood out."

## What to Avoid

Do not apologize for being laid off. You don't owe anyone an apology for a business decision that was made above your level.

Do not trash the company, the leadership, or the decision-making that led to it. Even if the layoff was handled badly and the criticism would be fair, this is not the place. It raises questions about how you'll talk about the new employer if things go wrong.

Do not spend more than a minute on it. Once you've given the factual summary and pivoted to where you are now, move on. Candidates who over-explain tend to seem like they're working to convince the interviewer of something. That creates doubt where there wasn't any.

## When There's a Longer Gap

If significant time has passed since the layoff, the interviewer will want more context. The same principles apply, but you'll need to give more detail on how you spent the time. Be specific. Vague answers about "exploring options" sound like you're covering something up, even when you're not.

A gap with specific activities, a project you took on, a skill you developed, a family situation you were managing, is a gap you can explain. A gap with no accounting is harder to defend.
    `,
  },
  {
    slug: "what-to-do-when-laid-off",
    title: "What to Actually Do in the First 30 Days After a Layoff",
    description:
      "The first month after losing a job is where most people either set themselves up for a solid search or create problems they'll deal with for months. Here's what matters and in what order.",
    tag: "Job Search",
    tagColor: "#10B981",
    date: "April 28, 2026",
    readTime: "6 min read",
    content: `
The day you're laid off is a bad day. That's allowed. Give yourself a few days to process it before you try to be productive about it. Then get organized, because what you do in the first month sets the shape of the entire search.

## The Logistics That Have Hard Deadlines

Some things need to happen fast because there are deadlines attached to them.

**File for unemployment immediately.** Many states have a waiting period before benefits begin, and the clock starts when you file. There's no benefit to waiting. File the day you're laid off or the next business day.

**Understand your COBRA window.** You typically have 60 days from your coverage loss date to elect COBRA continuation coverage. Missing that window means losing the option. COBRA is expensive, but it's your existing coverage with no new enrollment paperwork. Compare it against marketplace plans before deciding.

**Clarify your severance terms.** If you received a severance agreement, read it carefully before signing. Most include a release of claims against the employer. Some have non-disparagement clauses. A few restrict your ability to take jobs at competitors. If the agreement has a signing deadline, you usually have at least 21 days. Use them.

## The Financial Picture

Before you start applying anywhere, figure out your actual runway. How much do you have in liquid savings, and what does your monthly burn rate look like?

Most people estimate this and get it wrong by 15 to 25 percent because they forget irregular expenses: annual subscriptions, car maintenance, medical bills, the seasonal stuff. Signal's <a href="/career-guide/budget" style="color:#34D399;text-decoration:underline;text-underline-offset:3px">budget calculator</a> walks you through the full picture in about five minutes.

Knowing your runway changes how you search. If you have four months of savings, you can be selective. If you have six weeks, you need a different strategy.

## What to Update Before You Start Applying

Your resume and your LinkedIn profile should reflect your most recent role before you send a single application. Applying with an outdated profile is a waste of the application and the attention it might have gotten.

Update your experience bullets with specific outcomes. Refresh your LinkedIn headline. Set your Open to Work status to Recruiters Only if you're not comfortable with the public banner.

Practice talking about your work out loud. The gap between how you describe your professional value in writing and how you describe it in a conversation is usually larger than people expect. Most people sound less sharp on their feet than they do on paper, and interviews are on your feet.

## How Long It's Going to Take

The median job search in the current market runs three to six months for most professional roles. That range is wider for senior positions and specialized functions. Planning for a four-month search and finishing in two is a good outcome. Planning for a six-week search and finishing in four months creates financial and psychological pressure that makes the search worse.

Set a realistic timeline based on your runway, adjust your spending to extend that runway if needed, and then focus on doing the search well rather than doing it fast.

## The Part People Skip

Tell people. The majority of jobs, especially jobs that aren't posted publicly, get filled through someone knowing someone. Your former colleagues, your school network, and your industry connections are all potential paths to introductions.

You don't have to send a mass announcement. A direct message to ten or fifteen people you have real relationships with, something simple like "I was recently laid off and I'm starting to explore what's next. I'd love to catch up if you have 20 minutes," is enough. Most people are willing to help and many will forward your name somewhere useful.
    `,
  },
  {
    slug: "skills-ai-cannot-replace",
    title: "The Skills That Still Matter When AI Can Do Most of the Grunt Work",
    description:
      "AI is good at producing outputs. It's not good at knowing which outputs matter, getting others to act on them, or taking responsibility for the outcome. Here's where human value is concentrating.",
    tag: "Career & AI",
    tagColor: "#8B5CF6",
    date: "April 20, 2026",
    readTime: "5 min read",
    content: `
Here's what AI is good at: producing a first draft, summarizing a document, generating options, writing code that does what you described. The throughput is fast and the quality floor is higher than it used to be.

Here's what it's not good at: knowing which problem to solve, reading the room, making the call when the data is incomplete, and taking responsibility for the answer.

That distinction is where professional value is concentrating.

## Judgment in Ambiguous Situations

AI systems are good at answering well-defined questions. When the question itself is unclear, or when the right answer depends on context that isn't in any prompt, the model's output is a starting point, not a decision.

The ability to operate confidently in ambiguous situations, to make a call with incomplete information and own it, is something organizations will pay for indefinitely. It's also something you can only develop by making calls and watching what happens. No amount of information consumption builds it. Experience does.

## Communication That Changes What People Do

Generating a report and getting people to act on it are different skills. AI can write the report. Getting someone skeptical to change their mind, getting a senior leader to prioritize something they've been ignoring, getting a cross-functional team to align on a direction they didn't agree on at the start. Those require something different.

The ability to communicate in a way that actually moves people is durable precisely because it depends on the human reading the room in real time, adjusting based on what they're hearing, and building credibility that accumulates over interactions. These are capabilities that don't transfer between people, let alone to a model.

This is also why being able to speak clearly about your own professional value matters more now than it did five years ago. Job markets are more competitive. Interviews are higher-stakes. Candidates who can articulate what they've done, why it mattered, and what they'd bring to the next role in concrete and specific terms have a measurable advantage over candidates who can't.

## Building and Keeping Trust

A lot of high-value work runs on relationships. Not networking in the abstract sense. Specific relationships with people who know you, know your judgment, and are willing to send something your way or go to bat for you.

Trust is slow to build and hard to transfer. The person who has built real credibility with a client, a leadership team, or a set of institutional partners has something that can't be replicated from a prompt.

## The Practical Takeaway

The honest version of career resilience right now looks like two things happening in parallel.

One is learning to use the tools well. People who figure out how to get 10x the output using AI systems are harder to cut than people who produce the same output they always did.

The other is doubling down on the skills that are hardest to automate. Verbal communication. Judgment. Trust. The ability to operate when the situation is unclear and the stakes are real.

Both of these require practice in conditions that approximate the real thing. Reading about communication doesn't build communication skill. Practicing it under pressure, getting feedback, and adjusting does.
    `,
  },
  {
    slug: "tell-me-about-yourself-interview-answer",
    title: "How to Answer 'Tell Me About Yourself' Without Rambling",
    description:
      "This question opens almost every interview, and most people answer it worse than any other question. Here's a structure that works and a common mistake that kills the opener.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "May 3, 2026",
    readTime: "5 min read",
    content: `
"Tell me about yourself" is the most predictable question in every interview. It's also the one most people answer worst.

The two failure modes show up constantly. The first is the resume recitation: candidates start in college, work chronologically through every job, and end somewhere around their current role five minutes later. The interviewer already has the resume. Reading it back does not tell them anything new.

The second failure is the vague overview: "I'm a people person who loves solving problems and working collaboratively across teams." That sentence contains no information.

## A Structure That Actually Works

The strongest "tell me about yourself" answers follow a present, past, future shape.

**Present:** What are you doing right now, and what's the headline of your role or focus? One or two sentences. If you're currently employed, what's the most relevant thing about your current work?

**Past:** What's the through-line of your background that explains why you're good at what you do now? This isn't every job. It's the two or three experiences that built the skills most relevant to this conversation.

**Future:** What are you looking for, and why does this role fit that? This is where you connect your answer to the specific opportunity. It should be brief and direct.

The whole thing should take 60 to 90 seconds. If you're going past two minutes, you've included too much.

## What to Cut

Cut the origin story. Starting with "I've always been passionate about..." tells the interviewer about your childhood, not your professional value.

Cut the apology openings. "So, where do I even begin..." is filler. Start with your present role.

Cut the adjectives about yourself. Words like "driven," "results-oriented," and "team player" don't land without evidence. Replace every adjective with a concrete example or just leave it out.

## What a Strong Opener Does

A good answer to this question does three things. It tells the interviewer something they couldn't get from scanning the resume. It connects your background to this specific role. And it signals that you communicate clearly and don't waste their time.

That last one matters more than people realize. Interviewers form impressions in the first two minutes. A tight, direct opener signals confidence and preparation. A meandering one raises questions that the rest of the interview has to work to undo.

Practice this one out loud at least ten times before any interview. Record yourself. If you hear any filler words or long pauses in the first 30 seconds, that's the thing to fix first.
    `,
  },
  {
    slug: "greatest-weakness-interview-answer",
    title: "How to Answer 'What's Your Greatest Weakness?' and Actually Sound Credible",
    description:
      "The fake weakness answer is one of the most recognized interview clichés in existence. Here's what a genuine, smart answer looks like and why it works better than what most candidates say.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 30, 2026",
    readTime: "4 min read",
    content: `
"I'm a perfectionist." "I work too hard." "I care too much about doing a good job."

Interviewers have heard these answers thousands of times. Every recruiter knows what they are: a tactic to avoid the question while appearing to answer it. And every time a candidate uses one, something happens that they don't intend. The interviewer notes that this person won't give a real answer under mild pressure.

That observation follows you through the rest of the interview.

## Why the Question Exists

The weakness question isn't a trap designed to catch you admitting something disqualifying. It's a test of self-awareness and honesty.

Interviewers know you have weaknesses. Everyone does. What they're trying to find out is whether you know what yours are, whether you're working on them, and whether you're honest when the stakes are low. Candidates who can't answer this question honestly raise a flag: if they can't be direct about something this benign, how will they handle harder conversations on the job?

## What a Real Answer Looks Like

Pick a genuine weakness that meets two criteria: it's real and observable, and it's not central to the core requirements of the role you're applying for.

Then structure your answer in three parts:

**Name it clearly.** "I have a tendency to over-communicate on projects I'm worried about. I'll check in more than necessary, which can slow things down and signals a lack of trust in the team."

**Show what you've done about it.** "I started using shared project trackers so the status is always visible without me asking for it. It's reduced the check-in frequency significantly."

**Acknowledge where you still are.** "I still catch myself reaching for Slack sometimes when I should wait. I'm aware of it and I'm getting better, but it's not fully resolved."

That's an honest answer. It names a real pattern, shows self-awareness, and demonstrates that you've taken initiative to address it.

## The Category of Weakness That Works Best

Weaknesses related to process, communication style, or working habits tend to land well. Weaknesses related to core technical skills for the job tend to raise concerns. And weaknesses that are transparently strategic, like perfectionism, just make the interviewer trust you less.

The goal is to demonstrate that you know yourself. A candidate who says "I have trouble delegating when I'm under pressure" and then explains exactly how they've handled that tells an interviewer much more about their character than a candidate who claims their only flaw is caring too deeply about outcomes.
    `,
  },
  {
    slug: "why-do-you-want-to-work-here-answer",
    title: "How to Answer 'Why Do You Want to Work Here?' Without Sounding Like You Read the Website",
    description:
      "The version of this answer that fails is a summary of the company About page. The version that works shows you actually thought about the role. Here's the difference.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 22, 2026",
    readTime: "4 min read",
    content: `
There's a version of this answer that shows up in almost every interview. It goes something like: "I've been really impressed by your company's mission and the culture here. I love that you're focused on innovation and I think this would be a great place to grow."

That answer contains nothing specific to the company. It could be given to any employer in any industry and it would be equally true, which means it's equally meaningless.

Interviewers hear it constantly. It tells them you did not spend serious time thinking about the role.

## What the Question Is Actually Asking

The question has two parts, even though it sounds like one. Why this company? And why this role?

Most candidates answer only the first part, and even then, they answer it with information that took them thirty seconds to find. Mission statements and culture pages are public. Citing them doesn't signal genuine research.

## How to Actually Research

Before your interview, go further than the company website.

Look at what the company has shipped or announced in the last six months. If it's a public company, read the most recent earnings call transcript. Search for the hiring manager on LinkedIn and read what they've posted or written. If there are employee reviews on Glassdoor, look for patterns across reviews, specifically what kinds of people seem to thrive there.

Look at the job description itself with fresh eyes. The skills they list, the problems they describe, the type of scope they're offering. What specifically about this role is different from similar roles at other companies?

## Building the Answer

A strong answer has three components.

**Something specific about the company that you found through real research.** A product decision that impressed you. A strategic shift that makes sense given the market. A piece of writing from someone on the leadership team that resonated.

**Something specific about the role.** What about the scope or the problem set draws you in? Be concrete.

**A connection between both of those things and your background.** Why are you the right person for this specific opportunity, not just someone looking for a job?

The whole answer should be 60 to 90 seconds. The goal is to communicate that you made a genuine choice to pursue this company and this role. That specificity is rare enough in interviews that it stands out immediately.

## One More Thing

If you genuinely can't answer this question with specifics after researching the company, that's worth paying attention to. Sometimes the honest answer is that you're applying broadly and this company isn't particularly differentiated for you. That's okay as a job search strategy, but it's worth knowing before the interview so you can decide how to handle the question with integrity.
    `,
  },
  {
    slug: "how-to-follow-up-after-interview",
    title: "How to Follow Up After an Interview Without Being Annoying",
    description:
      "Most advice on following up is either too passive or too aggressive. Here's the actual timeline, what to say, and when to accept that you have your answer.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "April 15, 2026",
    readTime: "4 min read",
    content: `
The thank-you email after an interview is the most universally recommended piece of job search advice and also the most misunderstood. Most candidates treat it as a courtesy. The ones who use it well treat it as a second chance to land a point.

## The Thank-You Email

Send it the same day, within a few hours of the interview ending. If you interviewed with multiple people, send individual emails to each of them.

The mistake most candidates make is writing a generic note: "Thank you for your time today. I really enjoyed learning about the role and the team."

That version does nothing. It confirms that you know how to type but doesn't add any information.

A better structure:

Open by naming one specific thing from the conversation that you found compelling or that changed how you think about the role. If the interviewer mentioned a challenge the team is working through, you can reference it. If they described something about the culture that resonated, name it specifically.

Then restate one thing from the conversation that made you more confident this is the right fit, from your perspective.

Close with something brief and direct. "I'm genuinely excited about this and I'm looking forward to next steps."

The whole email should be four to six sentences. If it's longer, cut it.

## If They Gave You a Timeline

If the interviewer told you they'd be back to you by a certain date and that date has passed, you can follow up once.

Keep it short: "Hi [Name], I wanted to follow up on our conversation from [date]. I'm still very interested in the role and happy to answer any additional questions. Looking forward to hearing from you."

Send that one. Then wait. If another week passes with no response, you can send one more. After two follow-ups with no reply, you have your answer. Companies that go dark on candidates after an interview are communicating something about how they operate.

## What Not to Do

Don't apologize for following up. "I'm sorry to bother you, but..." weakens your message before the interviewer has even read it. You're not bothering them. You're a candidate they're evaluating.

Don't follow up through every possible channel. One email is right. Adding a LinkedIn message, a call to the front desk, and another email three days later is not persistence, it's pressure.

Don't make your follow-up about your timeline. "I have another offer and need to know by Friday" may be true, but leading with it puts the company in an adversarial position. If you have a competing offer, you can mention it once in a calm, factual way. Make it a data point, not an ultimatum.

## Reading the Silence

Most candidates treat a delayed response as a bad sign. Sometimes it is. More often, it just means the hiring process is slower than the company expected, someone is out sick, or a decision-maker is traveling.

What you can control is the quality of your follow-up and the professionalism of your presence throughout the process. What you can't control is their timeline. Following up twice is appropriate. Beyond that, put your energy toward the next opportunity.
    `,
  },
  {
    slug: "linkedin-profile-tips-job-search",
    title: "Your LinkedIn Profile Is Probably Hurting Your Job Search",
    description:
      "Recruiters check LinkedIn before they read your resume. Most profiles fail at the exact things recruiters are looking for. Here's what to fix and why it matters.",
    tag: "Resume & Job Search",
    tagColor: "#F59E0B",
    date: "April 12, 2026",
    readTime: "5 min read",
    content: `
Most job seekers treat LinkedIn as a place to park their resume. They upload their work history, connect with former colleagues, and leave it alone until they need it.

Recruiters see this. The profiles that get messages are the ones that look active and specific. Here's what actually moves the needle.

## The Headline

The default headline LinkedIn creates is your current job title and company. That's the bare minimum and it's what the majority of profiles show.

A stronger headline uses the same character limit to communicate more: your specialty, the kind of problems you solve, or the type of work you do best. You're not rewriting your title. You're giving someone who hasn't met you a reason to click.

For someone in operations: "Operations Manager" is fine. "Operations Manager focused on process efficiency and supply chain cost reduction" tells a recruiter in five seconds whether to keep reading.

## The About Section

Only the first two or three lines of the About section show before someone clicks "see more." Most people write their About section as a paragraph about their career journey. By the time they've gotten to something interesting, the recruiter has moved on.

Write the first sentence of your About section as if it's a headline. What's the thing you most want someone to know about your professional value? Start there.

Then use the rest of the section to back it up with two or three specific examples: industries you've worked in, problems you've solved, or outcomes you've produced. Keep it to three or four short paragraphs. Long About sections rarely get read.

## Experience Bullets

The same rules that apply to resume bullets apply here, with one difference: LinkedIn is slightly more conversational, so you have more room to explain context.

But the core failure is the same on both. Vague claims with no outcomes. "Managed a team of analysts" is not interesting. "Managed a team of six analysts, reduced report delivery time from three days to same-day, and reduced error rates by building a shared QA checklist" is a profile that gets sent to a hiring manager.

Every job in your recent history should have at least two or three bullets with a concrete outcome. If you can't remember the outcome, look at your old performance reviews. If you genuinely don't have numbers, describe a before-and-after state.

## Open to Work

If you're actively searching and you're not worried about your current employer finding out, turn on the "Open to Work" green banner. Recruiters filter by this. The social awkwardness of the banner is less expensive than being invisible in searches.

If you want to signal availability without the banner, set your Open to Work status to "Recruiters only" in the privacy settings. You won't get the banner, but you'll appear in recruiter searches.

## Skills and Recommendations

The Skills section matters for search ranking. Add the ten to fifteen skills most relevant to the roles you're targeting. Ask two or three people you've worked with for a specific recommendation, meaning a recommendation that names a project or outcome, not a general character reference.

"Great to work with, highly recommend" helps no one. "Led the implementation of our new procurement system and reduced vendor onboarding time by 40%" helps everyone reading your profile.

## Activity

Recruiters look at how active a profile is. Liking posts occasionally is enough to signal that the account is real. If you're comfortable writing, a short post about something you've learned or worked on in your field reaches people you're not connected to and surfaces your profile in ways that passive activity doesn't.

You don't need a content strategy. You need to exist on the platform in a way that signals engagement.
    `,
  },
  {
    slug: "star-method-interview-answers",
    title: "The STAR Method Actually Works, But Not the Way Most People Use It",
    description:
      "Most candidates know the STAR framework. Almost none of them use it right. Here's the specific failure pattern that tanks otherwise strong answers, and how to fix it before your next interview.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 10, 2026",
    readTime: "6 min read",
    content: `
The STAR method (Situation, Task, Action, Result) is the most widely known interview framework in the world. Career coaches teach it. University career centers put it on every handout. And yet, most candidates who try to use it still walk out of interviews with weak answers.

The problem isn't the framework. It's a single, consistent failure that shows up in almost every response: **candidates spend too much time on Situation and Task, and not enough on Action and Result.**

## Why This Happens

When you're nervous and trying to sound credible, you over-explain context. You set the scene in too much detail because it feels like you're building a case. You describe the team, the company background, the timeline, the problem history. By the time you get to what *you* actually did, you've used two-thirds of your time.

Interviewers don't need the full context. They need to see your judgment, your ownership, and your impact.

## The 10/20/60/10 Rule

A strong STAR answer typically allocates time like this:

- **Situation**: 10%. One or two sentences max. Enough to ground the story.
- **Task**: 20%. What you were specifically responsible for, and why it mattered.
- **Action**: 60%. This is your answer. What decisions you made. What you did that someone else might not have. What trade-offs you navigated.
- **Result**: 10%. A concrete outcome. A number, a state change, or a clear impact.

Most candidates flip this. They spend 40-50% on Situation and Task and rush the part that actually differentiates them.

## What "Strong Action" Actually Sounds Like

Weak action language:
"I worked with the team to figure out the best approach."

Strong action language:
"I made the call to cut two features from the sprint, pushed back on the product timeline, and ran the team standup myself while the lead was out. That decision let us ship on time with the core feature intact."

The difference: ownership, specificity, and a decision that had a cost.

## How to Practice This

Record yourself answering a behavioral question. When you play it back, mark the timestamps where you transition between S, T, A, and R. If you're past the 30% mark before you start describing your actions, your Situation and Task are too long.

Signal scores this automatically. Narrative Clarity, Ownership and Agency, and Response Control all correlate directly with STAR structure quality.
    `,
  },
  {
    slug: "communication-archetypes-interview",
    title: "The 15 Communication Archetypes: Which One Are You?",
    description:
      "Every candidate has a pattern in how they communicate under pressure. Knowing your archetype is the fastest shortcut to fixing the exact thing that's holding your scores back.",
    tag: "Communication",
    tagColor: "#8B5CF6",
    date: "April 7, 2026",
    readTime: "8 min read",
    content: `
After analyzing thousands of interview practice sessions, a clear pattern emerges: most candidates don't have one big weakness. They have one consistent *communication pattern* that shows up in slightly different forms across every answer they give.

We call these patterns delivery archetypes.

## What Is a Communication Archetype?

A delivery archetype is the most consistent behavioral signal in how you communicate in high-stakes settings. It's not about intelligence, preparation, or experience. It's about how your communication style lands with the person on the other side of the table.

Here are five of the most common archetypes.

---

### The Hedger

**What it sounds like:** "I think I probably helped the team figure out a kind of better way to handle it."

**What interviewers hear:** "A well-prepared candidate who doesn't seem to believe their own story."

**The fix:** Audit your answers for hedge phrases. Watch for: I think, I feel like, kind of, sort of, maybe, probably. Every one of these softens your claim. Replace "I helped" with "I drove." Replace "we kind of restructured" with "I restructured."

---

### The Narrator

**What it sounds like:** "So what happened was, the company had been dealing with this problem for a while, and basically the situation was that the team was trying to figure out..."

**What interviewers hear:** "They're telling me a story, not demonstrating judgment."

**The fix:** Start every answer with the action or the decision, then give context. Not "the situation was" but instead: "I made the call to rebuild the process from scratch. Here's why."

---

### The Creditor

**What it sounds like:** "We worked together as a team... the whole group really pulled it off... it was a collaborative effort."

**What interviewers hear:** "I can't tell what this person actually did."

**The fix:** Interviewers know you didn't do everything alone. But they're trying to evaluate *you*, not your team. Use "I" for what you personally owned. Use "we" only when describing outcomes.

---

### The Qualifier

**What it sounds like:** "This may not be the best example, but... I don't know if this is exactly what you're looking for, but..."

**What interviewers hear:** "This candidate doesn't trust their own experience."

**The fix:** Never apologize for your example before you give it. If it's the example you're going with, commit to it.

---

### The Anchor

**What it sounds like:** Clear, direct, structured. A strong opener, a clean action sequence, a stated outcome.

**What interviewers hear:** "This person knows what they did, why they did it, and what it produced."

**The fix:** You're already there. Focus on sustaining it across longer answers where most people drift.

---

## How to Find Yours

Record three answers to behavioral questions. Don't listen for *what* you said. Listen for the *pattern* in how you said it. Most people can hear their archetype within the first two answers once they know what to look for.

Signal identifies your archetype automatically after enough sessions, with targeted coaching notes on which specific language patterns are driving it and what to change.
    `,
  },
  {
    slug: "vocal-delivery-interview-tips",
    title: "Your Voice Is Failing You in Interviews: Here's the Data",
    description:
      "Flat delivery, filler density, and narrow pitch range are measurable and fixable. Most candidates have no idea these signals exist. Here's what the acoustic analysis actually shows.",
    tag: "Vocal Delivery",
    tagColor: "#0EA5E9",
    date: "April 3, 2026",
    readTime: "5 min read",
    content: `
Most interview coaching focuses on what you say. Almost none of it addresses how your voice is actually landing.

That's a problem, because interviewers are forming impressions about your confidence, competence, and enthusiasm from your vocal delivery long before your words register.

## The Four Signals That Matter Most

### 1. Filler Density

Fillers (um, uh, like, you know, kind of, basically) are normal in conversation. They become a problem when they appear at a rate above 4-5 per 100 words, or when they appear in high-stakes moments like answer openers or result statements.

A filler at the beginning of a sentence signals that you're buying time. An interviewer reads this as uncertainty.

**Baseline:** Aim for under 3 fillers per 100 words on structured answers.

### 2. Pitch Range

Pitch range, measured in Hz, is the difference between your lowest and highest note across an answer. A narrow pitch range (often called "flat delivery") makes everything sound equally important, which means nothing lands.

**What interviewers hear with flat delivery:** "Smart candidate, but hard to stay engaged with."

**What to do:** Pick the single most important sentence in each answer, usually your result or your decision, and say it with more energy. You don't need to be dramatic. You need contrast.

### 3. Speaking Pace

The ideal interview pace is 130-160 WPM. Faster than that and you sound rushed or anxious. Slower than 120 and you start to lose the interviewer's attention.

Most nervous candidates speak *faster* than normal, not slower. This is the opposite of what it feels like in the moment.

**What to do:** Record yourself. Most people are surprised how fast they actually talk under pressure.

### 4. Amplitude Variation

Amplitude variation measures how much your volume changes across an answer. Low amplitude variation (monotone volume) reduces perceived energy and enthusiasm.

The fix here is simple: key points should be louder. Transitional phrases like "and then" or "so the result was" should be softer. This creates natural emphasis without feeling theatrical.

## The Compounding Effect

None of these signals kills an interview on their own. But a candidate with flat pitch, high filler density, fast pace, and low amplitude variation will consistently get scored lower on perceived confidence, even when their actual answer content is strong.

The interviewer won't know why. They'll just feel like the candidate "wasn't quite there yet."

Signal measures all four of these signals on every spoken answer and trends them over time. Most users see measurable improvement in filler density within 5-7 sessions once they can see the data.
    `,
  },
  {
    slug: "job-search-budget-runway",
    title: "How Long Can You Actually Afford to Job Search?",
    description:
      "Most job seekers underestimate their monthly burn rate by 20-30%. Here's how to calculate your real runway and make smarter decisions about which offers to take seriously.",
    tag: "Career & Money",
    tagColor: "#10B981",
    date: "May 1, 2026",
    readTime: "5 min read",
    content: `
The number most job seekers don't know is their actual monthly burn rate. They have a rough sense. They've checked the account balance. But they haven't sat down and added up the real number, which means they're making one of the most stressful career decisions with incomplete information.

If you're currently in a search, or about to start one, your first priority is figuring out exactly how long you can sustain it.

## Calculate Your Real Monthly Number

Take your fixed monthly expenses and add them up: rent or mortgage, utilities, groceries, health insurance (often more expensive once you leave employer coverage), loan minimums, and transportation.

Then add your variable spending. This is where people get fuzzy. The honest approach is to go back three months in your bank statements and average what you actually spent, not what you planned to spend.

Signal's free <a href="/career-guide/budget" style="color:#34D399;text-decoration:underline;text-underline-offset:3px">budget calculator</a> lets you map this out in about five minutes. Plug in your real numbers and you'll get your monthly burn rate split by needs, wants, and savings, plus a rough sense of how far your current savings will take you.

## The Things People Forget

**Annual subscriptions.** Adobe, domain renewals, car registration, streaming services billed annually. These don't appear every month but they will appear.

**Healthcare without employer coverage.** COBRA is expensive. Marketplace plans have deductibles. If you're used to low-cost employer coverage, this one surprises people.

**The irregular category.** Car repairs. A flight for an in-person interview. A suit that needs replacing. Add a flat 10% buffer on top of your calculated number and you'll be close to reality.

## How to Stretch Runway Without Making Yourself Miserable

The easiest cuts are in the wants category. Subscriptions you forgot you had. Dining out frequency. Streaming services you haven't used in a month. These feel small individually but they add up.

The harder question is about savings contributions. If you have a 401k set to auto-contribute, pausing it temporarily increases your liquid runway. That's a real tradeoff, and only you can weigh it. But a four-month search that ends badly because of financial pressure is worse than a six-month search that ends with the right offer.

## The Psychological Part

Knowing your runway number changes how you search. It converts open-ended financial dread into a concrete timeline you can actually plan around.

When people don't know their runway, they feel urgency constantly. That urgency pushes them to apply too broadly, take early interviews seriously that they shouldn't, and sometimes accept offers that aren't right just because something feels like it needs to happen.

When you know you have five months, you can make better decisions. You can pass on the company that feels off. You can take an extra week to prepare for the role you actually want.

Figure out the number first. Then decide how to use it.
    `,
  },
  {
    slug: "ai-resume-problem-2026",
    title: "Your AI-Polished Resume Sounds Like Everyone Else's",
    description:
      "Recruiters are reading hundreds of applications that all use the same language, the same bullet structure, and the same keywords. Here's what actually makes a resume stand out now.",
    tag: "Resume & Job Search",
    tagColor: "#F59E0B",
    date: "April 25, 2026",
    readTime: "4 min read",
    content: `
Recruiters can tell. They won't always say it out loud, but when they're reading their fifteenth resume with "spearheaded cross-functional initiatives" and "drove stakeholder alignment," the response is the same: the application goes in the pile.

AI resume tools have gotten very good at one thing: making everyone sound the same. That's not a product flaw. It's a math problem. When everyone uses the same tools trained on the same data, the output converges toward an average.

## What Happens When Everyone Optimizes

ATS keyword optimization is real and it matters for getting through automated filters. But the candidates who get calls are the ones who sound like a person wrote their resume.

The resume that stands out right now has a few things in common.

## Specific Numbers Over Vague Impact Claims

"Improved team efficiency" is not a result. "Reduced reporting time from 6 hours to 45 minutes by automating the weekly export" is a result.

If you don't have a clean number, describe a state change. Before the process required three people and two days. After, one person, half a day. Concrete before-and-after reads as real. Vague impact language reads as filler.

## Ownership Language Throughout

Passive voice is the tell. "Was responsible for leading" is weaker than "Led." "Helped to facilitate" is weaker than "Ran."

Go through every bullet and cut phrases that dilute ownership. If you made the decision, say you made it. If you built something, say you built it. If you were one of five contributors, find the specific piece you owned and lead with that.

## The Specific Details That Feel Too Small to Mention

Candidates who get interviews are often the ones who included something they thought was too niche or too small.

A two-person project where you owned the entire customer-facing side. A risk you flagged that saved the company a significant amount. A process you redesigned that nobody asked you to redesign. These details are the opposite of generic. They're the ones that make a recruiter actually stop scrolling.

## What a Strong Resume Can't Fix

Getting into the room is one problem. What happens in the room is a different one. Candidates with polished resumes regularly bomb interviews because the verbal story doesn't match the written one, or because they've never practiced articulating their work out loud under any kind of pressure.

The goal is for the resume and the interview answer to tell the same story, with the same level of specificity and ownership. That second part takes practice.
    `,
  },
  {
    slug: "salary-negotiation-how-to",
    title: "How to Negotiate Salary Without Feeling Like a Jerk",
    description:
      "Most people leave money on the table not because they don't know they should negotiate, but because they freeze when the conversation gets real. Here's what to actually say.",
    tag: "Career & Money",
    tagColor: "#10B981",
    date: "April 18, 2026",
    readTime: "6 min read",
    content: `
Most people know they should negotiate. They've read the statistics. They understand that candidates who push back earn meaningfully more over the course of a career. And then the offer comes in and they say thank you and accept it.

The knowledge problem and the execution problem are different. You can know you should negotiate and still freeze when a real person on the phone is waiting for your response.

Here's what to actually say.

## When They Ask About Your Salary Expectations Early

This question shows up before an offer and it's designed to anchor the negotiation in the company's favor. If you answer first, you've given up information before you know what they're willing to pay.

A response that works: "I'd rather wait until we both feel like there's a strong mutual fit before getting into compensation. Do you have a budgeted range for the role you can share?"

Most companies have a range. They may not share it, but asking is not aggressive. It's professional. If they press, give a range with your actual target at the lower end.

## When the Offer Comes In

You do not have to respond on the spot. You should not respond on the spot.

Say this: "I'm genuinely excited about this role and the team. Can I have a few days to review the full package?"

That request is standard. A company that pulls an offer because you asked for two days to think is one you should not work for.

Use that time to get a real number. Check Glassdoor, Levels.fyi if you're in tech, and LinkedIn Salary. Talk to people in similar roles at similar companies. Know the specific number you're asking for before you pick up the phone.

## The Negotiation Conversation Itself

When you call back, keep it simple:

"I've had a chance to review everything and I'm still really excited. Based on my research and the scope of the role, I was hoping we could get to [specific number]. Is there flexibility there?"

Then stop. Let them respond. The silence is uncomfortable. That's okay. Fill it and you'll undercut yourself.

If they say the salary is fixed, ask about other parts of the package. Signing bonus. Extra PTO. A remote work arrangement. An earlier first performance review. Compensation has more levers than the base salary number, and companies often have more flexibility in those areas.

## The Lines That Hurt You

Bringing up personal expenses: "I need to be able to afford my rent." Your personal costs are not a reason they should pay you more. Negotiate on market value.

Preemptively conceding: "I totally understand if this isn't possible." Let them tell you it's not possible. Sometimes it is.

Asking for the maximum: "What's the most you could offer?" This frames the conversation as adversarial. A softer version: "Is there any room to move toward [number]?"

## One Thing Worth Saying Plainly

Negotiating an offer is not a hostile act. The person who made you the offer knows candidates negotiate. They expect it. A well-framed ask does not damage the relationship. It signals that you know your value and that you communicate directly, which are qualities they were presumably trying to hire for.

The ask rarely goes wrong. Staying quiet always costs you something.
    `,
  },
  {
    slug: "mock-interview-preparation-guide",
    title: "How to Actually Prepare for a Mock Interview So It Transfers to the Real Thing",
    description:
      "Most mock interview practice doesn't work because people treat it like rehearsal. Here's how to structure your sessions so that improvement actually carries over under pressure.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "March 28, 2026",
    readTime: "7 min read",
    content: `
Mock interviews are one of the most widely recommended prep strategies. They're also, when done wrong, one of the least effective.

The reason: most people treat mock interviews as rehearsal. They practice the answers they already know, in a comfortable setting, with a feedback loop that doesn't actually simulate the cognitive load of a real interview.

Here's how to get actual transfer, meaning improvement that shows up when the real pressure is on.

## The Core Problem With Most Mock Practice

When you practice with a friend, a mirror, or a supportive coach, you're often practicing in conditions that are too comfortable. You correct yourself mid-sentence. You ask to start over. You get encouraging feedback that doesn't distinguish between what actually landed and what just felt good to say.

Real interviews don't allow any of this. You have one shot at each answer. Your nervous system is running hot. And the person across from you is making judgments about things you can't see in real-time.

## Principle 1: Practice Under Constraint, Not Comfort

The goal of practice is to build skill that holds under pressure. This means:

- **No restarts.** Give one answer per question, start to finish, even if you feel like you're losing the thread.
- **No pre-selecting questions.** Use a random question generator or let an AI pick questions you haven't seen.
- **Time the response.** Answers over 2:30 are almost always too long. Set a timer.

## Principle 2: Diagnose Before You Repeat

Repetition without feedback creates ruts. If you practice the same answer ten times and it has the same structural flaw each time, you've reinforced the flaw.

Before you repeat an answer, identify one specific thing to change. Not "be more confident," but something observable: "Start with the action, not the context" or "Remove the word 'basically' from the opener."

Signal's dimension scores give you a specific diagnosis after each session. Use that data to pick one thing to work on before the next attempt.

## Principle 2: The 3x3 Framework

For each role you're interviewing for, prepare three answers for each of these three categories:

**Category 1: Leadership and influence.** Times you drove something, influenced without authority, or pushed back against a decision.

**Category 2: Problem-solving under constraint.** Times you had incomplete information, limited resources, or a hard deadline.

**Category 3: Failure and recovery.** Times something went wrong, what you did, and what you'd do differently.

These categories cover roughly 80% of behavioral interview questions. Three answers per category gives you enough material to adapt without over-scripting.

## Principle 3: Simulate the Full Session, Not Just the Answers

One of the most important things to practice is the cognitive load of answering 5-6 questions in a row, in front of someone, while tracking your time and reading the room.

Mock interview sessions in Signal are structured as full 5-question sessions with a consistent AI interviewer persona. This simulates the arc of a real interview, including how your performance changes from question 1 to question 5. Most people decline. Knowing that pattern, and building endurance in your practice, is part of what makes the prep transfer.
    `,
  },
];
