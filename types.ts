import type { ReactNode } from 'react';

export type GenerationMode = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'LIBRARY' | 'PROFILE' | 'SETTINGS' | 'PREMIUM';
export type AudioToolMode = 'speech-to-text' | 'text-to-speech' | 'sound-fx' | 'audio-enhancement';
export type SpeechToTextMode = 'live' | 'file';
export type RecordingStatus = 'idle' | 'connecting' | 'recording' | 'stopping';
export type AudioEnhancementMode = 'noise-reduction' | 'speech-enhancement' | 'sound-isolation';

export interface SidebarLink {
  id: GenerationMode;
  label: string;
  // Fix: Use ReactNode type from import to resolve 'Cannot find namespace React' error.
  icon: ReactNode;
}

export type Language = 'english' | 'kinyarwanda';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type VideoFPS = 24 | 30 | 60;

export type ImageStyle = 'none' | 'photorealistic' | 'fantasy' | 'anime' | '3d-render' | 'pixel-art';
export type VideoStyle = 'none' | 'cinematic' | 'animated' | 'hyperrealistic' | 'vintage';
export type SoundFXStyle = 'none' | 'realistic' | 'cartoon' | 'cinematic';
export type AudioMood = 'none' | 'epic' | 'ambient' | 'lofi' | 'cinematic-tension';

export type VideoDuration = 'short' | 'medium' | 'long' | 'one-minute' | 'three-minute';
export type CameraMovement = 'none' | 'pan' | 'zoom-in' | 'zoom-out' | 'drone-shot' | 'static';
export type VideoQuality = 'standard' | 'high';
export type VideoFraming = 'none' | 'close-up' | 'medium-shot' | 'long-shot';

export type AIPersona = 'none' | 'photographer' | 'illustrator' | 'cinematographer' | 'vfx-artist' | 'concept-artist' | 'wildlife-photographer' | 'sci-fi-artist' | 'food-photographer' | 'architectural-designer';
export type Intensity = 'subtle' | 'balanced' | 'strong';

export type SubscriptionTier = 'free' | 'silver' | 'golden' | 'diamond';

export interface GenerationSettings {
    prompts: string[]; 
    negativePrompt?: string;
    style?: ImageStyle | VideoStyle;
    language?: Language;
    persona?: AIPersona;
    aspectRatio?: AspectRatio;
    seed?: number;
    duration?: VideoDuration;
    cameraMovement?: CameraMovement;
    quality?: VideoQuality;
    framing?: VideoFraming;
    loop?: boolean;
    fps?: VideoFPS;
    styleIntensity?: Intensity;
    motionIntensity?: Intensity;
    fxStyle?: SoundFXStyle;
    audioMood?: AudioMood;
    batchSize?: 1 | 2 | 3 | 4;
    negativeIntensity?: Intensity;
}

export interface LibraryItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  src: string;
  settings: GenerationSettings;
  createdAt: string;
  variations?: string[];
  audioSrc?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
