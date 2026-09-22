export const productionStages = [
  {
    id: "intake_review",
    label: "Order received",
    shortLabel: "Received",
    description: "We confirm the brief, files, payment, and production requirements.",
  },
  {
    id: "creative_strategy",
    label: "Creative strategy",
    shortLabel: "Strategy",
    description: "We shape the hook, story, offer, and visual direction around your goal.",
  },
  {
    id: "in_production",
    label: "Video production",
    shortLabel: "Production",
    description: "Your product video is being designed, animated, edited, and polished.",
  },
  {
    id: "sales_genius_review",
    label: "Sales Genius review",
    shortLabel: "Sales review",
    description: "We inspect the hook, clarity, offer, CTA, and sales flow before client review.",
  },
  {
    id: "client_review",
    label: "Client review",
    shortLabel: "Your review",
    description: "Your review draft is ready. Check it and send any final feedback.",
  },
  {
    id: "finalizing",
    label: "Final delivery",
    shortLabel: "Finalizing",
    description: "Approved files are being exported and prepared for delivery.",
  },
  {
    id: "delivered",
    label: "Delivered",
    shortLabel: "Delivered",
    description: "Your final advertising files are ready in the project portal.",
  },
] as const;

export type ProductionStatus = (typeof productionStages)[number]["id"];

export function normalizeStatus(status: string, paymentStatus?: string) {
  if (paymentStatus !== "paid" || status === "awaiting_payment") return "awaiting_payment";
  if (status === "queued") return "intake_review";
  if (status === "review") return "client_review";
  return productionStages.some((stage) => stage.id === status)
    ? (status as ProductionStatus)
    : "intake_review";
}

export function stageIndex(status: string, paymentStatus?: string) {
  const normalized = normalizeStatus(status, paymentStatus);
  if (normalized === "awaiting_payment") return -1;
  return productionStages.findIndex((stage) => stage.id === normalized);
}

export function statusLabel(status: string, paymentStatus?: string) {
  const normalized = normalizeStatus(status, paymentStatus);
  if (normalized === "awaiting_payment") return "Payment required";
  return productionStages.find((stage) => stage.id === normalized)?.label ?? "Order received";
}
