export interface Comment {
  id: string;
  draftId: string;
  userId: string;
  text: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
