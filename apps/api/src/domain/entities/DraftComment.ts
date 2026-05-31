export interface DraftComment {
  id: string;
  draftId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
