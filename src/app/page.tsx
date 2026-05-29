import { connection } from "next/server";
import DashboardShell from "@/components/dashboard-shell";
import { getFeedbackDashboardData } from "@/lib/feedback";

export default async function Dashboard() {
  await connection();

  const data = await getFeedbackDashboardData();

  return <DashboardShell feedback={data.feedback} total={data.total} error={data.error} />;
}
