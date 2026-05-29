import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  FeedbackDashboardData,
  FeedbackInsight,
  FeedbackPriority,
  FeedbackSentiment,
} from "@/types/feedback";

type FeedbackRow = {
  feedback_id?: unknown;
  feedback_at?: unknown;
  source?: unknown;
  player_id?: unknown;
  player_segment?: unknown;
  platform?: unknown;
  game_version?: unknown;
  game_area_hint?: unknown;
  player_feedback?: unknown;
  [key: string]: unknown;
};

type RuleMatch<T extends string> = {
  value: T;
  keywords: string[];
};

const categoryRules: RuleMatch<string>[] = [
  {
    value: "Performance & Stability",
    keywords: ["แลค", "เฟรม", "ค้าง", "crash", "bug", "หลุด", "เข้าไม่ได้"],
  },
  {
    value: "Gacha & Economy",
    keywords: ["กาชา", "rate up", "ตัวซ้ำ", "ชิ้นส่วน", "เพชร", "pay to win", "แลก"],
  },
  {
    value: "Live Ops & Event",
    keywords: ["event", "ภารกิจ", "stamina", "mini game", "ปฏิทิน", "daily"],
  },
  {
    value: "Onboarding & UX",
    keywords: ["tutorial", "เริ่มเล่น", "อธิบาย", "จำไม่ทัน", "ช่วงแรก"],
  },
  {
    value: "Progression & Rewards",
    keywords: ["ของรางวัล", "upgrade", "ฟาร์ม", "ด่าน", "shop", "อันดับ"],
  },
  {
    value: "Community & Guild",
    keywords: ["guild", "community", "ทีมงานตอบ", "support"],
  },
  {
    value: "Story & Audio",
    keywords: ["เนื้อเรื่อง", "เสียงพากย์", "ธีม"],
  },
];

const positiveSignals = ["ชอบ", "สนุก", "น่ารัก", "ขอบคุณ", "ดีมาก", "เร็วกว่าที่คิด", "ไม่เครียด"];
const negativeSignals = [
  "แลค",
  "เฟรมตก",
  "ยาก",
  "น้อยไป",
  "pay to win",
  "ซ้ำ",
  "grind",
  "ท้อ",
  "บังคับ",
  "ไม่คุ้ม",
  "ไม่ทัน",
  "กระทบ",
  "เกินไป",
  "สู้ยาก",
];

const ownerByCategory: Record<string, string> = {
  "Performance & Stability": "Engineering",
  "Gacha & Economy": "Game Economy",
  "Live Ops & Event": "LiveOps",
  "Onboarding & UX": "UX Design",
  "Progression & Rewards": "Game Design",
  "Community & Guild": "Community",
  "Story & Audio": "Narrative",
};

const getString = (row: FeedbackRow, keys: string[], fallback = "-") => {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
};

const hasAnySignal = (text: string, signals: string[]) =>
  signals.some((signal) => text.includes(signal.toLowerCase()));

const getCategory = (row: FeedbackRow, text: string) => {
  const stored = getString(row, ["category", "feedback_category", "ai_category"], "");

  if (stored) {
    return stored;
  }

  const area = getString(row, ["game_area_hint"], "");
  const searchable = `${text} ${area}`.toLowerCase();
  const matchedRule = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => searchable.includes(keyword.toLowerCase())),
  );

  return matchedRule?.value ?? "General Feedback";
};

const getSentiment = (row: FeedbackRow, text: string): FeedbackSentiment => {
  const stored = getString(row, ["sentiment", "ai_sentiment"], "");

  if (["Positive", "Mixed", "Neutral", "Negative"].includes(stored)) {
    return stored as FeedbackSentiment;
  }

  const searchable = text.toLowerCase();
  const isPositive = hasAnySignal(searchable, positiveSignals);
  const isNegative = hasAnySignal(searchable, negativeSignals);

  if (isPositive && isNegative) {
    return "Mixed";
  }

  if (isPositive) {
    return "Positive";
  }

  if (isNegative) {
    return "Negative";
  }

  return "Neutral";
};

