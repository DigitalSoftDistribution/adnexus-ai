import type { IAiCreditRepository } from '../../domain/repositories/IAiCreditRepository';
import type { AiCredit } from '../../domain/entities/AiCredit';
import { query } from '../database/connection';

export class AiCreditRepository implements IAiCreditRepository {
  async findByWorkspaceAndMonth(workspaceId: string, month: string): Promise<AiCredit | null> {
    const { rows } = await query<AiCredit>(
      `SELECT * FROM ai_credits WHERE workspace_id = $1 AND month = $2 LIMIT 1`,
      [workspaceId, month],
    );
    return rows[0] ?? null;
  }

  async upsert(credit: Omit<AiCredit, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiCredit> {
    const { rows } = await query<AiCredit>(
      `INSERT INTO ai_credits (workspace_id, month, creatives_used, creatives_total, impressions_used, impressions_total, ai_credits_used, ai_credits_total, credits_used, credits_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (workspace_id, month) DO UPDATE SET
         creatives_total = EXCLUDED.creatives_total,
         impressions_total = EXCLUDED.impressions_total,
         ai_credits_total = EXCLUDED.ai_credits_total,
         credits_limit = EXCLUDED.credits_limit
       RETURNING *`,
      [
        credit.workspaceId, credit.month, credit.creativesUsed, credit.creativesTotal,
        credit.impressionsUsed, credit.impressionsTotal, credit.aiCreditsUsed,
        credit.aiCreditsTotal, credit.creditsUsed, credit.creditsLimit,
      ],
    );
    return rows[0];
  }

  async incrementUsage(
    workspaceId: string,
    month: string,
    field: keyof Pick<AiCredit, 'creativesUsed' | 'impressionsUsed' | 'aiCreditsUsed' | 'creditsUsed'>,
    amount: number,
  ): Promise<AiCredit | null> {
    const column = this.camelToSnake(field);
    const { rows } = await query<AiCredit>(
      `UPDATE ai_credits SET ${column} = ${column} + $3
       WHERE workspace_id = $1 AND month = $2
       RETURNING *`,
      [workspaceId, month, amount],
    );
    return rows[0] ?? null;
  }

  async listByWorkspace(workspaceId: string): Promise<AiCredit[]> {
    const { rows } = await query<AiCredit>(
      `SELECT * FROM ai_credits WHERE workspace_id = $1 ORDER BY month DESC LIMIT 12`,
      [workspaceId],
    );
    return rows;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
