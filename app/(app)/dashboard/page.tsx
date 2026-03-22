import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const PERSONA_TO_PATH: Record<string, string> = {
  pre_college: "/pre-college",
  during_college: "/during-college",
  post_college: "/post-college",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const persona = (session?.user as any)?.demoPersona ?? "during_college";
  redirect(PERSONA_TO_PATH[persona] ?? "/during-college");
}
