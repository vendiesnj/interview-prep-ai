import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Metadata } from "next";
import LandingPage from "@/app/components/LandingPage";

export const metadata: Metadata = {
  title: "Signal — Know exactly how you interview",
  description:
    "Signal scores your answers across seven communication dimensions, identifies your archetype, and tells you the one thing to fix before your next real interview.",
  openGraph: {
    title: "Signal — Know exactly how you interview",
    description:
      "AI interview coaching that goes beyond a score. Dimension analysis, communication archetypes, vocal delivery signals, and language analytics.",
    type: "website",
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return <LandingPage />;
}
