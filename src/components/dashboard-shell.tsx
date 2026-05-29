"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  Database,
  Download,
  FileText,
  Filter,
  MessageSquareShare,
  Moon,
  Percent,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  TrendingUp,
  User,
  Utensils,
} from "lucide-react";
import type { FeedbackInsight, FeedbackPriority, FeedbackSentiment } from "@/types/feedback";

type DashboardShellProps = {
  feedback: FeedbackInsight[];
  total: number;
  error: string | null;
  activeTab?: string;
};

type TabId = "feedback" | "gacha" | "food";

type CountItem = {
  label: string;
  count: number;
};

type ReportStats = {
  categories: CountItem[];
  sentiments: CountItem[];
  priorities: CountItem[];
  owners: CountItem[];
  highPriorityCount: number;
  criticalCount: number;
  negativeCount: number;
  mixedCount: number;
  positiveCount: number;
  topCategory: string;
  topOwner: string;
};

const tabs = [
  {
    id: "feedback" as TabId,
    label: "Player Feedback Insight Report",
    icon: MessageSquareShare,
  },
  {
    id: "gacha" as TabId,
    label: "Gacha DropRate",
    icon: Percent,
  },
  {
    id: "food" as TabId,
    label: "Food-assistant",
    icon: Utensils,
  },
];

const sentimentStyles: Record<FeedbackSentiment, string> = {
  Positive: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  Mixed: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  Neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-700/40 dark:text-slate-200",
  Negative: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200",
};

const priorityStyles: Record<FeedbackPriority, string> = {
  Critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200",
  Medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  Low: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-200",
};

const reportPalette = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#be123c", "#475569"];

const countBy = (items: FeedbackInsight[], getValue: (item: FeedbackInsight) => string) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const value = getValue(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatPercent = (count: number, total: number) => {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
};

const getInitialDarkMode = () => {
  // Always return false on server to avoid hydration mismatch
  // Client will update via useEffect
  return false;
};

const getStats = (rows: FeedbackInsight[]): ReportStats => {
  const categories = countBy(rows, (item) => item.category);
  const sentiments = countBy(rows, (item) => item.sentiment);
  const priorities = countBy(rows, (item) => item.priority);
  const owners = countBy(rows, (item) => item.suggestedOwner);
  const highPriorityCount = rows.filter((item) => item.priority === "Critical" || item.priority === "High").length;

  return {
    categories,
    sentiments,
    priorities,
    owners,
    highPriorityCount,
    criticalCount: rows.filter((item) => item.priority === "Critical").length,
    negativeCount: rows.filter((item) => item.sentiment === "Negative").length,
    mixedCount: rows.filter((item) => item.sentiment === "Mixed").length,
    positiveCount: rows.filter((item) => item.sentiment === "Positive").length,
    topCategory: categories[0]?.label ?? "-",
    topOwner: owners[0]?.label ?? "-",
  };
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
};

// ─── Shared animation variants ───────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 340, damping: 30 },
  },
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const staggerContainerFast = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <motion.section
      variants={fadeUp}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
          <motion.p
            className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.15 }}
          >
            {value}
          </motion.p>
        </div>
        <motion.div
          className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          whileHover={{ rotate: 8, scale: 1.12 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
      <p className="mt-4 text-sm leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </motion.section>
  );
}

function DistributionBar({ item, total, color }: { item: CountItem; total: number; color: string }) {
  const pct = formatPercent(item.count, total);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">
          {item.count} · {pct}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: pct }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={fadeUp}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}

function ReportBar({ item, total, color, compact = false }: { item: CountItem; total: number; color: string; compact?: boolean }) {
  return (
    <div className={`grid items-center text-[11px] text-slate-700 ${compact ? "grid-cols-[55px_1fr_auto] gap-2" : "grid-cols-[115px_1fr_54px] gap-8"}`}>
      <span className="truncate font-semibold">{item.label}</span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: formatPercent(item.count, total), backgroundColor: color }} />
      </div>
      <span className="text-right font-semibold">
        {compact ? formatPercent(item.count, total) : `${item.count} (${formatPercent(item.count, total)})`}
      </span>
    </div>
  );
}

