export const prices = {
  site: 150000,
  initial: 20000,
  final: 130000,
  first: 19900,
  revision: 15000,
  page: 18000,
  pro: 3900,
} as const;
export type Phase =
  | "DRAFT_ONBOARDING"
  | "AWAITING_INITIAL_PAYMENT"
  | "DIRECTION"
  | "BUILDING"
  | "REVIEW"
  | "REVISION_IN_PROGRESS"
  | "APPROVED_AWAITING_FINAL_PAYMENT"
  | "LAUNCH"
  | "LIVE";
export type Status = "DRAFT" | "SUBMITTED" | "IN_PROGRESS" | "DONE";
export type Point = { x: number; y: number };
export type Stroke = {
  id: string;
  type: "pen" | "arrow" | "rect" | "text";
  points: Point[];
  text?: string;
};
export type BoardObject = {
  id: string;
  type: "text" | "image" | "video" | "audio" | "file" | "link" | "drawing";
  text: string;
  assetId?: string;
  url?: string;
  name?: string;
  group?: string;
  strokes?: Stroke[];
  notes?: { time: number; text: string }[];
  target?: {
    page: string;
    width: number;
    scroll: number;
    selector?: string;
    rect?: { x: number; y: number; width: number; height: number };
  };
};
export type DocumentData = { objects: BoardObject[]; [key: string]: unknown };
export type Board = {
  id: string;
  project_id: string;
  kind: string;
  status: Status;
  version: number;
  data: DocumentData;
  submitted_data: DocumentData | null;
  submitted_at: string | null;
  locked_at: string | null;
};
export type Project = {
  id: string;
  owner_id: string;
  name: string;
  phase: Phase;
  package: "SITE" | "FIRST";
  version: number;
  brief: Record<string, unknown>;
  revision_limit: number;
  revision_used: number;
  pro: boolean;
  preview_url: string | null;
  live_url: string | null;
  build_step: string;
  launch: Record<string, unknown>;
  initial_paid_at: string | null;
  final_paid_at: string | null;
};
export const phaseLabels: Record<Phase, string> = {
  DRAFT_ONBOARDING: "Business information",
  AWAITING_INITIAL_PAYMENT: "Payment required",
  DIRECTION: "Your Initial Direction",
  BUILDING: "Building your site",
  REVIEW: "Ready for review",
  REVISION_IN_PROGRESS: "Updating your site",
  APPROVED_AWAITING_FINAL_PAYMENT: "Payment required",
  LAUNCH: "Ready for launch",
  LIVE: "Live",
};
export const sections: Record<Phase, string[]> = {
  DRAFT_ONBOARDING: [],
  AWAITING_INITIAL_PAYMENT: [],
  DIRECTION: ["overview", "direction"],
  BUILDING: ["overview", "direction"],
  REVIEW: ["overview", "direction", "review", "pages"],
  REVISION_IN_PROGRESS: ["overview", "direction", "review", "pages"],
  APPROVED_AWAITING_FINAL_PAYMENT: ["overview", "pages"],
  LAUNCH: ["overview", "pages", "launch"],
  LIVE: [
    "overview",
    "pages",
    "analytics",
    "seo",
    "domains",
    "connections",
    "states",
    "inbox",
  ],
};
export function projectSections(phase: Phase, operator = false) {
  return [
    ...sections[phase],
    ...(phase === "LIVE" ? ["direction", "review"] : []),
    ...(!sections[phase].includes("pages") && operator ? ["pages"] : []),
    "build",
    "billing",
    "settings",
  ];
}
export function initialObjects(brief: Record<string, unknown>): BoardObject[] {
  const reference = brief.reference as
    { id?: string; title?: string; url?: string } | undefined;
  const references: BoardObject[] =
    reference &&
    typeof reference.url === "string" &&
    reference.url.startsWith("https://fourthform-marketing.vercel.app/work/")
      ? [
          {
            id: "brief-reference",
            type: "link",
            text: `Studio reference: ${reference.title || "Selected design"}`,
            url: reference.url,
          },
        ]
      : [];
  return [
    ...references,
    ...["description", "goals", "links", "feel"].flatMap((key) =>
      brief[key]
        ? [
            {
              id: `brief-${key}`,
              type: "text" as const,
              text: `${({ description: "What we do", goals: "The website should help people", links: "Existing online presence", feel: "Visual direction" } as Record<string, string>)[key]}\n${Array.isArray(brief[key]) ? (brief[key] as string[]).join(" · ") : brief[key]}`,
            },
          ]
        : [],
    ),
  ];
}
