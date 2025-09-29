import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImageFromText, transformImage, enhanceImage, generateImageVariations } from '../services/geminiService';
import { Spinner } from './Spinner';
import { PhotoIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, ClipboardIcon, ArrowDownTrayIcon, XCircleIcon, LanguageIcon, SparklesIcon, ArrowsPointingOutIcon, CheckIcon, CubeTransparentIcon, PlusCircleIcon, MinusCircleIcon, ClockIcon, QuestionMarkCircleIcon } from './Icons';
import type { ImageStyle, Language, AIPersona, Toast, SubscriptionTier, GenerationSettings, AspectRatio, Intensity } from '../types';

type ImageToolMode = 'text-to-image' | 'image-transform';

const Tooltip: React.FC<{text: string, children: React.ReactNode}> = ({text, children}) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none shadow-lg border border-[var(--border-color)]">
            {text}
        </div>
    </div>
);

const aspectRatios: {id: AspectRatio, premium: boolean}[] = [ {id: '1:1', premium: false}, {id: '16:9', premium: true}, {id: '9:16', premium: true}, {id: '4:3', premium: false}, {id: '3:4', premium: false} ];
const imageStyles: { id: ImageStyle, label: string }[] = [ { id: 'none', label: 'Default' }, { id: 'photorealistic', label: 'Photorealistic' }, { id: 'fantasy', label: 'Fantasy' }, { id: 'anime', label: 'Anime' }, { id: '3d-render', label: '3D Render' }, { id: 'pixel-art', label: 'Pixel Art' }, ];
const languages: { id: Language, label: string }[] = [ { id: 'english', label: 'English' }, { id: 'kinyarwanda', label: 'Kinyarwanda' }, ];
const personas: { id: AIPersona, label: string, premium: SubscriptionTier | 'free' }[] = [ { id: 'none', label: 'Default', premium: 'free' }, { id: 'photographer', label: 'Photographer', premium: 'free' }, { id: 'illustrator', label: 'Illustrator', premium: 'silver' }, { id: 'concept-artist', label: 'Concept Artist', premium: 'silver' }, { id: 'wildlife-photographer', label: 'Wildlife Photographer', premium: 'golden' }, { id: 'sci-fi-artist', label: 'Sci-Fi Artist', premium: 'golden' }, { id: 'food-photographer', label: 'Food Photographer', premium: 'diamond' }, { id: 'architectural-designer', label: 'Architectural Designer', premium: 'diamond' } ];
const intensities: { id: Intensity, label: string }[] = [{id: 'subtle', label: 'Subtle'}, {id: 'balanced', label: 'Balanced'}, {id: 'strong', label: 'Strong'}];
const batchSizes: (1|2|3|4)[] = [1, 2, 3, 4];
const IMAGE_LOADING_MESSAGES = [ "Contacting the digital muse...", "Mixing colors on the virtual palette...", "Sketching the initial concept...", "Rendering pixels with precision...", "Adding artistic finishing touches...", "Your masterpiece is almost ready..." ];

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ data: base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

interface ImageToolsProps {
  setToast: (message: string, type?: Toast['type']) => void;
  onSaveToLibrary: (item: {type: 'IMAGE', src: string, settings: GenerationSettings, variations?: string[]}) => void;
  subscriptionTier: SubscriptionTier;
  promptUpgrade: () => void;
}

const usePromptHistory = (key: string) => {
    const [history, setHistory] = useState<string[]>([]);
    
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(key);
            if(storedHistory) setHistory(JSON.parse(storedHistory));
        } catch (e) { console.error("Failed to parse prompt history", e); }
    }, [key]);

    const addPromptToHistory = (prompt: string) => {
        if (!prompt.trim()) return;
        try {
            const newHistory = [prompt, ...history.filter(p => p !== prompt)].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem(key, JSON.stringify(newHistory));
        } catch (e) { console.error("Failed to save prompt history", e); }
    };
    return { history, addPromptToHistory };
}

