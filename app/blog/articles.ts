export interface Author {
  name: string;
  title: string;
  bio: string;
}

export const authors: Record<string, Author> = {
  jordan: {
    name: "Jordan Mills",
    title: "Former Technical Recruiter, Google",
    bio: "Jordan spent six years recruiting engineers and PMs at Google before moving into career coaching. She has reviewed over 4,000 interview recordings and coached candidates from 80+ countries.",
  },
  marcus: {
    name: "Marcus Chen",
    title: "Senior Career Coach, ex-McKinsey",
    bio: "Marcus spent eight years in management consulting before transitioning to full-time career coaching. He specializes in behavioral interview preparation for consulting, finance, and tech roles.",
  },
  priya: {
    name: "Priya Nair",
    title: "Communication Researcher and Interview Coach",
    bio: "Priya studies the psychology of high-stakes communication. She has trained over 1,200 candidates on vocal delivery, body language, and structured storytelling for professional interviews.",
  },
};

export interface Article {
  slug: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  date: string;
  readTime: string;
  author: keyof typeof authors;
  content: string;
}

export const articles: Article[] = [
  {
    slug: "star-method-interview-answers",
    title: "The STAR Method Actually Works, But Not the Way Most People Use It",
    description:
      "Most candidates know the STAR framework. Almost none of them use it right. Here's the specific failure pattern that tanks otherwise strong answers, and how to fix it before your next interview.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 10, 2026",
    readTime: "6 min read",
    author: "marcus",
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
    author: "priya",
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
    author: "priya",
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
    slug: "mock-interview-preparation-guide",
    title: "How to Actually Prepare for a Mock Interview So It Transfers to the Real Thing",
    description:
      "Most mock interview practice doesn't work because people treat it like rehearsal. Here's how to structure your sessions so that improvement actually carries over under pressure.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "March 28, 2026",
    readTime: "7 min read",
    author: "jordan",
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
  {
    slug: "tell-me-about-yourself-interview-answer",
    title: "How to Answer Tell Me About Yourself Without Sounding Rehearsed",
    description: "It's the first question in almost every interview, and most candidates blow it. Here's a structure that sounds natural, moves fast, and sets you up for the rest of the conversation.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 14, 2026",
    readTime: "5 min read",
    author: "jordan",
    content: `
"Tell me about yourself" is the most common opening question in professional interviews. It is also the question most candidates prepare least effectively for, because it feels easy on the surface.

It is not easy. It is a test of whether you can synthesize your own story quickly, relevantly, and confidently. Interviewers use it to calibrate how you communicate before the harder questions start.

## Why Most Answers Fall Flat

The typical candidate answer starts at the beginning of their resume and works forward chronologically. "I graduated from X, then I worked at Y, then I moved to Z." This approach has two problems.

First, it tells the interviewer nothing about what you care about or what you are good at. Second, it wastes the most important 60 seconds of the conversation.

## A Better Structure

Think of your answer in three parts, delivered in about 90 seconds.

**The present.** Start with where you are right now and what you focus on. One or two sentences. "I'm currently a product manager at a fintech startup, where I own our core payments product and the team of four engineers building it."

**The thread.** Pick one or two experiences from your background that explain why you are good at what you do now. Choose experiences that are relevant to this role. Skip everything else.

**The forward.** End with why you are here. What you are looking for, and why this specific role fits that. Keep it brief. One sentence.

## What This Sounds Like in Practice

"I'm a product manager with five years of experience in fintech, currently at Acme where I run the payments platform. Before that I was a business analyst at a bank, which is where I got obsessed with how payment infrastructure actually works. I'm looking to move into a larger organization where I can work on a product at a bigger scale, which is why I applied here."

That answer takes under 60 seconds, covers present, past, and forward, and immediately signals relevance. The interviewer knows exactly who you are and what you want.

## Common Mistakes to Avoid

Starting with where you grew up, what your degree was in, or any information that predates your first relevant work experience. Unless specifically asked, your educational background should take one sentence maximum.

Ending with "and that's basically me" or any variation of that phrase. End with the forward-looking sentence about why you are there. That gives the interviewer a natural place to go next.

Signal scores your opening answer quality specifically under Narrative Clarity and Response Control. Most users find their opening answers score significantly lower than they expected, because the structure issues are hard to hear in the moment.
    `,
  },
  {
    slug: "behavioral-interview-questions-guide",
    title: "The 10 Behavioral Interview Questions That Show Up in Every Interview",
    description: "Hiring managers pull from the same pool of behavioral questions regardless of industry. Here are the ten you will almost certainly face, and how to build answers that hold up under follow-up.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "April 13, 2026",
    readTime: "9 min read",
    author: "marcus",
    content: `
Behavioral interview questions follow a predictable pattern. They start with "Tell me about a time when..." or "Give me an example of..." and they are designed to surface how you have actually behaved in the past, on the theory that past behavior predicts future performance.

Hiring managers at most companies pull from the same core set of situations they want to probe. If you have strong, specific answers to the ten below, you will be prepared for roughly 80% of what you will face.

## The Ten Questions

**1. Tell me about a time you had a conflict with a coworker or manager.**

What they are actually asking: Can you navigate disagreement professionally without either caving or creating drama? Do you take ownership of your role in the conflict?

**2. Describe a time when you failed at something.**

What they are actually asking: Do you have self-awareness? Can you learn from failure and apply that learning? Candidates who cannot name a real failure come across as either dishonest or lacking reflection.

**3. Tell me about a time you had to influence someone without direct authority.**

What they are actually asking: How do you get things done when you do not have the power to simply tell someone what to do? This is especially common in cross-functional or matrixed organizations.

**4. Give me an example of a time you handled a difficult customer or stakeholder.**

What they are actually asking: Can you manage pressure and emotion professionally while still moving toward a solution?

**5. Tell me about a time you had competing priorities and a tight deadline.**

What they are actually asking: How do you triage? What is your actual decision-making process under constraint?

**6. Describe a project you led from start to finish.**

What they are actually asking: Can you own something end to end? What does your process look like? What did you actually produce?

**7. Tell me about a time you had to make a decision with incomplete information.**

What they are actually asking: Can you move forward without certainty? Do you know how to make a reasonable call under ambiguity?

**8. Give me an example of feedback you received and how you applied it.**

What they are actually asking: Are you coachable? Do you seek feedback or wait for it? What does your response to criticism look like?

**9. Tell me about a time you drove change at your organization.**

What they are actually asking: Are you proactive? Can you build buy-in for something new? Have you actually changed anything, or just executed on what you were asked to do?

**10. Describe your biggest professional achievement.**

What they are actually asking: What does your ceiling look like? What do you consider worth being proud of? Is your definition of achievement aligned with what we care about?

## Building Answers That Hold Up Under Follow-Up

The mistake most candidates make is preparing one version of each answer and stopping there. Real interviews involve follow-up. "Why did you make that call?" "What would you do differently?" "What was the reaction from the team?"

For each of the ten questions above, prepare your core answer using the STAR structure, then spend five minutes asking yourself: what is the most likely follow-up question here, and what would I say?

Signal runs multi-question mock sessions that include follow-up probes on your answers. Most users find their answers hold up less well under follow-up than they expected, which is exactly what you want to find out in practice.
    `,
  },
  {
    slug: "interview-anxiety-how-to-manage",
    title: "Interview Anxiety Is a Skill Problem, Not a Confidence Problem",
    description: "Most advice on interview nerves treats it as a mindset issue. The actual fix is simpler and more reliable. Here's what the research says and what to do about it.",
    tag: "Mindset",
    tagColor: "#F59E0B",
    date: "April 12, 2026",
    readTime: "6 min read",
    author: "priya",
    content: `
Interview anxiety gets treated as a confidence problem. The standard advice: believe in yourself, remember your achievements, take deep breaths before you walk in.

That advice is not wrong. It is just incomplete, and it misses where most interview anxiety actually comes from.

## Where the Anxiety Actually Comes From

The dominant source of interview anxiety is not low self-esteem. It is uncertainty about performance. Specifically, candidates do not know what their answers actually sound like. They practice in their head, where every answer is coherent and well-paced. Then they get in the room and cannot tell whether what is coming out of their mouth is good or not.

That uncertainty creates anxiety. And the anxiety makes the performance worse, which creates more uncertainty.

The research on performance anxiety is consistent on one point: anxiety decreases when performers have accurate feedback on their skill level. Athletes who can measure their progress get less anxious at competitions, because they know what they can actually do. Candidates who have heard their own answers and received specific feedback on what is working are meaningfully less anxious in interviews.

## What to Do About It

**Record yourself answering questions out loud.** This is the single highest-leverage thing most candidates skip. The discomfort of listening to yourself is real. That discomfort is also exactly what tells you where the problems are.

**Get specific feedback on specific things.** "You seem nervous" is not useful. "Your filler rate jumps in the first 20 seconds of every answer" is useful, because it tells you what to work on.

**Do enough repetitions that the structure becomes automatic.** Anxiety rises when you have to think about multiple things at once. When STAR structure is automatic, you can focus on content. When the content is automatic, you can focus on delivery.

**Simulate pressure in practice.** Answer questions you have not seen before, without stopping or restarting, under time pressure. If your only practice has been comfortable, performance under discomfort will feel harder than it has to.

## What Not to Do

Avoid scripts. Memorized scripts increase anxiety because they give you something additional to fail at. You can forget the script on top of forgetting your story. Prepare your stories. Know the key points. Let the specific words come naturally.

Signal measures your delivery across multiple sessions so you can track whether filler density, pace, and structure are actually improving over time. Seeing that data tends to reduce the uncertainty that drives most pre-interview anxiety.
    `,
  },
  {
    slug: "weakness-interview-question-answer",
    title: "What to Say When They Ask About Your Greatest Weakness",
    description: "The weakness question is one of the most misunderstood questions in interviewing. Here's what interviewers are actually evaluating and how to answer it without sounding scripted.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 11, 2026",
    readTime: "5 min read",
    author: "jordan",
    content: `
The weakness question makes candidates more anxious than almost any other. "What is your greatest weakness?" Or the variant: "What would your last manager say you need to work on?"

The anxiety is understandable. It feels like a trap. If you name a real weakness, you hurt yourself. If you name a fake weakness, you sound evasive.

The reality is more straightforward than most candidates realize.

## What Interviewers Are Actually Evaluating

Hiring managers are not hoping you will reveal a disqualifying flaw. They know the question exists. They know you have prepared for it. What they are actually looking for:

**Self-awareness.** Can you identify something real that you have struggled with? Candidates who claim to have no weaknesses, or give answers that are obviously not weaknesses ("I work too hard," "I care too much"), come across as lacking insight.

**Honesty and maturity.** A candidate who can name a genuine development area and discuss it calmly signals that they are secure and reflective.

**Evidence of growth.** The best weakness answers include what you did about it. The weakness is not the story. The learning is.

## What a Strong Answer Looks Like

Pick something real. It should be a genuine area of development, not a devastating flaw that directly affects the job. A product manager who is still building comfort with public speaking is a real weakness. The same product manager saying they struggle with data analysis for a data-heavy role is a problem.

Name it directly, without excessive hedging. "I have historically been slow to delegate. My instinct is to stay close to execution, and that has sometimes slowed down the people around me."

Then explain what you have done about it. "I started tracking how many decisions I was making each week that my direct reports could have made themselves. That gave me a concrete signal. I have gotten better at delegating ownership rather than just tasks."

That is an honest answer. It shows awareness, a real behavior, and a concrete effort to change. That is what interviewers want to see.

## What to Avoid

Generic weakness answers interviewers have heard hundreds of times: perfectionism, impatience, doing too much yourself. These are fine if they are real for you, but if you use them, you need to make them specific and show actual evidence of working on them.

Picking a weakness that is clearly a strength in disguise. Every interviewer has heard "I just care too deeply about quality." It reads as evasive.

Signal will flag hedging language in your weakness answers under the Ownership and Agency dimension. Weak answers on this question almost always show high hedge density and low specificity in the result statement.
    `,
  },
  {
    slug: "why-do-you-want-to-work-here",
    title: "Why Do You Want to Work Here? How to Answer Without Being Generic",
    description: "Most candidates give vague, complimentary answers to this question. Interviewers find them forgettable. Here's how to give a specific, credible answer that actually stands out.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 9, 2026",
    readTime: "5 min read",
    author: "jordan",
    content: `
"Why do you want to work here?" is one of the five most common interview questions. It is also one where most candidates give nearly identical answers.

The typical response covers some combination of: the company's reputation, its growth trajectory, its culture, and how excited the candidate is about the role. These answers are not wrong. They are just indistinguishable from what every other candidate says.

## Why Generic Answers Fail

An interviewer who has reviewed 20 candidates for the same role has heard the same phrases hundreds of times. "I admire the company's mission." "I've followed your growth and I'm excited about the direction." "The culture seems like a great fit."

These answers signal that you researched the company website for 15 minutes. They do not signal that you thought carefully about why this specific role, at this specific company, at this specific moment makes sense for you.

## What a Specific Answer Sounds Like

The best answers to this question have three components.

**Something specific you know about the company.** A product decision they made, a strategic shift you followed, a feature you have actually used, a piece of leadership writing you found credible. It should be specific enough that it could only apply to this company.

**A reason that connects to your own experience or interest.** Why does that specific thing matter to you? What in your background makes this direction interesting?

**A forward-looking statement.** What do you hope to contribute or build here that you could not build elsewhere?

A candidate interviewing at a fintech company might say: "I read the piece your CPO wrote last year about why you chose to build on open banking rails instead of licensed infrastructure. I spent two years at a payments startup working through exactly that decision, and I came down differently at the time. I have been curious since whether your bet is playing out the way you expected. That specific product direction is a big part of why I applied."

That answer is memorable. It demonstrates real research. It creates an opening for a genuine conversation rather than a scripted exchange.

## Preparing This Answer

Look beyond the careers page and the about section. Read recent press releases. Search for interviews with the leadership team. Look at the company's LinkedIn for announcements from the last 12 months. Find one thing that is actually specific, and build the answer from there.
    `,
  },
  {
    slug: "leadership-interview-questions",
    title: "Leadership Interview Questions: What They Are Really Asking",
    description: "Leadership questions are not asking whether you have managed a team. They are probing for judgment, influence, and accountability. Here's how to prepare for the difference.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "April 8, 2026",
    readTime: "7 min read",
    author: "marcus",
    content: `
Leadership interview questions come up in almost every professional interview, even for roles that do not involve managing people. The reason is that most organizations want employees who can drive outcomes beyond their immediate scope of work.

Understanding what these questions are actually probing changes how you prepare for them.

## The Two Types of Leadership Questions

**Formal leadership.** "Tell me about a time you managed a team." "How do you handle a low-performing direct report?" "Describe how you built or restructured a team." These questions are most common for management roles.

**Informal leadership.** "Tell me about a time you drove change without formal authority." "Describe a time you influenced a decision that was ultimately made by someone else." "Tell me about a project you owned that required buy-in from teams outside your direct organization." These are common at every level.

The distinction matters because candidates often assume leadership questions require a management story. They miss opportunities to talk about times they drove alignment, pushed back on decisions, or changed the direction of a project by making a compelling case.

## What the Best Leadership Answers Have in Common

**A clear moment of ownership.** The interviewer should be able to identify exactly when you took personal responsibility for an outcome. Not "the team decided" but "I recommended and the team agreed" or "I made the call."

**Some friction.** The most credible leadership stories involve a point where the path forward was not obvious, or where someone pushed back. If everything went smoothly, the story does not reveal much about your judgment.

**A result with a clear owner.** What changed because you were involved? What did you produce, prevent, or improve? Leadership without impact is description.

## Common Questions and What They Probe

"Tell me about a time you gave critical feedback to a peer." This probes whether you can have direct, professional conversations about performance without escalating prematurely or avoiding the issue altogether.

"Describe a time you had to rally a team through uncertainty." This probes how you communicate in ambiguous situations. Do you keep people focused? Do you model calm?

"Tell me about a time you disagreed with a decision your manager made." This probes maturity and the ability to hold a position without becoming adversarial. The best answers show that you pushed back clearly, explained your reasoning, and accepted the final decision professionally.

## Preparing Your Leadership Stories

For each story, identify the moment you stepped up without being asked to. That moment is usually the core of the answer. Everything before it is context. Everything after it is impact.

Signal's Ownership and Agency dimension tracks specifically how much you use personal ownership language across your answers. Candidates preparing for leadership-heavy roles typically find this dimension is where they have the most room to improve.
    `,
  },
  {
    slug: "conflict-resolution-interview-questions",
    title: "Conflict Resolution Interview Questions: How to Answer Without Badmouthing Anyone",
    description: "Conflict questions are among the most mishandled in professional interviews. Candidates either go too soft or reveal something they should not. Here's how to navigate them cleanly.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 6, 2026",
    readTime: "6 min read",
    author: "marcus",
    content: `
Conflict questions make candidates uncomfortable, and that discomfort often produces answers that are either too vague to be useful or too candid about things better left unsaid.

Hiring managers ask about conflict because they want to see whether you can navigate professional disagreement with maturity. They are not hoping you will say everything went smoothly. They expect conflict. They want to see how you handled it.

## What Interviewers Are Looking For

Three things matter in a conflict answer.

**Your role in the conflict.** The best answers acknowledge that conflict rarely has one clear villain. Candidates who describe conflicts where they were entirely right and the other party was entirely wrong come across as lacking perspective, even when their version of events is accurate.

**How you handled the process.** Did you address the conflict directly? Did you escalate appropriately and not prematurely? Did you stay professional when it was difficult?

**What resolved it.** Strong answers show a real resolution, even if the resolution was just agreeing on a path forward despite disagreement. Stories that trail off without resolution are unsatisfying.

## What to Avoid

Choosing a conflict story that involves badmouthing a former employer, manager, or coworker. Even if the other party was genuinely in the wrong, the way you talk about them tells the interviewer something about how you will talk about their organization if you ever leave.

Choosing a conflict story that is too minor to be meaningful. "We disagreed about which font to use in a presentation" will not demonstrate your conflict resolution skills. Choose something where the stakes were real.

Framing the conflict as fully resolved by your superior reasoning. Interviewers know you chose this story because you came out well. But the most credible version of these stories includes some acknowledgment of what you learned or what you would do differently.

## A Simple Structure That Works

Open with the situation in one sentence. Describe what the conflict was about and who was involved, without characterizing anyone negatively.

Explain your position and your approach. What did you believe and why? How did you choose to engage?

Describe the process. Did you have a direct conversation? Did you bring in a third party? Did you escalate? Walk through what you did, in order.

Close with the resolution and what you took from it. What changed? What do you carry forward?
    `,
  },
  {
    slug: "where-do-you-see-yourself-in-5-years",
    title: "Where Do You See Yourself in 5 Years? What to Say and What to Skip",
    description: "This question is less about your actual five-year plan and more about whether your ambitions fit the role. Here's how to give an answer that reads as honest and grounded.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 5, 2026",
    readTime: "4 min read",
    author: "jordan",
    content: `
"Where do you see yourself in five years?" is a question most candidates answer too carefully. They try to give the answer they think the interviewer wants to hear, and the result is usually something generic about growth and impact that tells the interviewer nothing useful.

The question has a simple purpose. Interviewers want to know whether your career ambitions are compatible with this role and whether you are likely to be engaged and motivated in the position for long enough to be worth the investment of hiring and onboarding you.

## What Not to Say

"I see myself in a leadership role." Vague, and also something almost every candidate says.

"I hope to still be at this company, growing with the team." This sounds great but it is rarely believable and does not tell the interviewer anything specific.

"Honestly, I have no idea." This is the honest answer for many people, but it is not a useful interview answer because it gives the interviewer nothing to work with.

## What Works Better

Give a direction, not a destination. You do not need to know your exact title in five years. You need to show that you are thinking about your career intentionally and that this role fits into that thinking.

"I am trying to build deeper expertise in product strategy and develop experience leading cross-functional teams. This role, from what I understand about how it is structured, gives me a path to both. In five years I would hope to have taken on more ownership and be working at the level where I can set direction, not just execute on it."

That answer is honest about what you want, specific about why this role is relevant to it, and not an overclaim.

## Calibrate to the Role

If you are interviewing for an individual contributor role and your five-year plan involves managing a large team, think carefully about how you present it. The interviewer may worry you will be disengaged in a role that does not have that path. You do not need to hide your ambitions, but you do need to show that you are fully present in the immediate role.

"I am focused on developing real depth here first. I want to understand what good looks like at this level before I think about what comes next."
    `,
  },
  {
    slug: "situational-interview-questions",
    title: "Situational Interview Questions: How to Answer What You Would Do",
    description: "Situational questions ask about hypothetical scenarios, which means you cannot rely on a specific story from your past. Here's how to structure answers that are specific and credible.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "April 4, 2026",
    readTime: "5 min read",
    author: "priya",
    content: `
Situational interview questions follow a different pattern from behavioral questions. Instead of asking about something you have done, they ask about something you would do.

"What would you do if you discovered a coworker was cutting corners on a compliance process?" "How would you handle a situation where your manager asked you to do something you disagreed with?" "Imagine you are three days from a product deadline and a key feature breaks. Walk me through your response."

These questions are common in roles where values, judgment, and process matter as much as specific experience. They give hiring managers insight into how you think, not just what you have done.

## The Difference Between a Good Answer and a Bad One

A bad situational answer is abstract. "I would assess the situation, communicate with stakeholders, and find the best path forward." This tells the interviewer nothing about your actual decision-making process.

A good situational answer is specific about the process. It names the steps you would take, in order, and explains the reasoning behind each one.

## A Structure That Works

**State your first priority.** What do you do first and why? "The first thing I would do is get as much information as possible before taking any action. I would want to understand whether this is a one-time issue or a pattern, and whether anyone else is aware of it."

**Walk through the sequence.** What comes next? What triggers each decision? "If it looks like a pattern, I would bring it to my manager directly rather than going around them. I would have that conversation privately and give them a chance to address it."

**Address the edge case.** Good situational answers anticipate complications. "If I raised it and nothing changed, I would escalate through the appropriate channel. I would not wait indefinitely."

**Close with what you value.** "I think the most important thing in a situation like this is acting early and directly. Problems like this rarely get better on their own."

## Grounding Hypotheticals in Real Experience

The most credible situational answers include brief references to real experience, even when the question is hypothetical. "I have actually been in something like this situation before, and what I found was..." shifts the answer from pure speculation to demonstrated behavior.

You do not need a perfect match. Even a partially relevant experience makes the answer more believable than one that stays entirely in the hypothetical.
    `,
  },
  {
    slug: "phone-interview-tips",
    title: "Phone Interview Tips: How to Perform Well When You Cannot Read the Room",
    description: "Phone interviews remove almost all the nonverbal feedback you rely on in person. Here's how to compensate and make a strong impression when you cannot see the interviewer's face.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "April 2, 2026",
    readTime: "5 min read",
    author: "priya",
    content: `
Phone screens are the most common first step in a hiring process, and they require a different set of skills than in-person interviews. Most candidates underprepare for them because they assume the content matters more than the medium. In a phone interview, the medium matters a great deal.

## What You Lose on the Phone

In person, you can see when an interviewer is tracking with you, when they look confused, or when they are starting to check out. You get constant feedback that helps you calibrate. On the phone, all of that disappears.

You also lose the ability to use physical presence, eye contact, and body language to signal confidence. Everything lands through your voice.

## What to Focus On

**Pace.** Without visual cues, fast talkers tend to speak even faster on the phone. The listener has no body language to help them parse the flow of what you are saying. Slow down by 10-15% compared to your normal conversation pace.

**Pause deliberately.** After key points, pause briefly. This gives the interviewer a natural moment to interject, and it signals that you are structured and composed. Candidates who speak without natural pauses are harder to follow on the phone.

**Signal transitions out loud.** In person, a shift in posture or a glance away signals that you are transitioning. On the phone, you have to name it. "The second thing I would flag is..." or "Here is what that resulted in..." keeps the interviewer oriented without visual cues.

**Confirm understanding before answering.** On the phone, it is easier for the interviewer's question to be misheard. It is completely acceptable to say "Just to make sure I understand the question, you're asking about..." before starting your answer.

## Practical Preparation

Find a quiet room. Background noise on your end is more disruptive than candidates realize. Close windows, silence notifications, and if possible, use a wired connection instead of speakerphone.

Stand up while you answer. This is counterintuitive but well-supported. People who stand during phone calls tend to project more energy and speak with more confidence. Try it once and you will understand why.

Have your resume in front of you, but resist the urge to read from it. Use it as a reference if you need a date or a specific metric, not as a script.
    `,
  },
  {
    slug: "virtual-interview-tips",
    title: "Virtual Interview Tips: What Hiring Managers Actually Notice on Video",
    description: "Video interviews have their own set of technical and behavioral pitfalls. Here's what recruiters pay attention to, and how to control the things you can control.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "March 31, 2026",
    readTime: "6 min read",
    author: "jordan",
    content: `
Virtual interviews became the default hiring format for many companies, and they have stayed that way. Most candidates have done enough video calls to feel comfortable. But comfort with video calls and performance on video interviews are not the same thing.

Hiring managers have developed specific opinions about what they observe on video, and many of these observations happen before the first question is asked.

## What Interviewers Notice First

**Your setup.** Background, lighting, and camera angle are evaluated within the first ten seconds. A cluttered or visually busy background is distracting. Poor lighting that puts your face in shadow reads as careless or unprepared. A camera positioned below eye level distorts your appearance and undermines presence.

The fix is simple: face a window or a light source, position your camera at eye level, and use a clean background.

**Your eye contact.** On video, eye contact means looking at the camera, not the screen. Most people look at their own image or the interviewer's image on screen, which means they appear to be looking down or to the side. This reads as evasion or low confidence.

Put a small sticky note next to your camera as a visual anchor. Train yourself to return to it when you are making an important point.

**Your audio.** Interviewers consistently rank audio quality as one of the most important factors in how they perceive video interview candidates. Echoey rooms, background noise, and poor microphone quality create friction and reduce perceived credibility.

If your built-in microphone is picking up too much room sound, a basic USB microphone or a set of earbuds with a built-in mic will improve the quality significantly.

## During the Interview

Resist the urge to watch yourself. Most video platforms show your own image, and watching it during the interview splits your attention and creates a feedback loop of self-consciousness.

Respond to pauses. On video, silence reads as a technical problem before it reads as a thinking pause. After a few seconds of silence following a question, it is fine to say "Let me take a second to think through that" to signal that you are processing, not frozen.

Signal warmth deliberately. Facial expressions on video need to be slightly more pronounced than in person to read clearly through a screen. A neutral face in a high-stakes conversation often reads as flat or disengaged on video, even if you are fully engaged.
    `,
  },
  {
    slug: "product-manager-interview-questions",
    title: "Product Manager Interview Questions: How to Prepare for the Full Loop",
    description: "PM interviews cover product sense, execution, strategy, and behavioral competencies across multiple rounds. Here is how to prepare for all four without running out of time.",
    tag: "Interview Prep",
    tagColor: "#10B981",
    date: "March 30, 2026",
    readTime: "8 min read",
    author: "marcus",
    content: `
Product manager interviews are among the most demanding in the professional world. A typical PM loop at a technology company covers four distinct competency areas, each of which could fill its own prep guide. Most candidates who fail PM interviews do not fail because they lack product instincts. They fail because they ran out of time to prepare all four areas and defaulted to the ones that felt most comfortable.

## The Four Competency Areas

**Product sense.** Questions like: "Design a product for X user." "How would you improve this feature?" "What metrics would you use to measure success?" These questions probe whether you can think from the user's perspective, identify real problems, and prioritize solutions with limited resources.

**Analytical and execution.** Questions like: "You see a 20% drop in daily active users. Walk me through how you would diagnose it." "A feature you shipped is underperforming. How do you decide what to do next?" These probe your comfort with data, your structured thinking process, and your ability to move from diagnosis to action.

**Strategy and product vision.** Questions like: "Where do you see this product in three years?" "How would you enter a new market?" "Who is the biggest competitive threat and how would you respond?" These probe whether you can hold a coherent view of a product ecosystem, not just individual features.

**Behavioral and leadership.** The same behavioral questions from any professional interview, but in a PM context. "Tell me about a product decision you made that you later regretted." "Describe a time you had to cut a feature you believed in to meet a deadline." "How have you handled a disagreement with an engineer on your team?"

## Where Candidates Usually Fall Short

Product sense is the area most candidates over-prepare for, because it is the most visible part of the PM role from the outside. Analytical questions are where most candidates underperform, because many PMs default to intuition in practice and struggle to articulate a structured diagnostic process on the spot.

Before your interview loop, pick a metric-driven scenario and talk through it out loud, in full sentences. "Our core engagement metric dropped 15% week-over-week. Here is how I would start..." Practice until the structure of your diagnostic is automatic.

## Preparing Your Product Stories

For the behavioral portion, prepare three to four product stories that each demonstrate something distinct. A decision you made under uncertainty. A product you shipped that underperformed. A cross-functional conflict you navigated. A user insight that changed your direction. These should be from your actual experience, specific enough to hold up under follow-up, and short enough to deliver in two minutes or less.

Signal's dimension scoring is particularly useful for PM interview prep because it measures both the structural quality of your answers and the delivery signals that matter for leadership credibility.
    `,
  },
  {
    slug: "salary-negotiation-tips",
    title: "How to Negotiate Your Salary After a Job Offer",
    description: "Most people either do not negotiate or negotiate badly. Here's a specific, practical approach that works without creating friction with your new employer.",
    tag: "Career",
    tagColor: "#8B5CF6",
    date: "March 26, 2026",
    readTime: "6 min read",
    author: "jordan",
    content: `
Most people do not negotiate their salary after a job offer. Studies consistently show that candidates who negotiate get better outcomes, and employers rarely rescind offers because a candidate negotiated professionally.

The fear is understandable. Negotiation feels risky, especially after a long and uncertain hiring process. But the risk is almost always overstated, and the cost of not negotiating compounds over the length of your career.

## Before You Start Negotiating

Know your number before you receive the offer. Research the role, the company, and the market using multiple sources. Glassdoor, LinkedIn Salary, Levels.fyi for tech roles, and conversations with people in similar positions all contribute to a more accurate picture than any single source.

Decide in advance what you would accept and what would cause you to walk away. Negotiating without a clear sense of your floor creates confusion and makes it easier to accept less than you should.

## When You Receive the Offer

Do not accept or reject on the spot. It is completely normal to ask for 24-48 hours to review the offer. "Thank you so much. I'm really excited about this. Can I have until tomorrow to review everything and come back to you?"

Once you have reviewed it, respond in writing or on a call with a clear counter. You do not need to justify your ask at length. A concise, confident counter is more effective than a detailed argument.

## What to Say

"I'm really excited about this opportunity and I'm confident I want to join the team. Based on my research and the scope of this role, I was hoping we could get to [number]. Is there flexibility there?"

If they cannot move on base salary, ask about other components. Signing bonus, equity, vacation, remote flexibility, and professional development budget are all negotiable at many companies even when salary is not.

## What to Avoid

Do not give a specific number first when asked for your expectations. Respond with a range, and make sure the bottom of your range is acceptable to you. Anchor high enough that the negotiation leaves you in a good position.

Do not apologize for asking. Candidates who preface their counter with "I know this might be a lot to ask" or "I feel bad pushing back on this" undermine their own position before the conversation even begins.
    `,
  },
  {
    slug: "interview-body-language-tips",
    title: "Body Language in Interviews: What Interviewers Pick Up On",
    description: "Interviewers form significant impressions from nonverbal signals, often before you finish your first sentence. Here's what research shows and what to actually do about it.",
    tag: "Communication",
    tagColor: "#8B5CF6",
    date: "March 24, 2026",
    readTime: "6 min read",
    author: "priya",
    content: `
Body language research in interview contexts is frequently overstated and sometimes exaggerated. The famous claim that 93% of communication is nonverbal is not accurate and has been widely misrepresented.

What is well-supported: interviewers do form meaningful impressions from nonverbal signals, and those impressions do affect hiring outcomes. The signals that matter most are more specific than the general "power pose" advice that circulates online.

## What Interviewers Actually Respond To

**Eye contact, calibrated.** Too little eye contact reads as evasion or low confidence. Too much reads as aggressive or socially unaware. The appropriate range is roughly 60-70% eye contact during conversation, with natural breaks when you are thinking or explaining something complex. This maps to how confident, engaged people behave in normal professional conversation.

**Stillness under pressure.** Candidates who move a great deal, shift in their chairs, play with their hands, or make frequent self-touching gestures (touching their face, neck, or hair) read as anxious. You do not need to be completely still. Small, natural movements are normal. Constant movement is not.

**Posture that stays open.** Crossed arms, a closed chest, or a forward hunch can read as defensive or disengaged, depending on context. A relaxed, upright posture signals that you are present and confident. Leaning slightly forward during key points signals engagement.

**Nodding at appropriate moments.** Brief nodding while the interviewer is speaking signals attention and comprehension. This is a small signal but interviewers notice it, because candidates who do not nod at all can seem disengaged.

## For Video Interviews

The signals shift on video. Eye contact on video means looking at the camera, not the interviewer's face on screen. Facial expressions need to be slightly more expressive than in person, because compression and screen size reduce the clarity of small expressions.

Stillness matters even more on video, because small movements are amplified by the camera and more visually distracting in a small frame.

## What to Actually Practice

Record yourself answering interview questions on video and watch the footage without sound. Pay attention only to what you see. This is the version of your performance that your interviewer is processing alongside everything else. Most people are surprised by the gap between how they think they look and how they actually look.

Signal's webcam analysis measures head stability, expressiveness, eye contact percentage, and blink rate across every practice session. The patterns that show up across multiple sessions are the ones most worth addressing.
    `,
  },
  {
    slug: "why-are-you-leaving-your-job",
    title: "Why Are You Leaving Your Current Job? How to Answer Without Damaging Yourself",
    description: "This question comes up in almost every screening call. Here's how to answer it honestly, professionally, and without giving the interviewer a reason to worry.",
    tag: "Interview Technique",
    tagColor: "#2563EB",
    date: "March 22, 2026",
    readTime: "5 min read",
    author: "jordan",
    content: `
"Why are you leaving your current role?" or "Why did you leave your last job?" comes up in almost every initial screening call, and it is a question where candidates frequently make avoidable mistakes.

The question serves a few purposes. Interviewers want to understand what you are looking for, assess whether you are leaving under problematic circumstances, and get a sense of how you talk about previous employers when they are not in the room.

## The Two Main Mistakes

**Speaking negatively about a former employer.** Even if your reason for leaving is entirely justified, extensive criticism of your previous company, manager, or team creates concerns for the interviewer. They are thinking: will this person talk this way about us someday?

This does not mean you have to pretend everything was great. You can be honest about your reasons without making the previous organization the villain of your story.

**Being vague in a way that raises more questions than it answers.** "I'm just looking for something new" or "I felt like it was time for a change" are answers that invite follow-up. What changed? Why now?

## Reasons That Land Well

Answers that focus on what you are moving toward rather than what you are escaping from tend to work better.

"The scope of my role has reached its ceiling at my current company. I've done what I came to do, and I'm ready for work that's more complex and more consequential. This role is the next step I've been building toward."

"The company went through a significant restructuring, and the team I joined no longer exists in the same form. I took that as a moment to think carefully about what I wanted to do next rather than default to whatever was available."

"I made a deliberate decision to prioritize moving into [field/function]. My current company doesn't have a path to do that, and I've been planning this transition for about six months."

All three of these are honest, forward-looking, and professional. None of them require you to criticize your current employer.

## When the Real Reason Is Harder

If you were laid off, say so directly. "The company had a significant reduction in force" is a complete and professional answer that requires no elaboration unless the interviewer asks.

If you are leaving because of a difficult manager or work environment, frame it as a values or direction mismatch rather than a personality complaint. "The leadership style and culture at my current company turned out not to be a fit for how I work best" is honest without being a personal attack.
    `,
  },
  {
    slug: "interview-follow-up-email",
    title: "How to Write a Follow-Up Email After an Interview",
    description: "A follow-up email is a small thing that candidates either skip or handle poorly. Here's what actually makes one worth reading, and what you should include.",
    tag: "Career",
    tagColor: "#8B5CF6",
    date: "March 20, 2026",
    readTime: "4 min read",
    author: "jordan",
    content: `
A follow-up email after an interview is not going to save a bad performance, and a missing one will not disqualify a strong candidate. But a well-written follow-up does two useful things: it confirms your interest, and it gives you one more chance to be memorable.

Most follow-up emails are either perfunctory thank-you notes or lengthy recaps that no one reads. The best ones are short, specific, and add something to the conversation.

## When to Send It

Within 24 hours of the interview. Same day is better. The closer in time to the conversation, the more genuine the follow-up reads.

If you interviewed with multiple people, send individual emails to each one. Do not send a group email. Each interviewer should receive a note that acknowledges something specific from your conversation with them.

## What to Include

**A genuine thank-you.** One sentence. Direct and brief.

**Something specific from the conversation.** This is the part most candidates skip, and it is the most important part. Reference something particular from your discussion. A question they asked that you found interesting. A point they made about the company that stayed with you. A problem they described that you have been thinking about since.

This specificity signals that you were genuinely engaged in the conversation, and it distinguishes your email from the dozens of generic thank-you notes they receive.

**A brief restatement of your interest.** One to two sentences on why this role is the right next step for you. Keep it forward-looking.

**No asks.** Do not ask about timeline, status, or next steps in the follow-up email. If you need to follow up on logistics, send a separate email after a reasonable waiting period.

## What to Skip

Long paragraphs recapping your qualifications. They already have your resume. Extensive detail about how perfect you are for the role. This reads as anxious rather than confident. Any kind of negotiation or condition-setting. That conversation comes after an offer.

## Example

"Thank you for the time this afternoon. I particularly appreciated your point about how the team approaches product decisions without always having complete data. That matches how I have had to operate at my current company, and it's one of the things that makes this role appealing to me. I am very interested in moving forward and hope to talk again soon."

Short. Specific. Forward. That is all it needs to be.
    `,
  },
];
