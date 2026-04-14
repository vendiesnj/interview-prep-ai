import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Metadata } from "next";
import LandingPage from "@/app/components/LandingPage";

export const metadata: Metadata = {
  title: "Signal — Know exactly how you interview",
  description:
    "Signal scores your answers across seven communication dimensions, identifies your archetype, and tells you the one thing to fix before your next real interview.",
  alternates: {
    canonical: "https://signalhq.us",
  },
  openGraph: {
    title: "Signal — Know exactly how you interview",
    description:
      "AI interview coaching that goes beyond a score. Dimension analysis, communication archetypes, vocal delivery signals, and language analytics.",
    url: "https://signalhq.us",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://signalhq.us/#app",
      "name": "Signal HQ",
      "url": "https://signalhq.us",
      "description": "AI-powered interview practice platform that scores answers across seven communication dimensions, identifies delivery archetypes, and provides personalized coaching feedback.",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free to start",
      },
      "featureList": [
        "7-dimension communication scoring",
        "15 delivery archetypes",
        "STAR method analysis",
        "Vocal delivery metrics",
        "Mock interview sessions",
        "Career assessment (RIASEC)",
        "Personalized coaching feedback",
        "Progress tracking",
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "120",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://signalhq.us/#org",
      "name": "Signal HQ",
      "url": "https://signalhq.us",
      "logo": {
        "@type": "ImageObject",
        "url": "https://signalhq.us/opengraph-image",
        "width": 1200,
        "height": 630,
      },
      "sameAs": [],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "url": "https://signalhq.us",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://signalhq.us/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Signal score my interview answers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Signal analyzes your spoken answers across seven communication dimensions: Narrative Clarity, Evidence Quality, Ownership & Agency, Response Control, Cognitive Depth, Presence & Confidence, and Vocal Engagement. Each dimension is scored on a 1–10 scale with specific coaching notes.",
          },
        },
        {
          "@type": "Question",
          "name": "What is a delivery archetype?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A delivery archetype is a pattern in how you communicate in interviews. Signal identifies 15 distinct archetypes — such as The Anchor, The Qualifier, or The Storyteller — and gives you targeted coaching to evolve toward stronger patterns.",
          },
        },
        {
          "@type": "Question",
          "name": "Can universities use Signal for career services?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Signal offers a university platform with a dedicated admin dashboard, student roster management, cohort analytics, assignment tracking, and custom branding for career centers.",
          },
        },
        {
          "@type": "Question",
          "name": "What is a mock interview session?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A mock interview session is a full conversational AI interview with a GPT-4o powered hiring manager. You answer 5 questions verbally, receive a readiness score, and get coaching across all 7 dimensions plus an interview arc showing how your performance evolved question by question.",
          },
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://signalhq.us/#website",
      "url": "https://signalhq.us",
      "name": "Signal HQ",
      "description": "AI interview practice and career coaching platform",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://signalhq.us/signup",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
