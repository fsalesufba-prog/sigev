// backend/src/types/attachment.types.ts
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  processId?: string | null;
  notificationId?: string | null;
  userId: string;
  unitId?: string | null;
  documentId?: string | null;
  createdAt: Date;
}

export interface CreateAttachmentDTO {
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  processId?: string;
  notificationId?: string;
  unitId?: string;
  documentId?: string;
}

export interface AttachmentFilters {
  processId?: string;
  userId?: string;
  unitId?: string;
  notificationId?: string;
  documentId?: string;
  page?: number;
  limit?: number;
}