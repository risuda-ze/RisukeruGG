export const LIGHT_PLAN_LIMITS = {
  maxTeamMembers: 2,
  monthlyTasks: 5,
  monthlyCollabs: 3,
  /** 同時進行中（open）のコラボ調整の上限 */
  maxActiveCollabs: 5,
} as const;
