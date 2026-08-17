export class FolderTreeNodeDto {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderTreeNodeDto[];
}
