import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { AdminStats } from '../../../domain/entities/AdminStats';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError } from '../../../domain/value-objects/Result';

interface GetAdminStatsInput {
  userRole: string;
}

export class GetAdminStatsUseCase {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly userRepository: IUserRepository,
    private readonly campaignRepository: ICampaignRepository,
  ) {}

  async execute(input: GetAdminStatsInput): Promise<Result<AdminStats>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const stats: AdminStats = {
      totalWorkspaces: 0,
      totalUsers: 0,
      totalCampaigns: 0,
      totalAds: 0,
      totalSpend: 0,
      activeSubscriptions: 0,
      mrr: 0,
      newUsersToday: 0,
      newWorkspacesToday: 0,
      topWorkspaces: [],
      platformBreakdown: {},
      dailySignups: [],
      dailyRevenue: [],
    };

    return ok(stats);
  }
}
