export type ReportCategoryId =
  | "child_safety"
  | "violence"
  | "hate_harassment"
  | "adult_content"
  | "copyright"
  | "defamation"
  | "spam"
  | "other";

export type ReportPriority = "critical" | "high" | "medium" | "low";

export type ReportCategory = {
  id: ReportCategoryId;
  label: string;
  description: string;
  /** Mirrors the database trigger. Used for the future admin panel, never trusted from the client. */
  priority: ReportPriority;
};

export const DESCRIPTION_MAX_LENGTH = 1000;
export const OTHER_MIN_DESCRIPTION_LENGTH = 10;

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "child_safety",
    label: "Child safety",
    description: "Content that endangers or sexualizes minors.",
    priority: "critical",
  },
  {
    id: "violence",
    label: "Violence or harmful activity",
    description: "Terrorism, graphic violence, or promoting physical harm.",
    priority: "critical",
  },
  {
    id: "hate_harassment",
    label: "Hate speech or harassment",
    description: "Targeting a person or group with hatred, abuse, or bullying.",
    priority: "high",
  },
  {
    id: "adult_content",
    label: "Adult or sexually explicit content",
    description: "Sexual or inappropriate material that is not suitable for all readers.",
    priority: "high",
  },
  {
    id: "copyright",
    label: "Copyright violation",
    description: "A story copied from another author without permission.",
    priority: "medium",
  },
  {
    id: "defamation",
    label: "Defamation or personal attack",
    description: "False or damaging statements about a real person.",
    priority: "medium",
  },
  {
    id: "spam",
    label: "Spam, scam or misleading content",
    description: "Unwanted links, advertising, or deceptive material.",
    priority: "low",
  },
  {
    id: "other",
    label: "Something else",
    description: "A problem that does not fit the options above.",
    priority: "low",
  },
];

/** Target review times for the admin panel. */
export const PRIORITY_SLA: Record<ReportPriority, string> = {
  critical: "Immediate action",
  high: "Within 24 hours",
  medium: "Within 48 hours",
  low: "Weekly batch review",
};
