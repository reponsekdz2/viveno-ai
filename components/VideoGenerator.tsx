
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo, enhanceVideo, generateSoundEffect } from '../services/geminiService';
import { Spinner } from './Spinner';
import { PhotoIcon, FilmIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, ClipboardIcon, ArrowDownTrayIcon, XCircleIcon, ClockIcon, CheckBadgeIcon, LanguageIcon, FrameIcon, SparklesIcon, ArrowPathRoundedSquareIcon, CheckIcon, QuestionMarkCircleIcon, MusicalNoteIcon } from './Icons';
import type { VideoStyle, VideoDuration, CameraMovement, VideoQuality, Language, VideoFraming, AIPersona, Toast, SubscriptionTier, GenerationSettings, AspectRatio, VideoFPS, Intensity, AudioMood } from '../types';

const Tooltip: React.FC<{text: string, children: React.ReactNode}> = ({text, children}) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none shadow-lg border border-[var(--border-color)]">
            {text}
        </div>
    </div>
);

const CustomAudioPlayer: React.FC<{src: string}> = ({src}) => (
    <div className="w-full bg-gray-800 rounded-lg p-2 flex items-center space-x-2">
        <audio controls src={src} className="w-full custom-audio-player"></audio>
    </div>
);


type VideoToolMode = 'text-to-video' | 'image-to-video';

const LOADING_MESSAGES = [ "Warming up the digital director...", "Assembling pixels into scenes...", "Rendering cinematic magic...", "This can take a few minutes, patience is a virtue...", "Applying final visual effects...", "Almost there, preparing your epic video..." ];

const aspectRatios: {id: AspectRatio, premium: boolean}[] = [ {id: '1:1', premium: false}, {id: '16:9', premium: true}, {id: '9:16', premium: true}, {id: '4:3', premium: false}, {id: '3:4', premium: false} ];
const videoFPSs: {id: VideoFPS, label: string, premium: boolean}[] = [ {id: 24, label: '24 FPS', premium: false}, {id: 30, label: '30 FPS', premium: true}, {id: 60, label: '60 FPS', premium: true} ];
const videoStyles: { id: VideoStyle, label: string }[] = [ { id: 'none', label: 'Default' }, { id: 'cinematic', label: 'Cinematic' }, { id: 'animated', label: 'Animated' }, { id: 'hyperrealistic', label: 'Hyperrealistic' }, { id: 'vintage', label: 'Vintage' }, ];
const videoDurations: { id: VideoDuration, label: string, premium: SubscriptionTier | 'free' }[] = [ { id: 'short', label: 'Clip (~8s)', premium: 'free' }, { id: 'medium', label: 'Scene (~15s)', premium: 'silver' }, { id: 'long', label: 'Extended Scene (~30s)', premium: 'golden' }, { id: 'one-minute', label: 'Short Film (~60s)', premium: 'diamond' }, { id: 'three-minute', label: 'Epic Scene (~60s+)', premium: 'diamond' } ];
const cameraMovements: { id: CameraMovement, label: string }[] = [ { id: 'none', label: 'Default' }, { id: 'static', label: 'Static' }, { id: 'pan', label: 'Pan' }, { id: 'zoom-in', label: 'Zoom In' }, { id: 'zoom-out', label: 'Zoom Out' }, { id: 'drone-shot', label: 'Drone Shot' } ];
const videoQualities: { id: VideoQuality, label: string, premium: boolean }[] = [ { id: 'standard', label: 'Standard', premium: false }, { id: 'high', label: 'High', premium: true } ];
const languages: { id: Language, label: string }[] = [ { id: 'english', label: 'English' }, { id: 'kinyarwanda', label: 'Kinyarwanda' }, ];
const videoFramings: { id: VideoFraming, label: string }[] = [ { id: 'none', label: 'Default' }, { id: 'close-up', label: 'Close-Up' }, { id: 'medium-shot', label: 'Medium Shot' }, { id: 'long-shot', label: 'Long Shot' } ];
const personas: { id: AIPersona, label: string, premium: SubscriptionTier | 'free' }[] = [ { id: 'none', label: 'Default', premium: 'free' }, { id: 'cinematographer', label: 'Cinematographer', premium: 'silver' }, { id: 'vfx-artist', label: 'VFX Artist', premium: 'golden' }, { id: 'concept-artist', label: 'Concept Artist', premium: 'golden' }, { id: 'wildlife-photographer', label: 'Wildlife Photographer', premium: 'diamond' }, { id: 'sci-fi-artist', label: 'Sci-Fi Artist', premium: 'diamond' } ];
const intensities: { id: Intensity, label: string }[] = [{id: 'subtle', label: 'Subtle'}, {id: 'balanced', label: 'Balanced'}, {id: 'strong', label: 'Strong'}];
const audioMoods: {id: AudioMood, label: string}[] = [{id: 'none', label: 'None'}, {id: 'epic', label: 'Epic Orchestral'}, {id: 'ambient', label: 'Ambient Sci-Fi'}, {id: 'lofi', label: 'Lo-Fi Beats'}, {id: 'cinematic-tension', label: 'Cinematic Tension'}];

