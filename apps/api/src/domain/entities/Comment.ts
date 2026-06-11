export interface Comment {
  id: string;
  workspaceId: string;
  draftId: string;
  userId: string;
  text: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
