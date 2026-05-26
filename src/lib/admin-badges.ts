export const BADGE_KEYS = ["kyc", "reports", "moderation", "topups", "broadcasts"] as const;
export type BadgeKey = (typeof BADGE_KEYS)[number];
export type AdminBadges = Record<BadgeKey, number>;
export const EMPTY_BADGES: AdminBadges = {
  kyc: 0,
  reports: 0,
  moderation: 0,
  topups: 0,
  broadcasts: 0,
};
export const ADMIN_BADGES_QUERY_KEY = ["admin-badges"] as const;