export const ImageTools: React.FC<ImageToolsProps> = ({ setToast, onSaveToLibrary, subscriptionTier, promptUpgrade }) => {
  const [mode, setMode] = useState<ImageToolMode>('text-to-image');
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState<ImageStyle>('none');
  const [language, setLanguage] = useState<Language>('english');
  const [persona, setPersona] = useState<AIPersona>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [seed, setSeed] = useState<string>('');
  const [styleIntensity, setStyleIntensity] = useState<Intensity>('balanced');
  const [negativeIntensity, setNegativeIntensity] = useState<Intensity>('balanced');
  const [batchSize, setBatchSize] = useState<1|2|3|4>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(IMAGE_LOADING_MESSAGES[0]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSettings, setLastSettings] = useState<GenerationSettings | null>(null);
  const { history: promptHistory, addPromptToHistory } = usePromptHistory('image-prompt-history');
  const [showHistory, setShowHistory] = useState(false);

  const tierLevels: Record<SubscriptionTier, number> = { free: 0, silver: 1, golden: 2, diamond: 3 };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = IMAGE_LOADING_MESSAGES.indexOf(prev);
          return IMAGE_LOADING_MESSAGES[(currentIndex + 1) % IMAGE_LOADING_MESSAGES.length];
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompts.join('; '));
    setCopied(true);
    setToast('Prompt copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handlePremiumFeature = (requiredTier: SubscriptionTier, action: () => void) => {
    if (tierLevels[subscriptionTier] < tierLevels[requiredTier]) {
        promptUpgrade();
    } else {
        action();
    }
  };

  const handleFileSelect = (file: File) => {
     if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
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
  
  const handlePromptChange = (index: number, value: string) => {
      const newPrompts = [...prompts];
      newPrompts[index] = value;
      setPrompts(newPrompts);
  }
  
  const addPromptField = () => handlePremiumFeature('diamond', () => setPrompts([...prompts, '']));
  const removePromptField = (index: number) => setPrompts(prompts.filter((_, i) => i !== index));

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const validPrompts = prompts.filter(p => p.trim() !== '');
    if (validPrompts.length === 0 || (mode === 'image-transform' && !imageFile)) {
      setError("A valid prompt and image (for transform) are required.");
      return;
    }

    setIsLoading(true); setError(null); setGeneratedImages([]); setSelectedImage(null); setVariations([]);
    setLoadingMessage(IMAGE_LOADING_MESSAGES[0]);

    const currentSettings: GenerationSettings = { prompts: validPrompts, negativePrompt, style, language, persona, aspectRatio, seed: seed ? parseInt(seed, 10) : undefined, styleIntensity, negativeIntensity, batchSize };
    setLastSettings(currentSettings);
    addPromptToHistory(validPrompts.join('; '));

    try {
      if (mode === 'image-transform' && imageFile) {
        const image = await fileToBase64(imageFile);
        const result = await transformImage(validPrompts[0], image);
        setGeneratedImages([result]);
        setSelectedImage(result);
        onSaveToLibrary({ type: 'IMAGE', src: result, settings: currentSettings });
      } else {
        const results = await generateImageFromText(validPrompts, aspectRatio, style, negativePrompt, language, persona, styleIntensity, negativeIntensity, batchSize, currentSettings.seed);
        setGeneratedImages(results);
        setSelectedImage(results[0]);
        onSaveToLibrary({ type: 'IMAGE', src: results[0], settings: currentSettings, variations: results.slice(1) });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [prompts, negativePrompt, style, imageFile, mode, aspectRatio, language, persona, seed, styleIntensity, negativeIntensity, batchSize, onSaveToLibrary, setToast, addPromptToHistory]);
  
  const handleEnhance = async () => {
    if (!selectedImage) return;
    handlePremiumFeature('diamond', async () => {
        setIsEnhancing(true); setError(null);
        try {
            const base64Data = selectedImage.split(',')[1];
            const result = await enhanceImage({ data: base64Data, mimeType: 'image/png'});
            setSelectedImage(result);
            setGeneratedImages([result]);
            setVariations([]);
            onSaveToLibrary({ type: 'IMAGE', src: result, settings: { ...lastSettings!, prompts: [`${lastSettings?.prompts.join('; ')} (Enhanced)`] } });
            setToast('Image enhanced successfully!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Enhance failed.';
            setError(errorMessage);
            setToast(errorMessage, 'error');
        } finally {
            setIsEnhancing(false);
        }
    });
  };

  const handleVariations = async () => {
    if (!selectedImage || !lastSettings) return;
    handlePremiumFeature('golden', async () => {
        setIsGeneratingVariations(true); setError(null);
        try {
            const base64Data = selectedImage.split(',')[1];
            const results = await generateImageVariations(lastSettings.prompts.join('; '), { data: base64Data, mimeType: 'image/png'});
            setVariations(results);
            setGeneratedImages([selectedImage, ...results]);
            onSaveToLibrary({ type: 'IMAGE', src: selectedImage, settings: lastSettings, variations: results });
            setToast('Variations generated!', 'success');
        } catch(err) {
            const errorMessage = err instanceof Error ? err.message : 'Variation generation failed.';
            setError(errorMessage); setToast(errorMessage, 'error');
        } finally {
            setIsGeneratingVariations(false);
        }
    });
  };

  const resetForm = () => {
    setPrompts(['']); setNegativePrompt(''); setStyle('none'); setLanguage('english'); setPersona('none'); clearImage(); setGeneratedImages([]); setSelectedImage(null); setError(null); setSeed(''); setStyleIntensity('balanced'); setNegativeIntensity('balanced'); setVariations([]); setBatchSize(1);
  };

  const isSubmitDisabled = isLoading || prompts.every(p => p.trim() === '') || (mode === 'image-transform' && !imageFile);

  const mainContent = () => {
    if (isLoading) return <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">{loadingMessage}</p></div>;
    if (isGeneratingVariations) return <div className="text-center"><Spinner size="lg" /><p className="mt-2 text-gray-400">Generating Variations...</p></div>;
    if (generatedImages.length === 0) return <div className="text-center text-gray-600"><PhotoIcon className="mx-auto h-16 w-16" /><p className="mt-2">Your generated image will appear here.</p></div>;
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-grow flex items-center justify-center bg-black/30 rounded-lg p-2 min-h-0">
                {generatedImages.length > 1 ? (
                    <div className="grid grid-cols-2 gap-2 aspect-square max-h-full max-w-full">
                        {generatedImages.map((img, i) => (
                            <img key={i} src={img} alt={`Result ${i+1}`} className={`rounded-lg object-contain cursor-pointer transition ring-2 ${selectedImage === img ? 'ring-red-500' : 'ring-transparent hover:ring-red-500/50'}`} onClick={() => setSelectedImage(img)}/>
                        ))}
                    </div>
                ) : (
                    <img src={selectedImage} alt="Generated" className="rounded-lg max-h-full max-w-full object-contain" />
                )}
            </div>
            {selectedImage && <div className="flex-shrink-0 mt-4">
                 <div className="flex justify-center space-x-2 sm:space-x-4">
                      <button onClick={handleVariations} disabled={isGeneratingVariations || tierLevels[subscriptionTier] < tierLevels['golden']} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed group interactive-glow text-xs sm:text-sm">
                        {isGeneratingVariations ? <Spinner size="sm" /> : <><SparklesIcon className="mr-2 group-disabled:text-gray-500"/> Variations {tierLevels[subscriptionTier] < tierLevels['golden'] && '(Golden)'}</>}
                      </button>
                      <button onClick={handleEnhance} disabled={isEnhancing || tierLevels[subscriptionTier] < tierLevels['diamond']} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed group interactive-glow text-xs sm:text-sm">
                        {isEnhancing ? <Spinner size="sm" /> : <><ArrowsPointingOutIcon className="mr-2 group-disabled:text-gray-500"/> AI Enhance {tierLevels[subscriptionTier] < tierLevels['diamond'] && '(Diamond)'}</>}
                      </button>
                      <a href={selectedImage} download="generated-image.png" className="flex items-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition interactive-glow-button text-xs sm:text-sm">
                        <ArrowDownTrayIcon className="mr-2"/> Download
                      </a>
                  </div>
            </div>}
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 h-full">
      <div className="lg:col-span-2 bg-gradient-panel rounded-lg p-6 flex flex-col border border-[var(--border-color)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Image Tools</h2>
          <button onClick={resetForm} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full"><XCircleIcon /></button>
        </div>
        
        <div className="flex bg-gray-950/50 p-1 rounded-lg mb-6">
          <button onClick={() => setMode('text-to-image')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${mode === 'text-to-image' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Text-to-Image</button>
          <button onClick={() => { setMode('image-transform'); setPrompts(['']);}} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${mode === 'image-transform' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Image Transform</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2">
          <div className="flex-grow space-y-4">
            {mode === 'image-transform' && (
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
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                    {mode === 'text-to-image' && prompts.length > 1 ? 'Prompts to Blend (Diamond ✨)' : 'Prompt'}
                </label>
              <div className="relative">
                {prompts.map((p, i) => (
                    <div key={i} className="relative mb-2">
                        <textarea rows={prompts.length > 1 ? 2 : 5} value={p} onChange={(e) => handlePromptChange(i, e.target.value)} placeholder={mode === 'image-transform' ? "A detailed description of the transformation..." : "A majestic lion on a grassy plain..."} className="w-full bg-gray-800 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition pr-10"/>
                        {prompts.length > 1 && <button type="button" onClick={() => removePromptField(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded-full transition"><MinusCircleIcon /></button>}
                    </div>
                ))}
                {mode === 'text-to-image' && prompts.length < 3 && <button type="button" onClick={addPromptField} title="Add another prompt to blend (Diamond)" className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-full transition"><PlusCircleIcon /></button>}
              </div>
               <div className="flex justify-between items-center text-xs mt-1">
                   <div className="relative">
                       <button type="button" onClick={() => setShowHistory(!showHistory)} className="flex items-center text-gray-400 hover:text-white"><ClockIcon className="mr-1 w-4 h-4" /> History</button>
                       {showHistory && (
                           <div className="absolute bottom-full mb-2 w-72 bg-gray-900 border border-[var(--border-color)] rounded-lg shadow-xl z-10">
                               {promptHistory.length > 0 ? promptHistory.map((p,i) => <p key={i} onClick={() => {setPrompts([p]); setShowHistory(false);}} className="p-2 hover:bg-gray-800 cursor-pointer truncate">{p}</p>) : <p className="p-2 text-gray-500">No history</p>}
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <Tooltip text="Generate multiple images from one prompt.">
                                 <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Batch Size (Diamond ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                            </Tooltip>
                            <div className="grid grid-cols-4 gap-2">
                                {batchSizes.map(size => ( <button key={size} type="button" onClick={() => handlePremiumFeature('diamond', () => setBatchSize(size))} className={`p-2 text-xs rounded-md font-semibold transition flex items-center justify-center ${batchSize === size ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{size}</button>))}
                            </div>
                        </div>
                        <div>
                            <Tooltip text="Choose the output dimensions for your image. Cinematic ratios are a premium feature.">
                                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Aspect Ratio <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                            </Tooltip>
                            <div className="grid grid-cols-3 gap-2">
                                {aspectRatios.map(ratio => ( <button key={ratio.id} type="button" onClick={() => ratio.premium ? handlePremiumFeature('golden', () => setAspectRatio(ratio.id)) : setAspectRatio(ratio.id)} className={`p-2 text-xs rounded-md font-semibold transition flex items-center justify-center ${aspectRatio === ratio.id ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{ratio.id}{ratio.premium ? ' ✨' : ''}</button>))}
                            </div>
                        </div>
                    </div>
                     <div>
                         <Tooltip text="Guide the AI to act as a specialist for higher quality, more specific results.">
                             <label htmlFor="persona" className="flex items-center text-sm font-medium text-gray-300 mb-2"><SparklesIcon className="w-4 h-4 mr-2"/>AI Persona <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                         </Tooltip>
                        <select id="persona" value={persona} onChange={(e) => handlePremiumFeature(personas.find(p => p.id === e.target.value)!.premium as SubscriptionTier, () => setPersona(e.target.value as AIPersona))} className="w-full bg-gray-800 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                            {personas.map(p => <option key={p.id} value={p.id}>{p.label}{p.premium !== 'free' ? ` (${p.premium.charAt(0).toUpperCase() + p.premium.slice(1)})` : ''}</option>)}
                        </select>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="language" className="flex items-center text-sm font-medium text-gray-300 mb-2"><LanguageIcon className="w-4 h-4 mr-2"/>Language</label>
                        <select id="language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-gray-800 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                            {languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="style" className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                        <select id="style" value={style} onChange={(e) => setStyle(e.target.value as ImageStyle)} className="w-full bg-gray-800 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                          {imageStyles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                     <div>
                         <Tooltip text="Control how strongly the chosen style is applied to the image.">
                            <label htmlFor="style-intensity" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">Style Intensity (Golden ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                         </Tooltip>
                        <div className="grid grid-cols-3 gap-2">
                          {intensities.map(i => <button type="button" key={i.id} onClick={() => handlePremiumFeature('golden', () => setStyleIntensity(i.id))} className={`p-2 text-xs rounded-md font-semibold capitalize transition ${styleIntensity === i.id ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{i.label}</button>)}
                        </div>
                    </div>
                    <div>
                      <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300 mb-2">Negative Prompt</label>
                      <textarea id="negative-prompt" rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="e.g., blurry, low quality, text, watermark" className="w-full bg-gray-800 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition" />
                       <Tooltip text="Control how strongly the AI should avoid the negative prompt concepts.">
                          <label htmlFor="negative-intensity" className="block text-sm font-medium text-gray-300 my-2 flex items-center">Negative Intensity (Diamond ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                       </Tooltip>
                      <div className="grid grid-cols-3 gap-2">
                          {intensities.map(i => <button type="button" key={i.id} onClick={() => handlePremiumFeature('diamond', () => setNegativeIntensity(i.id))} className={`p-2 text-xs rounded-md font-semibold capitalize transition ${negativeIntensity === i.id ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{i.label}</button>)}
                      </div>
                    </div>
                    <div>
                        <Tooltip text="Use the same number to get consistent results for the same prompt, perfect for creating characters.">
                             <label htmlFor="seed" className="flex items-center text-sm font-medium text-gray-300 mb-2"><CubeTransparentIcon className="w-4 h-4 mr-2"/>Seed (Diamond ✨) <QuestionMarkCircleIcon className="ml-1 text-gray-500"/></label>
                        </Tooltip>
                        <input type="number" id="seed" value={seed} onChange={(e) => handlePremiumFeature('diamond', () => setSeed(e.target.value))} placeholder="Enter a number for reproducible results" className="w-full bg-gray-800 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition" disabled={tierLevels[subscriptionTier] < tierLevels['diamond']}/>
                    </div>
                  </div>
                )}
              </div>
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
        {mainContent()}
      </div>
    </div>
  );
};