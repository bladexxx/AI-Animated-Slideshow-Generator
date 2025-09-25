import React from 'react';
import type { UploadedImage } from '../types';
import { UploadIcon, TrashIcon } from './icons';

interface ImageUploaderProps {
  uploadedImages: UploadedImage[];
  onImagesUpload: (images: UploadedImage[]) => void;
  onGenerate: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ uploadedImages, onImagesUpload, onGenerate }) => {

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Correctly create a File array from the FileList to avoid type inference issues where `file` becomes `unknown`.
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    const newImages: UploadedImage[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataURL(file);
        newImages.push({ file, dataUrl });
      }
    }
    onImagesUpload([...uploadedImages, ...newImages]);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    onImagesUpload(newImages);
  };

  return (
    <div className="w-full space-y-6">
      <div className="relative border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-sky-500 transition-colors duration-300 bg-slate-800/50">
        <div className="flex flex-col items-center justify-center space-y-3">
          <UploadIcon />
          <p className="text-slate-400">Drag & drop your images here, or</p>
          <label htmlFor="file-upload" className="cursor-pointer font-semibold text-sky-400 hover:text-sky-300">
            Click to browse
          </label>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          multiple 
          accept="image/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange} 
        />
      </div>

      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-300">Image Preview:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={image.dataUrl} alt={`preview ${index}`} className="w-full h-full object-cover rounded-md" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleRemoveImage(index)} className="text-white p-2 bg-red-600/80 rounded-full hover:bg-red-500">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center pt-4">
            <button
              onClick={onGenerate}
              disabled={uploadedImages.length < 2}
              className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-transform duration-200 transform hover:scale-105 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:scale-100"
            >
              Generate Slideshow
            </button>
          </div>
        </div>
      )}
    </div>
  );
};