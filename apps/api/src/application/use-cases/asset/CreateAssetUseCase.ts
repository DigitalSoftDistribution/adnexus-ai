import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import type { Asset } from '../../../domain/entities/Asset';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

interface CreateAssetInput {
  workspaceId: string;
  name: string;
  originalName: string;
  type: string;
  mimeType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  campaignId?: string;
  adId?: string;
  userId: string;
  userRole: string;
}

export class CreateAssetUseCase {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: CreateAssetInput): Promise<Result<Asset>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name || input.name.trim().length === 0) {
      return err(new ValidationError('Asset name is required'));
    }

    const asset = await this.assetRepository.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      originalName: input.originalName,
      type: input.type as Asset['type'],
      mimeType: input.mimeType,
      size: input.size,
      url: input.url ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      status: 'ready',
      metadata: input.metadata ?? null,
      campaignId: input.campaignId ?? null,
      adId: input.adId ?? null,
      createdBy: input.userId,
    });

    return ok(asset);
  }
}
