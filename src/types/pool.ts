export interface CleanResult {
  blob: Blob;
  fileName: string;
  originalSize: number;
  cleanSize: number;
  tracesRemoved: number;
}
