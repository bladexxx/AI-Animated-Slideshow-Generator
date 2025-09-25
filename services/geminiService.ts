import { GoogleGenAI, Type } from "@google/genai";
import type { SlideshowConfig } from '../types';
import { SlideshowTheme } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash';

export const generateSlideshowConfig = async (images: { mimeType: string, data: string }[]): Promise<SlideshowConfig> => {
  const imageParts = images.map(image => ({
    inlineData: {
      mimeType: image.mimeType,
      data: image.data,
    },
  }));

  const textPart = {
    text: `Analyze these images. Based on their content and mood, suggest a creative and fitting title for a slideshow in both English and Simplified Chinese.
    Also, suggest the most appropriate animation theme for transitioning between them. 
    The available themes are: 'calm' (slow, gentle transitions), 'energetic' (fast, dynamic transitions), 'professional' (clean, sleek transitions).
    Return your answer in the specified JSON format.`
  };

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [textPart, ...imageParts] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.OBJECT,
            properties: {
              en: {
                type: Type.STRING,
                description: "A creative and fitting title for the image slideshow in English, no longer than 10 words."
              },
              zh: {
                type: Type.STRING,
                description: "The same title, translated into Simplified Chinese."
              }
            },
            required: ["en", "zh"]
          },
          theme: {
            type: Type.STRING,
            description: `The most appropriate animation theme. Must be one of: 'calm', 'energetic', or 'professional'.`,
            enum: Object.values(SlideshowTheme),
          }
        },
        required: ["title", "theme"]
      },
    },
  });

  const jsonString = response.text;
  const parsedResponse = JSON.parse(jsonString);

  if (!parsedResponse.title || !parsedResponse.title.en || !parsedResponse.title.zh || !Object.values(SlideshowTheme).includes(parsedResponse.theme)) {
      throw new Error("Invalid response structure from Gemini API");
  }

  return {
    title: {
      en: parsedResponse.title.en,
      zh: parsedResponse.title.zh,
    },
    theme: parsedResponse.theme as SlideshowTheme
  };
};
