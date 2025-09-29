
import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageStyle, VideoStyle, VideoDuration, CameraMovement, VideoQuality, Language, VideoFraming, AIPersona, AspectRatio, VideoFPS, Intensity, SoundFXStyle, AudioMood } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const personaInstructions: Record<AIPersona, string> = {
    'none': 'As a versatile master artist,',
    'photographer': 'As a world-renowned photographer known for capturing stunning detail and emotion,',
    'illustrator': 'As a master illustrator with a distinct and creative style,',
    'cinematographer': 'As a world-class cinematographer and VFX artist,',
    'vfx-artist': 'As a senior VFX artist specializing in photorealistic effects and compositing,',
    'concept-artist': 'As a visionary concept artist for AAA video games and blockbuster films,',
    'wildlife-photographer': 'As a National Geographic wildlife photographer on assignment,',
    'sci-fi-artist': 'As a legendary sci-fi concept artist envisioning futuristic worlds,',
    'food-photographer': 'As a world-class food photographer creating delicious, mouth-watering imagery,',
    'architectural-designer': 'As a leading architectural designer known for innovative and beautiful structures,'
};

const intensityMap: Record<Intensity, string> = {
    'subtle': 'with a subtle hint of the specified style.',
    'balanced': 'with a balanced and clear representation of the specified style.',
    'strong': 'with an extremely strong, dominant, and stylized representation of the specified style.'
}

const constructImagePrompt = (prompts: string[], style: string, negativePrompt: string, language: Language, persona: AIPersona, styleIntensity: Intensity): string => {
    const languageInstruction = language === 'kinyarwanda' ? 'The user is providing the prompt in Kinyarwanda; interpret it accordingly.' : '';
    const styleInstruction = style !== 'none' ? `Style: ${style.replace('-', ' ')}. Style Intensity: ${intensityMap[styleIntensity]}` : '';
    const negativeInstruction = negativePrompt ? `Avoid the following: ${negativePrompt}.` : '';
    
    let mainPrompt: string;
    if (prompts.length > 1) {
        const blendedPrompts = prompts.map(p => `"${p}"`).join(' and ');
        mainPrompt = `expertly blend the following distinct concepts into a single, cohesive, and beautiful image: ${blendedPrompts}.`
    } else {
        mainPrompt = `create the following image: ${prompts[0]}.`
    }
    
    const finalPrompt = `${personaInstructions[persona]} ${mainPrompt} ${languageInstruction} ${styleInstruction} ${negativeInstruction}`;
    return finalPrompt.trim();
};

const constructVideoPrompt = (prompt: string, style: VideoStyle, negativePrompt: string, duration: VideoDuration, cameraMovement: CameraMovement, quality: VideoQuality, language: Language, framing: VideoFraming, persona: AIPersona, loop: boolean, aspectRatio: AspectRatio, fps: VideoFPS, motionIntensity: Intensity, audioMood: AudioMood): string => {
    const languageInstruction = language === 'kinyarwanda' ? 'The user is providing the prompt in Kinyarwanda; interpret it as a creative instruction for the scene.' : '';
    const styleInstruction = style !== 'none' ? `Visual Style: ${style}.` : '';
    const negativeInstruction = negativePrompt ? `Crucially, avoid the following elements: ${negativePrompt}.` : '';
    
    const durationMap: Record<VideoDuration, string> = {
        short: 'a short clip, approximately 5-8 seconds long.',
        medium: 'a medium-length clip, approximately 15 seconds long.',
        long: 'a long clip, aiming for 30 seconds.',
        'one-minute': 'a one-minute long cinematic scene.',
        'three-minute': 'a detailed, three-minute long epic scene. This is a goal, the final length may vary.'
    };
    const durationInstruction = `Duration Goal: ${durationMap[duration]}.`;
    
    const motionIntensityMap: Record<Intensity, string> = {
        'subtle': 'subtle and slow',
        'balanced': 'clear and moderately paced',
        'strong': 'dynamic and fast-paced'
    }
    const cameraInstruction = cameraMovement !== 'none' ? `Camera Movement: A ${motionIntensityMap[motionIntensity]} ${cameraMovement.replace('-', ' ')}.` : '';
    const framingInstruction = framing !== 'none' ? `Shot Framing: Use a ${framing.replace('-', ' ')}.` : '';
    const qualityInstruction = quality === 'high' ? 'Output Quality: Aim for 8K resolution, ultra-high fidelity, with photorealistic rendering and professional color grading.' : '';
    const loopInstruction = loop ? 'The video must be a perfect, seamless loop.' : '';
    const aspectInstruction = `Aspect Ratio: The final video must be in ${aspectRatio} format.`;
    const fpsInstruction = `Frame Rate: The video must be rendered at ${fps} frames per second.`;
    const audioInstruction = audioMood !== 'none' ? `The overall mood of the scene should be appropriate for a soundtrack that is ${audioMood.replace('-', ' ')}.` : '';

    const finalPrompt = `${personaInstructions[persona]} create a video based on this scene: "${prompt}". 
    ${languageInstruction}
    ${styleInstruction} 
    ${cameraInstruction}
    ${framingInstruction}
    ${durationInstruction}
    ${qualityInstruction}
    ${aspectInstruction}
    ${fpsInstruction}
    ${audioInstruction}
    ${negativeInstruction}
    ${loopInstruction}`;

    return finalPrompt.replace(/\s+/g, ' ').trim();
}

