
export enum SlideshowTheme {
  Calm = 'calm',
  Energetic = 'energetic',
  Professional = 'professional',
}

export interface SlideshowConfig {
  title: string;
  theme: SlideshowTheme;
}

export interface UploadedImage {
  file: File;
  dataUrl: string;
}
