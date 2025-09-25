import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SlideshowConfig } from '../types';
import { SlideshowTheme } from '../types';
import { FullscreenEnterIcon, FullscreenExitIcon, BackIcon, InfoIcon, DownloadIcon } from './icons';

// TypeScript declaration for the GIF.js library loaded from CDN
declare const GIF: any;

interface SlideshowProps {
  images: string[];
  config: SlideshowConfig;
  onBack: () => void;
}

const animationClasses: Record<SlideshowTheme, string> = {
  [SlideshowTheme.Calm]: 'animate-[fadeIn_1.5s_ease-in-out]',
  [SlideshowTheme.Energetic]: 'animate-[zoomIn_0.8s_ease-out]',
  [SlideshowTheme.Professional]: 'animate-[slideInUp_1s_ease-out]',
};

export const Slideshow: React.FC<SlideshowProps> = ({ images, config, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const slideshowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // 5 seconds per slide
    return () => clearTimeout(timer);
  }, [currentIndex, images.length]);

  const handleFullscreen = useCallback(() => {
    if (!slideshowRef.current) return;

    if (!document.fullscreenElement) {
      slideshowRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleDownloadGif = async () => {
    if (isGeneratingGif) return;
    setIsGeneratingGif(true);

    try {
        const gif = new GIF({
            workers: 2,
            quality: 10,
            workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Set a reasonable resolution for the GIF
        const canvasWidth = 1280;
        const canvasHeight = 720;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        for (const imageUrl of images) {
            const img = new Image();
            img.src = imageUrl;
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image for GIF generation.'));
            });

            // Clear canvas with black background
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Calculate image dimensions to mimic 'object-contain'
            const canvasRatio = canvasWidth / canvasHeight;
            const imgRatio = img.width / img.height;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasRatio > imgRatio) {
                drawHeight = canvasHeight;
                drawWidth = drawHeight * imgRatio;
                offsetX = (canvasWidth - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvasWidth;
                drawHeight = drawWidth / imgRatio;
                offsetX = 0;
                offsetY = (canvasHeight - drawHeight) / 2;
            }
            
            ctx.drawImage(
                img, 
                Math.round(offsetX), 
                Math.round(offsetY), 
                Math.round(drawWidth), 
                Math.round(drawHeight)
            );

            // Draw title overlay
            const gradient = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - 150);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvasHeight - 150, canvasWidth, 150);
            
            ctx.fillStyle = 'white';
            const fontSize = Math.round(canvasWidth / 35);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 8;
            ctx.fillText(config.title, 40, canvasHeight - 40);

            // FIX: Reset shadow properties before adding frame to avoid getImageData errors.
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            gif.addFrame(ctx, { copy: true, delay: 5000 });
        }

        gif.on('finished', (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${config.title.replace(/\s+/g, '_').toLowerCase() || 'slideshow'}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsGeneratingGif(false);
        });

        gif.render();
    } catch (error) {
        console.error("Failed to generate GIF", error);
        alert("Sorry, there was an error generating the GIF. Please try again.");
        setIsGeneratingGif(false);
    }
  };

  const animationClass = animationClasses[config.theme] || animationClasses[SlideshowTheme.Calm];

  return (
    <div ref={slideshowRef} className="w-full bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl">
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-sky-900/20">
            {images.map((image, index) => (
                <div 
                    key={`${index}-${currentIndex}`}
                    className={`absolute inset-0 transition-opacity duration-300 ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                     <img
                        key={`${image}-${currentIndex}`}
                        src={image}
                        alt={`Slide ${currentIndex + 1}`}
                        className={`w-full h-full object-contain ${index === currentIndex ? animationClass : ''}`}
                    />
                </div>
            ))}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-8 z-20">
                <h2 className={`text-xl sm:text-3xl md:text-4xl font-bold text-white shadow-lg ${animationClass}`}>{config.title}</h2>
            </div>

            <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button 
                    onClick={handleDownloadGif} 
                    disabled={isGeneratingGif}
                    className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors disabled:bg-slate-600 disabled:cursor-wait"
                    aria-label={isGeneratingGif ? "Generating GIF..." : "Download as GIF"}
                 >
                    {isGeneratingGif ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : <DownloadIcon />}
                 </button>
                 <button onClick={handleFullscreen} className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors">
                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
                 </button>
            </div>
             <div className="absolute top-4 left-4 z-20 flex gap-2">
                 <button onClick={onBack} className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors">
                    <BackIcon />
                 </button>
            </div>
        </div>
        <div className="mt-4 flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg text-sm text-slate-400">
            <InfoIcon />
            <span>To use in a presentation, enter fullscreen and screen-record (Win+G or Cmd+Shift+5).</span>
        </div>
    </div>
  );
};