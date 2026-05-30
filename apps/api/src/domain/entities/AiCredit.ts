export interface AiCredit {
  id: string;
  workspaceId: string;
  month: string;
  creativesUsed: number;
  creativesTotal: number;
  impressionsUsed: number;
  impressionsTotal: number;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  creditsUsed: number;
  creditsLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
