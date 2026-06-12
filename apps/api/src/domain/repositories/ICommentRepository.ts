import type { Comment } from '../entities/Comment';

export interface CommentFilters {
  workspaceId: string;
  draftId?: string;
  entityType?: string;
  entityId?: string;
  page: number;
  limit: number;
}

export interface CommentListResult {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  list(filters: CommentFilters): Promise<CommentListResult>;
  create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment>;
  delete(id: string): Promise<boolean>;
}
