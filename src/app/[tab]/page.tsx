import { connection } from "next/server";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { getFeedbackDashboardData } from "@/lib/feedback";

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  await connection();

  const resolvedParams = await params;
  const tab = resolvedParams.tab.toLowerCase();

  const validTabs = ["feedback", "gacha", "food", "market", "social", "events"];
  if (!validTabs.includes(tab)) {
    notFound();
  }

  const data = await getFeedbackDashboardData();

  return <DashboardShell feedback={data.feedback} total={data.total} error={data.error} activeTab={tab} />;
}
