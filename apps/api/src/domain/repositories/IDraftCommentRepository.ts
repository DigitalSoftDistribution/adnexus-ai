import type { DraftComment } from '../entities/DraftComment';

export interface DraftCommentListResult {
  comments: DraftComment[];
  total: number;
}

export interface IDraftCommentRepository {
  listByDraft(draftId: string, page?: number, limit?: number): Promise<DraftCommentListResult>;
  findById(id: string): Promise<DraftComment | null>;
  create(comment: Omit<DraftComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DraftComment>;
  update(id: string, content: string): Promise<DraftComment | null>;
  delete(id: string): Promise<boolean>;
}
