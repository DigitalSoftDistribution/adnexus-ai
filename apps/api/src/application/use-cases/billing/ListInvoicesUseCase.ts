import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import type { Invoice } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListInvoicesInput {
  workspaceId: string;
  userRole: string;
  limit?: number;
  startingAfter?: string;
}

export class ListInvoicesUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: ListInvoicesInput): Promise<Result<{ invoices: Invoice[]; hasMore: boolean }>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const limit = Math.min(input.limit || 20, 100);
    const result = await this.billingRepo.getInvoices(input.workspaceId, limit, input.startingAfter);
    return ok(result);
  }
}
