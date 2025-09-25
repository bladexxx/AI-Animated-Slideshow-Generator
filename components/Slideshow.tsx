import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SlideshowConfig } from '../types';
import { SlideshowTheme } from '../types';
import { FullscreenEnterIcon, FullscreenExitIcon, BackIcon, InfoIcon, DownloadIcon } from './icons';

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

const animationDurations: Record<SlideshowTheme, number> = {
    [SlideshowTheme.Calm]: 1500,
    [SlideshowTheme.Energetic]: 800,
    [SlideshowTheme.Professional]: 1000,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
});


export const Slideshow: React.FC<SlideshowProps> = ({ images, config, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const slideshowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isGeneratingVideo) return; // Pause slideshow during video generation
    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // 5 seconds per slide
    return () => clearTimeout(timer);
  }, [currentIndex, images.length, isGeneratingVideo]);


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

  const handleDownloadVideo = async () => {
    if (isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setGenerationMessage('Initializing encoder...');
    
    const WIDTH = 1280;
    const HEIGHT = 720;
    const FPS = 30;
    const FRAME_DURATION = 1000 / FPS;

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        alert('Could not get canvas context');
        setIsGeneratingVideo(false);
        return;
    }

    try {
        const stream = canvas.captureStream(FPS);
        const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
        const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const titleForDownload = config.title[language] || config.title.en;
            a.download = `${titleForDownload.replace(/\s+/g, '_').toLowerCase() || 'slideshow'}.${fileExtension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsGeneratingVideo(false);
            setGenerationMessage('');
        };
        
        recorder.start();

        const animationDuration = animationDurations[config.theme];
        const totalSlideDuration = 5000;
        
        for (const [index, imageSrc] of images.entries()) {
            setGenerationMessage(`Rendering slide ${index + 1}/${images.length}...`);
            const image = await loadImage(imageSrc);

            // Calculate "object-contain" dimensions
            const canvasAspect = WIDTH / HEIGHT;
            const imageAspect = image.width / image.height;
            let drawWidth, drawHeight, x, y;

            if (imageAspect > canvasAspect) {
                drawWidth = WIDTH;
                drawHeight = WIDTH / imageAspect;
                x = 0;
                y = (HEIGHT - drawHeight) / 2;
            } else {
                drawHeight = HEIGHT;
                drawWidth = HEIGHT * imageAspect;
                y = 0;
                x = (WIDTH - drawWidth) / 2;
            }

            // Animation phase
            const animationFrames = Math.round(animationDuration / FRAME_DURATION);
            for (let i = 0; i <= animationFrames; i++) {
                const progress = i / animationFrames;
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                
                let opacity = 1, scale = 1, textY = 0;

                switch(config.theme) {
                    case SlideshowTheme.Calm:
                        opacity = Math.min(1, progress * 1.5);
                        break;
                    case SlideshowTheme.Energetic:
                        opacity = Math.min(1, progress * 2);
                        scale = 0.95 + 0.05 * progress;
                        break;
                    case SlideshowTheme.Professional:
                        opacity = Math.min(1, progress * 2);
                        textY = 30 * (1 - progress);
                        break;
                }
                
                ctx.globalAlpha = opacity;
                ctx.drawImage(image, x + (WIDTH - drawWidth * scale) / 2, y + (HEIGHT - drawHeight * scale) / 2, drawWidth * scale, drawHeight * scale);
                ctx.globalAlpha = 1;

                // Draw title
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(0, textY);
                const gradient = ctx.createLinearGradient(0, HEIGHT - 150, 0, HEIGHT);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, HEIGHT - 150, WIDTH, 150);
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 40px sans-serif';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 10;
                ctx.fillText(config.title[language], 40, HEIGHT - 40);
                ctx.restore();

                await sleep(FRAME_DURATION);
            }

            // Static phase
            await sleep(totalSlideDuration - animationDuration);
        }

        recorder.stop();

    } catch (error) {
        console.error("Failed to generate video", error);
        alert("Sorry, there was an error generating the video. Your browser might not support the required APIs.");
        setIsGeneratingVideo(false);
        setGenerationMessage('');
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
                <h2 className={`text-xl sm:text-3xl md:text-4xl font-bold text-white shadow-lg ${animationClass}`}>{config.title[language]}</h2>
            </div>

            <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button 
                    onClick={handleDownloadVideo} 
                    disabled={isGeneratingVideo}
                    className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors disabled:bg-slate-600 disabled:cursor-wait flex items-center gap-2"
                    aria-label={isGeneratingVideo ? generationMessage : "Download as Video"}
                 >
                    {isGeneratingVideo ? (
                        <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs pr-2">{generationMessage}</span>
                        </>
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
                 <div className="flex rounded-full bg-black/40 text-white overflow-hidden text-sm">
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 font-semibold transition-colors ${language === 'en' ? 'bg-sky-500' : 'hover:bg-black/70'}`}
                        aria-pressed={language === 'en'}
                    >
                        EN
                    </button>
                    <button 
                        onClick={() => setLanguage('zh')}
                        className={`px-3 py-1 font-semibold transition-colors ${language === 'zh' ? 'bg-sky-500' : 'hover:bg-black/70'}`}
                        aria-pressed={language === 'zh'}
                    >
                        ZH
                    </button>
                 </div>
            </div>
        </div>
        <div className="mt-4 flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg text-sm text-slate-400">
            <InfoIcon />
            <span>Download the video for your presentation or screen-record in fullscreen (Win+G or Cmd+Shift+5).</span>
        </div>
    </div>
  );
};