export const generateImageFromText = async (prompts: string[], aspectRatio: AspectRatio = '1:1', style: ImageStyle = 'none', negativePrompt: string = '', language: Language = 'english', persona: AIPersona = 'none', styleIntensity: Intensity = 'balanced', seed?: number): Promise<string> => {
    const finalPrompt = constructImagePrompt(prompts, style, negativePrompt, language, persona, styleIntensity);
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
            seed: seed
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    }
    throw new Error("Image generation failed or returned no images.");
};

export const enhanceImage = async (image: { data: string; mimeType: string }): Promise<string> => {
    const prompt = "As a master digital retoucher, enhance this image. Improve lighting, color grading, and dynamic range to achieve a cinematic, high-impact look. Sharpen critical details and refine textures while maintaining the original composition and artistic intent. The result should be a professional, studio-quality photograph.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: image.data, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

     for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    throw new Error("Image enhancement failed or returned no image.");
};

export const generateImageVariations = async (prompt: string, originalImage: {data: string, mimeType: string}): Promise<string[]> => {
    const variationPrompt = `Generate four creative variations based on the following concept: "${prompt}". Maintain the core subject and composition of the provided image, but explore different lighting, textures, backgrounds, and artistic interpretations. Each variation should be unique and distinct.`;

    // This is a mock implementation. In a real scenario, you might call generateImages multiple times
    // or use a specific variation endpoint if available. For now, we'll re-run a transformation.
    const promises = Array(4).fill(0).map(() => transformImage(variationPrompt, originalImage));
    return Promise.all(promises);
};


export const transformImage = async (prompt: string, image: { data: string; mimeType: string }): Promise<string> => {
    const enhancedPrompt = `As a professional digital artist specializing in photo manipulation and VFX, execute this transformation: ${prompt}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: image.data, mimeType: image.mimeType } },
                { text: enhancedPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    throw new Error("Image transformation failed or returned no image.");
};

const generateVideoInternal = async (prompt: string, image?: { imageBytes: string; mimeType: string }): Promise<string> => {
    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image,
        config: {
            numberOfVideos: 1,
        },
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed or did not return a valid link.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error("Failed to download the generated video.");
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
}

export const generateVideo = async (prompt: string, image?: { imageBytes: string; mimeType: string }, style: VideoStyle = 'none', negativePrompt: string = '', duration: VideoDuration = 'short', cameraMovement: CameraMovement = 'none', quality: VideoQuality = 'standard', language: Language = 'english', framing: VideoFraming = 'none', persona: AIPersona = 'none', loop: boolean = false, aspectRatio: AspectRatio = '1:1', fps: VideoFPS = 24, motionIntensity: Intensity = 'balanced', audioMood: AudioMood = 'none'): Promise<string> => {
    const finalPrompt = constructVideoPrompt(prompt, style, negativePrompt, duration, cameraMovement, quality, language, framing, persona, loop, aspectRatio, fps, motionIntensity, audioMood);
    return generateVideoInternal(finalPrompt, image);
};

export const enhanceVideo = async (originalPrompt: string, settings: any): Promise<string> => {
    const enhancementInstruction = "Re-generate the following scene with enhanced cinematic quality. Focus on stable camera work, hyper-realistic details, professional lighting, and dramatic color grading.";
    const enhancedPrompt = `${enhancementInstruction} Scene: "${originalPrompt}"`;
    const finalPrompt = constructVideoPrompt(enhancedPrompt, settings.style, settings.negativePrompt, settings.duration, settings.cameraMovement, 'high', settings.language, settings.framing, settings.persona, settings.loop, settings.aspectRatio, settings.fps, 'strong', settings.audioMood);
    return generateVideoInternal(finalPrompt);
};

export const transcribeAudioFromFile = async (file: { data: string; mimeType: string }): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: "Transcribe the audio from this file with high accuracy, including punctuation." },
                { inlineData: { data: file.data, mimeType: file.mimeType } }
            ]
        }
    });
    return response.text;
};

// Mock sound effect generation
export const generateSoundEffect = (prompt: string, fxStyle: SoundFXStyle | AudioMood = 'none'): Promise<string> => {
    const finalPrompt = `Generate a sound effect for: ${prompt}. Style: ${fxStyle}`;
    console.log(finalPrompt);
    return new Promise(resolve => {
        setTimeout(() => {
            // In a real scenario, this would be an API call that returns an audio URL.
            // We'll use a placeholder for demonstration.
            const placeholderAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            resolve(placeholderAudio);
        }, 3000);
    });
};

// Mock audio enhancement
export const enhanceAudio = (file: { data: string; mimeType: string }): Promise<string> => {
    console.log("Enhancing audio file:", file.mimeType);
    return new Promise(resolve => {
        setTimeout(() => {
             const placeholderAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            resolve(placeholderAudio);
        }, 4000);
    });
};