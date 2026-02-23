export interface Document {
  id: string;
  name: string;
  description: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments: DocumentAttachment[];
}

export interface DocumentAttachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface CreateDocumentDTO {
  name: string;
  description?: string;
  attachments?: File[];
}

export interface UpdateDocumentDTO {
  name?: string;
  description?: string;
}

export interface DocumentsResponse {
  data: Document[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DocumentFilters {
  search?: string;
  page?: number;
  limit?: number;
}