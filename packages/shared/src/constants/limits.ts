export const PLAN_LIMITS = {
  FREE: {
    campaigns: 3,
    workspaces: 1,
    teamMembers: 1,
    aiCredits: 10,
    reports: 5,
    exports: 3,
  },
  GROWTH: {
    campaigns: 20,
    workspaces: 1,
    teamMembers: 5,
    aiCredits: 100,
    reports: 50,
    exports: 25,
  },
  TEAM: {
    campaigns: 100,
    workspaces: 3,
    teamMembers: 15,
    aiCredits: 500,
    reports: 200,
    exports: 100,
  },
  AGENCY: {
    campaigns: Infinity,
    workspaces: Infinity,
    teamMembers: Infinity,
    aiCredits: 2000,
    reports: Infinity,
    exports: 500,
  },
} as const;

export const RATE_LIMITS = {
  unauthenticated: { windowMs: 15 * 60 * 1000, max: 30 },
  authenticated: { windowMs: 15 * 60 * 1000, max: 300 },
  webhook: { windowMs: 60 * 1000, max: 60 },
} as const;
