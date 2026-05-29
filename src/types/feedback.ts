export type FeedbackSentiment = "Positive" | "Mixed" | "Neutral" | "Negative";

export type FeedbackPriority = "Critical" | "High" | "Medium" | "Low";

export type FeedbackInsight = {
  id: string;
  date: string | null;
  source: string;
  playerId: string;
  segment: string;
  platform: string;
  version: string;
  area: string;
  feedback: string;
  category: string;
  sentiment: FeedbackSentiment;
  priority: FeedbackPriority;
  aiSummary: string;
  suggestedOwner: string;
};

export type FeedbackDashboardData = {
  feedback: FeedbackInsight[];
  total: number;
  error: string | null;
};
