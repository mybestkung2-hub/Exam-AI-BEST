"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Download,
  Filter,
  MessageSquareShare,
  Percent,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Utensils,
} from "lucide-react";
import type { FeedbackInsight, FeedbackPriority, FeedbackSentiment } from "@/types/feedback";

type DashboardShellProps = {
  feedback: FeedbackInsight[];
  total: number;
  error: string | null;
};

type TabId = "feedback" | "gacha" | "food";

type CountItem = {
  label: string;
  count: number;
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
  Positive: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Mixed: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  Neutral: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  Negative: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

const priorityStyles: Record<FeedbackPriority, string> = {
  Critical: "border-red-400/40 bg-red-500/15 text-red-200",
  High: "border-orange-400/40 bg-orange-400/15 text-orange-200",
  Medium: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  Low: "border-teal-400/30 bg-teal-400/10 text-teal-200",
};

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

const exportFeedbackCsv = (rows: FeedbackInsight[]) => {
  const headers = [
    "Feedback ID",
    "Date",
    "Source",
    "Player",
    "Segment",
    "Platform",
    "Feedback",
    "Category",
    "Sentiment",
    "Priority",
    "AI Summary",
    "Suggested Owner",
  ];
  const body = rows.map((row) => [
    row.id,
    row.date ?? "",
    row.source,
    row.playerId,
    row.segment,
    row.platform,
    row.feedback,
    row.category,
    row.sentiment,
    row.priority,
    row.aiSummary,
    row.suggestedOwner,
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "player-feedback-insights.csv";
  link.click();
  URL.revokeObjectURL(url);
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  accentClass: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function DistributionBar({ item, total, tone }: { item: CountItem; total: number; tone: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-slate-200">{item.label}</span>
        <span className="shrink-0 text-slate-500">{item.count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: formatPercent(item.count, total) }} />
      </div>
    </div>
  );
}

function FeedbackDashboard({
  rows,
  total,
  error,
  categoryOptions,
  categoryFilter,
  setCategoryFilter,
}: {
  rows: FeedbackInsight[];
  total: number;
  error: string | null;
  categoryOptions: CountItem[];
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
}) {
  const categories = useMemo(() => countBy(rows, (item) => item.category), [rows]);
  const sentiments = useMemo(() => countBy(rows, (item) => item.sentiment), [rows]);
  const priorities = useMemo(() => countBy(rows, (item) => item.priority), [rows]);
  const owners = useMemo(() => countBy(rows, (item) => item.suggestedOwner), [rows]);
  const highPriorityCount = rows.filter((item) => item.priority === "Critical" || item.priority === "High").length;
  const negativeCount = rows.filter((item) => item.sentiment === "Negative").length;
  const topCategory = categories[0]?.label ?? "-";
  const topOwner = owners[0]?.label ?? "-";

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          Supabase error: {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <MetricCard
          label="Feedback"
          value={rows.length.toLocaleString()}
          detail={`Loaded from ${total.toLocaleString()} Supabase records`}
          icon={MessageSquareShare}
          accentClass="bg-teal-400/10 text-teal-200"
        />
        <MetricCard
          label="Category"
          value={topCategory}
          detail={`${categories.length} active categories in the current view`}
          icon={BarChart3}
          accentClass="bg-sky-400/10 text-sky-200"
        />
        <MetricCard
          label="Sentiment"
          value={formatPercent(negativeCount, rows.length)}
          detail="Negative feedback share"
          icon={TrendingUp}
          accentClass="bg-rose-400/10 text-rose-200"
        />
        <MetricCard
          label="Priority"
          value={highPriorityCount.toLocaleString()}
          detail="Critical and high priority items"
          icon={AlertTriangle}
          accentClass="bg-amber-400/10 text-amber-200"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Category Breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">Feedback grouped by detected topic.</p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all" className="bg-slate-950">
                  All categories
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.label} value={category.label} className="bg-slate-950">
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {categories.slice(0, 8).map((item, index) => (
              <DistributionBar
                key={item.label}
                item={item}
                total={rows.length}
                tone={index % 3 === 0 ? "bg-teal-400" : index % 3 === 1 ? "bg-sky-400" : "bg-amber-400"}
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-slate-100">AI Summary</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-teal-400/20 bg-teal-400/10 p-4">
              <p className="text-sm font-medium text-teal-100">Main Issue</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {topCategory === "-"
                  ? "No feedback found for the selected view."
                  : `${topCategory} is the largest topic, with ${categories[0]?.count ?? 0} related feedback records.`}
              </p>
            </div>
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-medium text-amber-100">Priority Signal</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {formatPercent(highPriorityCount, rows.length)} of visible feedback needs fast triage.
              </p>
            </div>
            <div className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-4">
              <p className="text-sm font-medium text-sky-100">Suggested Owner</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Route the largest queue to {topOwner} for first pass review.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Sentiment</h2>
          <div className="mt-5 space-y-4">
            {sentiments.map((item) => (
              <DistributionBar key={item.label} item={item} total={rows.length} tone="bg-emerald-400" />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Priority</h2>
          <div className="mt-5 space-y-4">
            {priorities.map((item) => (
              <DistributionBar key={item.label} item={item} total={rows.length} tone="bg-orange-400" />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Suggested Owner</h2>
          <div className="mt-5 space-y-4">
            {owners.slice(0, 6).map((item) => (
              <DistributionBar key={item.label} item={item} total={rows.length} tone="bg-sky-400" />
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Feedback Queue</h2>
            <p className="mt-1 text-sm text-slate-500">
              Feedback + Category + Sentiment + Priority + AI Summary + Suggested Owner
            </p>
          </div>
          <p className="text-sm text-slate-500">{rows.length.toLocaleString()} rows</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Feedback</th>
                <th className="px-5 py-4 font-medium">Category</th>
                <th className="px-5 py-4 font-medium">Sentiment</th>
                <th className="px-5 py-4 font-medium">Priority</th>
                <th className="px-5 py-4 font-medium">AI Summary</th>
                <th className="px-5 py-4 font-medium">Suggested Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((item) => (
                <tr key={item.id} className="align-top hover:bg-white/[0.035]">
                  <td className="max-w-[320px] px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-100">{item.feedback}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.id} · {formatDateTime(item.date)} · {item.source} · {item.segment}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{item.category}</td>
                  <td className="px-5 py-4">
                    <Badge className={sentimentStyles[item.sentiment]}>{item.sentiment}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={priorityStyles[item.priority]}>{item.priority}</Badge>
                  </td>
                  <td className="max-w-[280px] px-5 py-4 leading-6 text-slate-300">{item.aiSummary}</td>
                  <td className="px-5 py-4 text-slate-300">
                    <span className="font-medium text-slate-100">{item.suggestedOwner}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.platform} · {item.version} · {item.area}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No feedback matches the current filters.</div>
        ) : null}
      </section>
    </div>
  );
}

function PlaceholderPanel({ activeTab }: { activeTab: TabId }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-white/[0.035] p-10 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-300">{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          This dashboard section is ready for the next dataset.
        </p>
      </div>
    </div>
  );
}

export default function DashboardShell({ feedback, total, error }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("feedback");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const categoryOptions = useMemo(() => countBy(feedback, (item) => item.category), [feedback]);

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

  return (
    <div className="min-h-screen bg-[#111412] text-slate-200 selection:bg-teal-400/30">
      <div className="min-h-screen bg-[linear-gradient(135deg,rgba(20,24,21,0.96),rgba(14,17,19,0.98)_42%,rgba(19,17,13,0.96))]">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="border-b border-white/10 bg-black/20 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
            <div className="flex h-20 items-center px-5 lg:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-400/10 text-teal-200">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-slate-100">Ai-Exam by BEST</span>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-2 lg:overflow-visible lg:py-6">
              <div className="hidden px-3 pb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 lg:block">
                Main Dashboard
              </div>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex min-w-64 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition lg:w-full lg:min-w-0 ${
                      isActive
                        ? "border border-teal-300/25 bg-teal-400/10 text-teal-100"
                        : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100"
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="active-tab"
                        className="absolute inset-0 rounded-lg bg-teal-300/5"
                        transition={{ type: "spring", stiffness: 320, damping: 34 }}
                      />
                    ) : null}
                    <Icon className="relative z-10 h-5 w-5" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="hidden border-t border-white/10 p-4 lg:block">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">Admin User</p>
                  <p className="truncate text-xs text-slate-500">admin@nexus.io</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <header className="flex min-h-20 flex-col gap-4 border-b border-white/10 bg-black/10 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-8">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search feedback, owner, priority..."
                  className="w-full rounded-lg border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => exportFeedbackCsv(filteredFeedback)}
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-sm font-medium text-teal-100 transition hover:bg-teal-400/15"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 p-5 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-slate-400">
                        <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                        Supabase connected · player_feedback
                      </div>
                      <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
                        {tabs.find((tab) => tab.id === activeTab)?.label}
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Live feedback triage dashboard with category, sentiment, priority, AI summary, and owner routing.
                      </p>
                    </div>
                  </div>

                  {activeTab === "feedback" ? (
                    <FeedbackDashboard
                      rows={filteredFeedback}
                      total={total}
                      error={error}
                      categoryOptions={categoryOptions}
                      categoryFilter={categoryFilter}
                      setCategoryFilter={setCategoryFilter}
                    />
                  ) : (
                    <PlaceholderPanel activeTab={activeTab} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