const fileToBase64 = (file: File): Promise<{ imageBytes: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ imageBytes: base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

interface VideoGeneratorProps {
  setToast: (message: string, type?: Toast['type']) => void;
  onSaveToLibrary: (item: {type: 'VIDEO', src: string, settings: GenerationSettings, audioSrc?: string}) => void;
  subscriptionTier: SubscriptionTier;
  promptUpgrade: () => void;
}

const usePromptHistory = (key: string) => {
    const [history, setHistory] = useState<string[]>([]);
    
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(key);
            if(storedHistory) setHistory(JSON.parse(storedHistory));
        } catch(e) { console.error("Failed to parse history", e); }
    }, [key]);

    const addPromptToHistory = (prompt: string) => {
        if (!prompt.trim()) return;
        try {
            const newHistory = [prompt, ...history.filter(p => p !== prompt)].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem(key, JSON.stringify(newHistory));
        } catch(e) { console.error("Failed to save history", e); }
    };
    return { history, addPromptToHistory };
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ setToast, onSaveToLibrary, subscriptionTier, promptUpgrade }) => {
  const [mode, setMode] = useState<VideoToolMode>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState<VideoStyle>('none');
  const [duration, setDuration] = useState<VideoDuration>('short');
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('none');
  const [quality, setQuality] = useState<VideoQuality>('standard');
  const [language, setLanguage] = useState<Language>('english');
  const [framing, setFraming] = useState<VideoFraming>('none');
  const [persona, setPersona] = useState<AIPersona>('cinematographer');
  const [loopVideo, setLoopVideo] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [fps, setFps] = useState<VideoFPS>(24);
  const [motionIntensity, setMotionIntensity] = useState<Intensity>('balanced');
  const [audioMood, setAudioMood] = useState<AudioMood>('none');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string|null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSettings, setLastSettings] = useState<GenerationSettings | null>(null);
  const { history: promptHistory, addPromptToHistory } = usePromptHistory('video-prompt-history');
  const [showHistory, setShowHistory] = useState(false);
  
  const tierLevels: Record<SubscriptionTier, number> = { free: 0, silver: 1, golden: 2, diamond: 3 };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handlePremiumFeature = (requiredTier: SubscriptionTier, action: () => void) => {
    if (tierLevels[subscriptionTier] < tierLevels[requiredTier]) {
        promptUpgrade();
    } else {
        action();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setToast('Prompt copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleFileSelect = (file: File) => {
     if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setToast("Image loaded successfully.", "success");
    } else {
      setError("Please select a valid image file.");
      setToast("Invalid file type.", "error");
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
  };
  
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); };
  
  const clearImage = () => { setImageFile(null); setImagePreview(null); if(fileInputRef.current) fileInputRef.current.value = ""; }

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt) { setError("A prompt is required to generate a video."); return; }
    if (mode === 'image-to-video' && !imageFile) { setError("An image is required for image-to-video generation."); return; }

    setIsLoading(true); setError(null); setGeneratedVideo(null); setGeneratedAudio(null); setLoadingMessage(LOADING_MESSAGES[0]);

    const currentSettings: GenerationSettings = { prompts: [prompt], negativePrompt, style, duration, cameraMovement, quality, language, framing, persona, loop: loopVideo, aspectRatio, fps, motionIntensity, audioMood };
    setLastSettings(currentSettings);
    addPromptToHistory(prompt);

    try {
      const imagePayload = (mode === 'image-to-video' && imageFile) ? await fileToBase64(imageFile) : undefined;
      
      const videoPromise = generateVideo(prompt, imagePayload, style, negativePrompt, duration, cameraMovement, quality, language, framing, persona, loopVideo, aspectRatio, fps, motionIntensity, audioMood);
      const audioPromise = audioMood !== 'none' ? generateSoundEffect(`A soundtrack for a video with an "${audioMoods.find(m => m.id === audioMood)?.label}" mood`, audioMood) : Promise.resolve(null);
      
      const [videoResult, audioResult] = await Promise.all([videoPromise, audioPromise]);

      setGeneratedVideo(videoResult);
      if(audioResult) setGeneratedAudio(audioResult);

      onSaveToLibrary({ type: 'VIDEO', src: videoResult, settings: currentSettings, audioSrc: audioResult || undefined });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, negativePrompt, style, imageFile, mode, duration, cameraMovement, quality, language, framing, persona, loopVideo, aspectRatio, fps, motionIntensity, audioMood, onSaveToLibrary, setToast, addPromptToHistory]);
  
   const handleEnhance = async () => {
    if (!lastSettings) return;
    handlePremiumFeature('diamond', async () => {
        setIsEnhancing(true); setError(null); setGeneratedVideo(null); setIsLoading(true);
        try {
            const result = await enhanceVideo(lastSettings.prompts[0], lastSettings);
            setGeneratedVideo(result);
            onSaveToLibrary({ type: 'VIDEO', src: result, settings: { ...lastSettings, prompts: [`${lastSettings.prompts[0]} (Enhanced)`] } });
            setToast('Video enhanced successfully!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Enhance failed.';
            setError(errorMessage);
            setToast(errorMessage, 'error');
        } finally {
            setIsEnhancing(false);
            setIsLoading(false);
        }
    });
  };
  
  const resetForm = () => {
    setPrompt(''); setNegativePrompt(''); setStyle('none'); setDuration('short'); setCameraMovement('none'); setQuality('standard'); setLanguage('english'); setFraming('none'); setPersona('cinematographer'); clearImage(); setGeneratedVideo(null); setGeneratedAudio(null); setError(null); setLoopVideo(false); setAspectRatio('1:1'); setFps(24); setMotionIntensity('balanced'); setAudioMood('none');
  };

  const isSubmitDisabled = isLoading || !prompt || (mode === 'image-to-video' && !imageFile);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 h-full">
      <div className="lg:col-span-2 bg-gradient-panel rounded-lg p-6 flex flex-col border border-[var(--border-color)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Video Generator</h2>
          <button onClick={resetForm} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full"><XCircleIcon /></button>
        </div>
        
        <div className="flex bg-gray-950/50 p-1 rounded-lg mb-6">
          <button onClick={() => setMode('text-to-video')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${mode === 'text-to-video' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Text-to-Video</button>
          <button onClick={() => setMode('image-to-video')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${mode === 'image-to-video' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Image-to-Video</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2">
         <div className="flex-grow space-y-4">
          {mode === 'image-to-video' && (
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source Image</label>
              <div className={`relative mt-1 flex justify-center items-center rounded-lg border-2 border-dashed p-4 h-48 transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-gray-600'}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-md" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); clearImage(); }} className="absolute top-2 right-2 bg-gray-900/70 p-1 rounded-full text-white hover:bg-red-600 transition"><XCircleIcon className="w-5 h-5"/></button>
                  </>
                ) : (
                  <div className="text-center cursor-pointer"><PhotoIcon className="mx-auto h-12 w-12 text-gray-500" /><p className="mt-2 text-sm text-gray-400"><span className="font-semibold text-red-500">Click to upload</span> or drag and drop</p><p className="text-xs text-gray-500">PNG, JPG, etc.</p></div>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <div className="relative">
              <textarea id="prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A high-speed chase scene with a sports car..." className="w-full bg-gray-900/70 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition pr-10 placeholder-gray-500"/>
            </div>
             <div className="flex justify-between items-center text-xs mt-1">
                 <div className="relative">
                     <button type="button" onClick={() => setShowHistory(!showHistory)} className="flex items-center text-gray-400 hover:text-white"><ClockIcon className="mr-1 w-4 h-4" /> History</button>
                     {showHistory && (
                         <div className="absolute bottom-full mb-2 w-72 bg-gray-900 border border-[var(--border-color)] rounded-lg shadow-xl z-10">
                             {promptHistory.length > 0 ? promptHistory.map((p,i) => <p key={i} onClick={() => {setPrompt(p); setShowHistory(false);}} className="p-2 hover:bg-gray-800 cursor-pointer truncate">{p}</p>) : <p className="p-2 text-gray-500">No history</p>}
                         </div>
                     )}
                 </div>
                 <button type="button" onClick={handleCopy} className="flex items-center text-gray-400 hover:text-white">{copied ? <CheckIcon className="text-green-500 mr-1" /> : <ClipboardIcon className="mr-1" />} Copy</button>
             </div>
          </div>
          
          <div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full text-sm font-medium text-gray-300"><span>Advanced Settings</span>{showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}</button>
            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-950/70 rounded-lg">
                <div>
                  <Tooltip text="Guide the AI to act as a specialist for higher quality, more specific results.">
                    <label htmlFor="persona" className="flex items-center text-sm font-medium text-gray-300 mb-2"><SparklesIcon className="w-4 h-4 mr-2"/>AI Persona <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                  </Tooltip>
                  <select id="persona" value={persona} onChange={(e) => handlePremiumFeature(personas.find(p => p.id === e.target.value)!.premium as SubscriptionTier, () => setPersona(e.target.value as AIPersona))} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                      {personas.map(p => <option key={p.id} value={p.id}>{p.label}{p.premium !== 'free' ? ` (${p.premium.charAt(0).toUpperCase() + p.premium.slice(1)})` : ''}</option>)}
                  </select>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                        <Tooltip text="Choose the output dimensions for your video. Cinematic ratios are a premium feature.">
                           <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Aspect Ratio <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                        </Tooltip>
                        <div className="grid grid-cols-3 gap-2">
                            {aspectRatios.map(ratio => ( <button key={ratio.id} type="button" onClick={() => ratio.premium ? handlePremiumFeature('golden', () => setAspectRatio(ratio.id)) : setAspectRatio(ratio.id)} className={`p-2 text-xs rounded-md font-semibold transition flex items-center justify-center ${aspectRatio === ratio.id ? 'bg-red-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800'}`}>{ratio.id}{ratio.premium ? ' ✨' : ''}</button>))}
                        </div>
                    </div>
                     <div>
                        <Tooltip text="Higher FPS results in smoother video, but takes longer to generate.">
                           <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Frame Rate (FPS) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                        </Tooltip>
                        <div className="grid grid-cols-3 gap-2">
                            {videoFPSs.map(f => ( <button key={f.id} type="button" onClick={() => f.premium ? handlePremiumFeature('golden', () => setFps(f.id)) : setFps(f.id)} className={`p-2 text-xs rounded-md font-semibold transition flex items-center justify-center ${fps === f.id ? 'bg-red-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800'}`}>{f.label}{f.premium ? ' ✨' : ''}</button>))}
                        </div>
                    </div>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="language" className="flex items-center text-sm font-medium text-gray-300 mb-2"><LanguageIcon className="w-4 h-4 mr-2"/>Language</label>
                      <select id="language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                          {languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                      </select>
                  </div>
                   <div>
                    <Tooltip text="High quality provides better visuals and fidelity.">
                      <label className="flex items-center text-sm font-medium text-gray-300 mb-2"><CheckBadgeIcon className="w-4 h-4 mr-2" />Quality <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                    </Tooltip>
                    <div className="grid grid-cols-2 gap-2">
                        {videoQualities.map(q => (<button key={q.id} type="button" onClick={() => q.premium ? handlePremiumFeature('golden', () => setQuality(q.id)) : setQuality(q.id)} className={`p-2 text-xs rounded-md font-semibold transition flex items-center justify-center ${quality === q.id ? 'bg-red-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800'}`}>{q.label}{q.premium ? ' ✨' : ''}</button>))}
                    </div>
                  </div>
                </div>
                <div>
                  <Tooltip text="Set a target duration for your video. Longer videos require more generation time.">
                    <label className="flex items-center text-sm font-medium text-gray-300 mb-2"><ClockIcon className="w-4 h-4 mr-2"/>Duration Goal <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                  </Tooltip>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {videoDurations.map(d => (<button key={d.id} type="button" onClick={() => handlePremiumFeature(d.premium as SubscriptionTier, ()=>setDuration(d.id))} className={`p-2 text-xs rounded-md font-semibold transition ${duration === d.id ? 'bg-red-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800'}`}>{d.label}{d.premium !== 'free' ? ' ✨' : ''}</button>))}
                  </div>
                </div>
                 <div>
                    <Tooltip text="Generate an AI soundtrack to match the mood of your video.">
                        <label htmlFor="audio-mood" className="flex items-center text-sm font-medium text-gray-300 mb-2"><MusicalNoteIcon className="w-4 h-4 mr-2"/>Audio Mood (Golden ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                    </Tooltip>
                     <select id="audio-mood" value={audioMood} onChange={(e) => handlePremiumFeature('golden', ()=>setAudioMood(e.target.value as AudioMood))} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                        {audioMoods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="camera-movement" className="block text-sm font-medium text-gray-300 mb-2">Camera Movement</label>
                    <select id="camera-movement" value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value as CameraMovement)} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                        {cameraMovements.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                   <div>
                    <Tooltip text="Control how fast or slow the camera movement is.">
                        <label htmlFor="motion-intensity" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Motion Intensity (Golden ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                    </Tooltip>
                    <div className="grid grid-cols-3 gap-2">
                        {intensities.map(i => <button type="button" key={i.id} onClick={() => handlePremiumFeature('golden', () => setMotionIntensity(i.id))} className={`p-2 text-xs rounded-md font-semibold capitalize transition ${motionIntensity === i.id ? 'bg-red-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800'}`}>{i.label}</button>)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="video-framing" className="flex items-center text-sm font-medium text-gray-300 mb-2"><FrameIcon className="w-4 h-4 mr-2" />Framing</label>
                    <select id="video-framing" value={framing} onChange={(e) => setFraming(e.target.value as VideoFraming)} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                        {videoFramings.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="video-style" className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                    <select id="video-style" value={style} onChange={(e) => setStyle(e.target.value as VideoStyle)} className="w-full bg-gray-900/70 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                        {videoStyles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="video-negative-prompt" className="block text-sm font-medium text-gray-300 mb-2">Negative Prompt</label>
                  <textarea id="video-negative-prompt" rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="e.g., watermark, grainy, shaky camera" className="w-full bg-gray-900/70 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition placeholder-gray-500" />
                </div>
                 <div>
                    <Tooltip text="Creates a seamless loop, perfect for GIFs and backgrounds.">
                      <button type="button" onClick={() => handlePremiumFeature('diamond', () => setLoopVideo(!loopVideo))} className={`w-full flex items-center justify-between text-left p-2 rounded-lg transition-colors ${loopVideo ? 'bg-red-900/50' : 'bg-gray-900/70'}`}>
                          <span className="flex items-center font-medium"><ArrowPathRoundedSquareIcon className="mr-2" />Loop Video (Diamond ✨)</span>
                          <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${loopVideo ? 'bg-red-600' : 'bg-gray-600'}`}>
                              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${loopVideo ? 'translate-x-5' : ''}`}></div>
                          </div>
                      </button>
                    </Tooltip>
                 </div>
              </div>
            )}
           </div>
          
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={isSubmitDisabled} className="flex justify-center items-center bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed interactive-glow-button">
              {isLoading ? <Spinner /> : <><ArrowPathIcon className="mr-2"/> Generate</>}
            </button>
          </div>
          
          {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        </form>
      </div>

      <div className="lg:col-span-3 bg-gradient-panel rounded-lg p-6 flex flex-col items-center justify-center border border-[var(--border-color)]">
        {isLoading && <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">{loadingMessage}</p></div>}
        {!isLoading && !generatedVideo && <div className="text-center text-gray-600"><FilmIcon className="mx-auto h-16 w-16" /><p className="mt-2">Your generated video will appear here.</p></div>}
        {generatedVideo && (
            <div className="w-full h-full flex flex-col">
              <div className="flex-grow flex items-center justify-center bg-black/30 rounded-lg p-2">
                <video src={generatedVideo} controls autoPlay loop={loopVideo} className="rounded-lg max-h-full max-w-full object-contain"></video>
              </div>
              <div className="flex-shrink-0 mt-4">
                  <div className="bg-gray-950/50 p-3 rounded-lg text-sm mb-4">
                      <p className="font-semibold text-gray-400">Prompt:</p>
                      <p className="whitespace-pre-wrap break-words text-gray-200">{lastSettings?.prompts[0]}</p>
                      {generatedAudio && <div className="mt-2"><CustomAudioPlayer src={generatedAudio} /></div>}
                  </div>
                   <div className="flex justify-center space-x-4">
                        <button onClick={handleEnhance} disabled={isEnhancing || tierLevels[subscriptionTier] < tierLevels['diamond']} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed group interactive-glow">
                          {isEnhancing ? <Spinner size="sm" /> : <><SparklesIcon className="mr-2 group-disabled:text-gray-500"/> AI Enhance {tierLevels[subscriptionTier] < tierLevels['diamond'] && '(Diamond)'}</>}
                        </button>
                        <a href={generatedVideo} download="generated-video.mp4" className="flex items-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition interactive-glow-button">
                          <ArrowDownTrayIcon className="mr-2"/> Download
                        </a>
                    </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};