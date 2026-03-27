import { SubscriptionTier } from "@prisma/client";

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  none: 0,
  basic: 1,
  multi: 10,
  bulk: 100,
};

export function getCompanyLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier];
}

export function canAddCompany(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[tier];
}

export function tierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_PRICE_ID_BULK) return "bulk";
  if (priceId === process.env.STRIPE_PRICE_ID_MULTI) return "multi";
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return "basic";
  // Fallback: legacy single price
  if (priceId === process.env.STRIPE_PRICE_ID) return "basic";
  return "none";
}

export function priceIdFromTier(tier: SubscriptionTier): string | null {
  switch (tier) {
    case "basic":
      return process.env.STRIPE_PRICE_ID_BASIC || process.env.STRIPE_PRICE_ID || null;
    case "multi":
      return process.env.STRIPE_PRICE_ID_MULTI || null;
    case "bulk":
      return process.env.STRIPE_PRICE_ID_BULK || null;
    default:
      return null;
  }
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  none: "No plan",
  basic: "Basic",
  multi: "Multiple",
  bulk: "Bulk",
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  none: 0,
  basic: 19,
  multi: 39,
  bulk: 49,
};
