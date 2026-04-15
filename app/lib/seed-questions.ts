export interface SeedCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
  questions: string[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    key: "behavioral",
    label: "Behavioral",
    description: "Tell me about a time…",
    icon: "💬",
    questions: [
      "Tell me about a time you had to meet a tight deadline. How did you prioritize and what was the outcome?",
      "Describe a situation where you had to learn something new quickly. How did you approach it?",
      "Tell me about a time something didn't go as planned. What did you do and what happened?",
      "Describe a time you took initiative on a project or task without being asked.",
      "Give me an example of a goal you set for yourself, how you worked toward it, and what the result was.",
    ],
  },
  {
    key: "leadership",
    label: "Leadership",
    description: "Influence, decisions, direction",
    icon: "🎯",
    questions: [
      "Tell me about a time you led a group or project. How did you keep people aligned and moving forward?",
      "Describe a situation where you had to influence someone without direct authority over them.",
      "Tell me about a time you had to make a decision with incomplete information. How did you approach it?",
      "Give me an example of when you motivated others during a difficult or uncertain stretch.",
      "Describe a time you had to deliver difficult feedback to someone. How did you handle it?",
    ],
  },
  {
    key: "teamwork",
    label: "Teamwork",
    description: "Collaboration and conflict",
    icon: "🤝",
    questions: [
      "Tell me about a time you worked with someone who had a very different working style. How did you manage it?",
      "Describe a conflict you had with a teammate. How did you resolve it and what was the outcome?",
      "Give me an example of a time you stepped up to support a colleague who was struggling.",
      "Tell me about your most successful team project. What made it work and what was your role?",
      "Describe a time when your team disagreed on a direction. How was it resolved?",
    ],
  },
  {
    key: "problem_solving",
    label: "Problem Solving",
    description: "Analysis, creativity, resourcefulness",
    icon: "🔍",
    questions: [
      "Walk me through a complex problem you solved. How did you break it down and what did you decide?",
      "Tell me about a time you identified a problem before it became serious. What did you do?",
      "Describe a situation where your first solution didn't work. What did you try next?",
      "Give me an example of a time you used data or evidence to drive a decision.",
      "Tell me about a time you had to solve a problem with limited resources or time.",
    ],
  },
  {
    key: "communication",
    label: "Communication",
    description: "Clarity, persuasion, difficult conversations",
    icon: "📣",
    questions: [
      "Tell me about a time you had to deliver bad news to someone. How did you approach it?",
      "Describe a situation where there was a miscommunication on your team. How was it resolved?",
      "Give me an example of when you had to adapt your communication style for a specific audience.",
      "Tell me about a time you successfully persuaded someone to change their position or approach.",
      "Describe a difficult conversation you had to navigate. What was your approach and the outcome?",
    ],
  },
  {
    key: "career",
    label: "Career & Motivation",
    description: "Goals, growth, self-awareness",
    icon: "🚀",
    questions: [
      "Why are you pursuing this type of role? What draws you to it?",
      "What accomplishment are you most proud of in the last year and why?",
      "Tell me about a time you received critical feedback. How did you respond and what changed?",
      "Where do you see yourself in three years and what are you doing to get there?",
      "What's the most important thing you've learned about how you work best?",
    ],
  },
];

export function getSeedQuestions(categoryKey: string): string[] {
  return SEED_CATEGORIES.find((c) => c.key === categoryKey)?.questions ?? [];
}
