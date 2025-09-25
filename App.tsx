
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Slideshow } from './components/Slideshow';
import { Loader } from './components/Loader';
import type { SlideshowConfig, UploadedImage } from './types';
import { generateSlideshowConfig } from './services/geminiService';
import { HeaderIcon } from './components/icons';

const App: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [slideshowConfig, setSlideshowConfig] = useState<SlideshowConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (uploadedImages.length < 2) {
      setError('Please upload at least 2 images to create a slideshow.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const imageParts = uploadedImages.map(img => {
        const base64Data = img.dataUrl.split(',')[1];
        return {
          mimeType: img.file.type,
          data: base64Data
        };
      });
      const config = await generateSlideshowConfig(imageParts);
      setSlideshowConfig(config);
    } catch (e) {
      console.error(e);
      setError('Failed to generate slideshow. The AI model might be busy. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImages]);
  
  const handleReset = () => {
    setUploadedImages([]);
    setSlideshowConfig(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col antialiased">
      <header className="p-4 border-b border-slate-700/50">
        <div className="container mx-auto flex items-center gap-3">
          <HeaderIcon />
          <h1 className="text-xl font-bold text-sky-400">AI Animated Slideshow Generator</h1>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {isLoading ? (
            <Loader />
          ) : slideshowConfig ? (
            <Slideshow
              images={uploadedImages.map(img => img.dataUrl)}
              config={slideshowConfig}
              onBack={handleReset}
            />
          ) : (
            <>
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-4 text-center">
                  {error}
                </div>
              )}
              <ImageUploader
                onImagesUpload={setUploadedImages}
                onGenerate={handleGenerate}
                uploadedImages={uploadedImages}
              />
            </>
          )}
        </div>
      </main>
      
      <footer className="p-4 text-center text-slate-500 text-sm">
        <p>Powered by React, Tailwind CSS, and Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