function ShortReportPage({
  rows,
  total,
  stats,
  page1Ref,
  page2Ref,
  page3Ref,
}: {
  rows: FeedbackInsight[];
  total: number;
  stats: ReportStats;
  page1Ref: React.RefObject<HTMLDivElement | null>;
  page2Ref: React.RefObject<HTMLDivElement | null>;
  page3Ref: React.RefObject<HTMLDivElement | null>;
}) {
  const topRisks = rows
    .filter((item) => item.priority === "Critical" || item.priority === "High")
    .slice(0, 5);
  const topCategories = stats.categories.slice(0, 8);
  const topOwners = stats.owners.slice(0, 8);
  const topPriorities = stats.priorities.slice(0, 4);
  const topSentiments = stats.sentiments.slice(0, 4);
  const generatedAt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const ReportHeader = ({ page }: { page: number }) => (
    <div className="flex items-start justify-between border-b border-slate-200 pb-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Ai-Exam by BEST</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Player Feedback Short Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generated {generatedAt} · Source table `player_feedback` · Page {page}/3
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Dataset</p>
        <p className="mt-1 text-2xl font-bold">{rows.length.toLocaleString()}</p>
        <p className="text-xs text-slate-500">visible of {total.toLocaleString()} records</p>
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none fixed left-[-2000px] top-0 z-[-1] opacity-0 flex flex-col gap-10">
      {/* Page 1: Overview */}
      <div ref={page1Ref} className="h-[794px] w-[1123px] bg-white p-8 font-sans text-slate-900">
        <ReportHeader page={1} />
        
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950 mb-2">1. Executive Summary</h2>
            <p className="text-sm leading-6 text-amber-950">
              Highest volume topic is <b>{stats.topCategory}</b>. Negative or mixed feedback accounts for{" "}
              <b>{formatPercent(stats.negativeCount + stats.mixedCount, rows.length)}</b>, while{" "}
              <b>{formatPercent(stats.highPriorityCount, rows.length)}</b> of visible items are Critical/High.
              First-pass ownership should start with <b>{stats.topOwner}</b>, then route category-specific queues.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">2. Feedback Overview</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                ["Total Feedback", rows.length.toLocaleString(), `${formatPercent(rows.length, total)} of loaded dataset`],
                ["Critical / High", stats.highPriorityCount.toLocaleString(), `${formatPercent(stats.highPriorityCount, rows.length)} need fast triage`],
                ["Negative Share", stats.negativeCount.toLocaleString(), `${formatPercent(stats.negativeCount, rows.length)} negative records`],
                ["Top Owner", stats.topOwner, `${topOwners[0]?.count ?? 0} routed items`],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 leading-tight">{value}</p>
                  <p className="mt-2 text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">4. Sentiment Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-lg border border-slate-200 p-5">
                <h3 className="text-sm font-bold mb-4">Sentiment Breakdown</h3>
                <div className="space-y-4">
                  {topSentiments.map((item, index) => (
                    <ReportBar key={item.label} item={item} total={rows.length} color={reportPalette[index]} compact />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-5">
                <h3 className="text-sm font-bold mb-4">Priority Breakdown</h3>
                <div className="space-y-4">
                  {topPriorities.map((item, index) => (
                    <ReportBar key={item.label} item={item} total={rows.length} color={reportPalette[index + 2]} compact />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2: Deep Dive */}
      <div ref={page2Ref} className="h-[794px] w-[1123px] bg-white p-8 font-sans text-slate-900">
        <ReportHeader page={2} />
        
        <div className="mt-6 grid grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 flex-1">
              <h2 className="text-lg font-bold text-rose-950 mb-4">3. Top 5 Issues (Critical & High Risk)</h2>
              <div className="space-y-4">
                {topRisks.length > 0 ? (
                  topRisks.map((item) => (
                    <div key={item.id} className="border-b border-rose-200/50 pb-3 last:border-b-0 last:pb-0 bg-white/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-rose-950">
                          {item.id} · {item.priority} · {item.category}
                        </p>
                        <span className="text-[10px] text-rose-800 font-semibold">{item.suggestedOwner}</span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-rose-900">{item.aiSummary}</p>
                      <p className="mt-1 text-xs text-rose-700/80 italic">"{truncate(item.feedback, 120)}"</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-rose-900">No critical or high issues found.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-lg font-bold text-orange-950 mb-4">6. Risk / Things to Watch</h2>
              <p className="text-sm leading-6 text-orange-950">
                The volume of <b>{stats.topCategory}</b> issues represents the highest engagement risk.
                With {stats.highPriorityCount} critical/high priority items overall, immediate review is required.
                Watch for sudden spikes in negative sentiment within <b>{topCategories[1]?.label ?? "other areas"}</b>.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-6 flex-1">
              <h2 className="text-lg font-bold text-teal-950 mb-4">5. Recommended Actions</h2>
              <ol className="space-y-3 text-sm leading-6 text-teal-950 list-decimal pl-4">
                <li>Review Critical/High items with <b>{stats.topOwner}</b> within the next sprint triage.</li>
                <li>Convert the top category (<b>{stats.topCategory}</b>) into a tracked issue theme with owner and due date.</li>
                <li>Close the loop in community/support for repeated player pain points to manage expectations.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Page 3: Appendix */}
      <div ref={page3Ref} className="h-[794px] w-[1123px] bg-white p-8 font-sans text-slate-900">
        <ReportHeader page={3} />
        
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">7. Appendix: Category Breakdown</h2>
              <div className="space-y-4">
                {topCategories.map((item, index) => (
                  <ReportBar key={item.label} item={item} total={rows.length} color={reportPalette[index % reportPalette.length]} />
                ))}
              </div>
            </div>
            
            <div className="rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">7. Appendix: Suggested Owner Distribution</h2>
              <div className="space-y-4">
                {topOwners.map((item, index) => (
                  <ReportBar key={item.label} item={item} total={rows.length} color={reportPalette[index % reportPalette.length]} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-6">
              <h2 className="text-lg font-bold text-indigo-950 mb-4">8. Workflow Note</h2>
              <div className="space-y-4 text-sm leading-6 text-indigo-950">
                <p>
                  <b>Triage Cadence:</b> This report is generated as a snapshot of player feedback. It should be reviewed during weekly or bi-weekly sprint planning sessions.
                </p>
                <p>
                  <b>Escalation Path:</b> Any feedback marked as "Critical" should bypass the normal triage queue and be reported directly to the on-call engineer or lead.
                </p>
                <p>
                  <b>Closing the Loop:</b> Once fixes are deployed, coordinate with Community Management to update players on the resolved issues.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Data Notes & Methodology</h2>
              <p className="text-sm leading-6 text-slate-600">
                This report reflects the current dashboard filters at the time of export. Data categorization, sentiment analysis, priority assignment, summary generation, and owner routing are automated. Fields are normalized from Supabase records when present; otherwise, they are classified dynamically from raw feedback text.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackDashboard({
  rows,
  total,
  error,
  stats,
  categoryOptions,
  categoryFilter,
  setCategoryFilter,
}: {
  rows: FeedbackInsight[];
  total: number;
  error: string | null;
  stats: ReportStats;
  categoryOptions: CountItem[];
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
}) {
  return (
    <div className="space-y-6">
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
        >
          Supabase error: {error}
        </motion.div>
      ) : null}

      <motion.div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <MetricCard
          label="Feedback"
          value={rows.length.toLocaleString()}
          detail={`Loaded from ${total.toLocaleString()} Supabase records`}
          icon={MessageSquareShare}
        />
        <MetricCard
          label="Top Category"
          value={stats.topCategory}
          detail={`${stats.categories.length} active categories in the current view`}
          icon={BarChart3}
        />
        <MetricCard
          label="Negative"
          value={formatPercent(stats.negativeCount, rows.length)}
          detail={`${stats.negativeCount.toLocaleString()} negative feedback records`}
          icon={TrendingUp}
        />
        <MetricCard
          label="Critical / High"
          value={stats.highPriorityCount.toLocaleString()}
          detail={`${formatPercent(stats.highPriorityCount, rows.length)} need fast triage`}
          icon={ShieldAlert}
        />
      </motion.div>

      <motion.div
        className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <Panel title="Category Breakdown" subtitle="Feedback grouped by detected topic.">
          <div className="mb-5 flex justify-end">
            <motion.label
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              whileHover={{ scale: 1.02, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.label} value={category.label}>
                    {category.label}
                  </option>
                ))}
              </select>
            </motion.label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.categories.slice(0, 8).map((item, index) => (
              <DistributionBar
                key={item.label}
                item={item}
                total={rows.length}
                color={reportPalette[index % reportPalette.length]}
              />
            ))}
          </div>
        </Panel>

        <Panel title="AI Summary" subtitle="Condensed operational guidance for this view.">
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={fadeUp}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Main issue</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {stats.topCategory === "-"
                  ? "No feedback found for the selected view."
                  : `${stats.topCategory} is the largest topic, with ${stats.categories[0]?.count ?? 0} related feedback records.`}
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"
            >
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Priority signal</p>
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">
                {formatPercent(stats.highPriorityCount, rows.length)} of visible feedback needs fast triage.
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-400/20 dark:bg-teal-400/10"
            >
              <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">Suggested owner</p>
              <p className="mt-2 text-sm leading-6 text-teal-900 dark:text-teal-100">
                Route the largest queue to {stats.topOwner} for first pass review.
              </p>
            </motion.div>
          </motion.div>
        </Panel>
      </motion.div>

      <motion.div
        className="grid gap-4 xl:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <Panel title="Sentiment">
          <div className="space-y-4">
            {stats.sentiments.map((item, index) => (
              <DistributionBar
                key={item.label}
                item={item}
                total={rows.length}
                color={reportPalette[index % reportPalette.length]}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Priority">
          <div className="space-y-4">
            {stats.priorities.map((item, index) => (
              <DistributionBar
                key={item.label}
                item={item}
                total={rows.length}
                color={reportPalette[(index + 2) % reportPalette.length]}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Suggested Owner">
          <div className="space-y-4">
            {stats.owners.slice(0, 6).map((item, index) => (
              <DistributionBar
                key={item.label}
                item={item}
                total={rows.length}
                color={reportPalette[index % reportPalette.length]}
              />
            ))}
          </div>
        </Panel>
      </motion.div>

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Feedback Queue</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Feedback + Category + Sentiment + Priority + AI Summary + Suggested Owner
            </p>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Showing top {Math.min(rows.length, 100).toLocaleString()} of {rows.length.toLocaleString()} rows</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Feedback</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Sentiment</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">AI Summary</th>
                <th className="px-5 py-3">Suggested Owner</th>
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-slate-100 dark:divide-slate-800"
              variants={staggerContainerFast}
              initial="hidden"
              animate="show"
            >
              {rows.slice(0, 100).map((item) => (
                <motion.tr
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 28 } },
                  }}
                  className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  transition={{ duration: 0.12 }}
                >
                  <td className="max-w-[340px] px-5 py-4">
                    <p className="font-medium leading-6 text-slate-900 dark:text-slate-100">{item.feedback}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                      {item.id} · {formatDateTime(item.date)} · {item.source} · {item.segment}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">{item.category}</td>
                  <td className="px-5 py-4">
                    <Badge className={sentimentStyles[item.sentiment]}>{item.sentiment}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={priorityStyles[item.priority]}>{item.priority}</Badge>
                  </td>
                  <td className="max-w-[300px] px-5 py-4 leading-6 text-slate-600 dark:text-slate-300">{item.aiSummary}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-950 dark:text-slate-50">{item.suggestedOwner}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-500">
                      {item.platform} · {item.version} · {item.area}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-10 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            No feedback matches the current filters.
          </motion.div>
        ) : null}
      </motion.section>
    </div>
  );
}

function PlaceholderPanel({ activeTab }: { activeTab: TabId }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-700 dark:text-slate-100">{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          This dashboard section is ready for the next dataset.
        </p>
      </div>
    </div>
  );
}

export default function DashboardShell({ feedback, total, error, activeTab = "feedback" }: DashboardShellProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => getInitialDarkMode());
  const [isClient, setIsClient] = useState(false);
  const page1Ref = useRef<HTMLDivElement | null>(null);
  const page2Ref = useRef<HTMLDivElement | null>(null);
  const page3Ref = useRef<HTMLDivElement | null>(null);
  const categoryOptions = useMemo(() => countBy(feedback, (item) => item.category), [feedback]);

  // Initialize dark mode from localStorage after mount
  useEffect(() => {
    setIsClient(true);
    const savedTheme = window.localStorage.getItem("exam-ai-theme");
    
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else if (savedTheme === "white") {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      window.localStorage.setItem("exam-ai-theme", isDarkMode ? "dark" : "white");
    }
  }, [isDarkMode, isClient]);

  const filteredFeedback = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return feedback.filter((item) => {
      const matchesSearch =
        !search ||
        [
          item.id,
          item.feedback,
          item.category,
          item.sentiment,
          item.priority,
          item.aiSummary,
          item.suggestedOwner,
          item.source,
          item.segment,
          item.platform,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, feedback, searchTerm]);

  const stats = useMemo(() => getStats(filteredFeedback), [filteredFeedback]);

  const handleOpenReport = async () => {
    if (isGeneratingPdf) {
      return;
    }

    setIsGeneratingPdf(true);

    // Wait for React to mount the ShortReportPage component
    setTimeout(async () => {
      try {
        if (!page1Ref.current || !page2Ref.current || !page3Ref.current) {
          throw new Error("Report pages not mounted");
        }

        await document.fonts.ready;
        
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        const options = {
          backgroundColor: "#ffffff",
          pixelRatio: 1.5, // Reduced for faster generation
          quality: 0.95,
        };

        // Capture Page 1
        const image1 = await htmlToImage.toJpeg(page1Ref.current, options);
        pdf.addImage(image1, "JPEG", 0, 0, 297, 210);
        
        await new Promise((r) => setTimeout(r, 50)); // Yield to main thread
        
        // Capture Page 2
        const image2 = await htmlToImage.toJpeg(page2Ref.current, options);
        pdf.addPage();
        pdf.addImage(image2, "JPEG", 0, 0, 297, 210);

        await new Promise((r) => setTimeout(r, 50)); // Yield to main thread

        // Capture Page 3
        const image3 = await htmlToImage.toJpeg(page3Ref.current, options);
        pdf.addPage();
        pdf.addImage(image3, "JPEG", 0, 0, 297, 210);

        // Open PDF in new browser tab instead of downloading
        const pdfBlob = pdf.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, "_blank");
        
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Failed to generate report. Please try again.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 100); // 100ms delay to ensure DOM is ready
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen bg-slate-100 text-slate-900 selection:bg-teal-200 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-teal-500/30`}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-slate-950 text-slate-200 lg:w-72 lg:border-b-0 lg:border-r lg:border-slate-900 dark:border-slate-800">
          <div className="flex h-20 items-center px-5 lg:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-lg font-semibold tracking-tight text-white">Ai-Exam by BEST</span>
                <span className="text-xs font-medium text-slate-400">Feedback intelligence</span>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:overflow-visible lg:py-6">
            <div className="hidden px-3 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
              Main Dashboard
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.div
                  key={tab.id}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href={`/${tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}`}
                    className={`relative flex min-w-64 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors lg:w-full lg:min-w-0 ${
                      isActive
                        ? "bg-white text-slate-950"
                        : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-lg bg-white"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <Icon className="relative z-10 h-5 w-5" />
                    <span className="relative z-10">{tab.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="hidden border-t border-slate-800 p-4 lg:block">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">Supabase API</p>
                <p className="truncate text-xs text-slate-500">player_feedback</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-20 flex-col gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-8 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="relative w-full md:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search feedback, owner, priority..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900" aria-label="Theme mode">
                <button
                  type="button"
                  onClick={() => setIsDarkMode(false)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    !isDarkMode
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  White
                </button>
                <button
                  type="button"
                  onClick={() => setIsDarkMode(true)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    isDarkMode
                      ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                      : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </button>
              </div>
              <motion.button
                type="button"
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <motion.span
                  whileTap={{ rotate: 180 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="inline-flex"
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.span>
                Refresh
              </motion.button>
              <motion.button
                type="button"
                onClick={handleOpenReport}
                disabled={isGeneratingPdf}
                whileHover={!isGeneratingPdf ? { scale: 1.05, boxShadow: "0 4px 14px rgba(15,118,110,0.35)" } : {}}
                whileTap={!isGeneratingPdf ? { scale: 0.96 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isGeneratingPdf ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-flex"
                  >
                    <Download className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {isGeneratingPdf ? "Generating..." : "Report"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 12 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, rotate: -20 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </motion.button>
            </div>
          </header>

          <div className="flex-1 p-5 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 28,
                  mass: 0.8,
                }}
                className="space-y-6"
              >
                <motion.div
                  className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between dark:border-slate-800"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.05 }}
                >
                  <div>
                    <motion.div
                      className="mb-3 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22, delay: 0.1 }}
                    >
                      <motion.span
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        className="inline-flex"
                      >
                        <Activity className="h-3.5 w-3.5" />
                      </motion.span>
                      Supabase connected · player_feedback
                    </motion.div>
                    <motion.h1
                      className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.12 }}
                    >
                      {tabs.find((tab) => tab.id === activeTab)?.label}
                    </motion.h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Live feedback triage dashboard with category, sentiment, priority, AI summary, and owner routing.
                    </p>
                  </div>
                </motion.div>

                {activeTab === "feedback" ? (
                  <FeedbackDashboard
                    rows={filteredFeedback}
                    total={total}
                    error={error}
                    stats={stats}
                    categoryOptions={categoryOptions}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                  />
                ) : (
                  <PlaceholderPanel activeTab={activeTab as TabId} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {isGeneratingPdf && (
            <ShortReportPage rows={filteredFeedback} total={total} stats={stats} page1Ref={page1Ref} page2Ref={page2Ref} page3Ref={page3Ref} />
          )}
        </main>
      </div>
    </div>
  );
}