const getPriority = (
  row: FeedbackRow,
  text: string,
  category: string,
  sentiment: FeedbackSentiment,
): FeedbackPriority => {
  const stored = getString(row, ["priority", "ai_priority"], "");

  if (["Critical", "High", "Medium", "Low"].includes(stored)) {
    return stored as FeedbackPriority;
  }

  const searchable = text.toLowerCase();
  const segment = getString(row, ["player_segment"], "").toLowerCase();
  const criticalSignals = ["เข้าไม่ได้", "crash", "ค้าง", "เติมเงิน", "หาย"];
  const highSignals = ["กระทบการเล่น", "pay to win", "เฟรมตก", "ท้อ", "บังคับ", "สู้ยาก", "ยากเกินไป"];

  if (hasAnySignal(searchable, criticalSignals)) {
    return "Critical";
  }

  if (
    hasAnySignal(searchable, highSignals) ||
    (category === "Performance & Stability" && sentiment !== "Positive") ||
    (segment === "whale" && sentiment === "Negative")
  ) {
    return "High";
  }

  if (sentiment === "Negative" || sentiment === "Mixed") {
    return "Medium";
  }

  return "Low";
};

const cleanFeedback = (text: string) =>
  text
    .replace(/^อยากฝากทีมงานว่า\s*/i, "")
    .replace(/^เจอบ่อยมากว่า\s*/i, "")
    .replace(/^ส่วนตัวคิดว่า\s*/i, "")
    .replace(/\s*ขอบคุณครับ\/ค่ะ\s*/i, "")
    .replace(/\s*รบกวนช่วยดูให้หน่อย\s*/i, "")
    .trim();

const truncate = (text: string, length: number) => {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length - 1).trim()}...`;
};

const getAiSummary = (row: FeedbackRow, feedback: string, category: string) => {
  const stored = getString(row, ["ai_summary", "summary", "feedback_summary"], "");

  if (stored) {
    return stored;
  }

  const cleaned = cleanFeedback(feedback);

  if (!cleaned) {
    return `Needs review under ${category}.`;
  }

  return truncate(cleaned, 108);
};

const getOwner = (row: FeedbackRow, category: string) => {
  const stored = getString(row, ["suggested_owner", "owner", "ai_owner"], "");

  if (stored) {
    return stored;
  }

  return ownerByCategory[category] ?? "Player Support";
};

const normalizeFeedback = (row: FeedbackRow): FeedbackInsight => {
  const feedback = getString(row, ["player_feedback", "feedback", "message"], "");
  const category = getCategory(row, feedback);
  const sentiment = getSentiment(row, feedback);
  const priority = getPriority(row, feedback, category, sentiment);

  return {
    id: getString(row, ["feedback_id", "id"]),
    date: getString(row, ["feedback_at", "created_at"], "") || null,
    source: getString(row, ["source"]),
    playerId: getString(row, ["player_id"]),
    segment: getString(row, ["player_segment"]),
    platform: getString(row, ["platform"]),
    version: getString(row, ["game_version"]),
    area: getString(row, ["game_area_hint"], "Unspecified"),
    feedback,
    category,
    sentiment,
    priority,
    aiSummary: getAiSummary(row, feedback, category),
    suggestedOwner: getOwner(row, category),
  };
};

export async function getFeedbackDashboardData(): Promise<FeedbackDashboardData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      feedback: [],
      total: 0,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or Supabase public key.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error, count } = await supabase
    .from("player_feedback")
    .select("*", { count: "exact" })
    .order("feedback_at", { ascending: false })
    .limit(300);

  if (error) {
    return {
      feedback: [],
      total: 0,
      error: error.message,
    };
  }

  const feedback = (data ?? []).map((row) => normalizeFeedback(row as FeedbackRow));

  return {
    feedback,
    total: count ?? feedback.length,
    error: null,
  };
}
