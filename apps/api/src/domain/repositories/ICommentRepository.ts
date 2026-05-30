import type { Comment } from '../entities/Comment';

export interface CommentFilters {
  draftId: string;
  parentId?: string | null;
  page?: number;
  limit?: number;
}

export interface CommentListResult {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findByDraft(draftId: string): Promise<Comment[]>;
  findByParent(parentId: string): Promise<Comment[]>;
  list(filters: CommentFilters): Promise<CommentListResult>;
  create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment>;
  update(id: string, updates: Partial<Comment>): Promise<Comment | null>;
  delete(id: string): Promise<boolean>;
  countByDraft(draftId: string): Promise<number>;
}
