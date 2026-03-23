export interface ImagePlaceholder {
  index: number;
  url: string;
  alt: string;
  sortOrder: number;
  isValid?: boolean;
  file?: File;
  isUploading?: boolean;
  width?: number;
  height?: number;
}

export interface ImageData {
  url: string;
  alt: string;
  sortOrder: number;
  file?: File;
  width?: number;
  height?: number;
}