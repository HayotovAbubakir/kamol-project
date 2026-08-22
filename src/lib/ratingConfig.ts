export const RATING_POINTS = {
  /** 1 kunda (yaxshi) — bitta loyiha */
  SAME_DAY_SINGLE: 4,
  /** 1 kunda — bir kunda 2+ loyiha */
  SAME_DAY_MULTI: 5,
  /** 2 kunda (normal) */
  TWO_DAYS: 3,
  /** 3 kunda */
  THREE_DAYS: 1,
  /** 3+ kun */
  OVER_THREE_DAYS: 0,
  /** Qaytarish / o'tkazib yuborish */
  REJECTION: -5,
  /** Admin ijobiy izoh */
  COMMENT_POSITIVE: 2,
  /** Admin salbiy izoh */
  COMMENT_NEGATIVE: -2,
} as const;

export const MAX_STARS = 5;
