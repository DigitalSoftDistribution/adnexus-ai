export interface FileUploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface IFileStorageService {
  upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<FileUploadResult>;
  download(bucket: string, key: string): Promise<Buffer | null>;
  delete(bucket: string, key: string): Promise<boolean>;
  getSignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
  exists(bucket: string, key: string): Promise<boolean>;
}
