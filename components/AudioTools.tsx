import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, Blob as GenAIBlob, LiveServerMessage } from '@google/genai';
import { MicrophoneIcon, SpeakerWaveIcon, StopCircleIcon, DocumentDuplicateIcon, XCircleIcon, UploadCloudIcon, PlayCircleIcon, ArrowDownTrayIcon, CheckIcon, SparklesIcon, WandSparklesIcon, LanguageIcon, AdjustmentsHorizontalIcon, ChatBubbleBottomCenterTextIcon, SoundWaveIcon } from './Icons';
import { transcribeAudioFromFile, generateSoundEffect, enhanceAudio } from '../services/geminiService';
import type { Toast, SubscriptionTier, AudioToolMode, SpeechToTextMode, RecordingStatus, SoundFXStyle, Language, AudioEnhancementMode } from '../types';
import { Spinner } from './Spinner';

const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
};

const createBlobFromAudio = (data: Float32Array): GenAIBlob => {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) { int16[i] = data[i] < 0 ? data[i] * 32768 : data[i] * 32767; }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
};

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
    reader.onerror = (error) => reject(error);
  });
};

const CustomAudioPlayer: React.FC<{src: string}> = ({src}) => (
    <div className="w-full bg-gray-800 rounded-lg p-2 flex items-center space-x-2">
        <audio controls src={src} className="w-full custom-audio-player"></audio>
    </div>
);

interface AudioToolsProps {
  setToast: (message: string, type?: Toast['type']) => void;
  subscriptionTier: SubscriptionTier;
  promptUpgrade: () => void;
}

const fxStyles: {id: SoundFXStyle, label: string}[] = [ {id: 'none', label: 'Default'}, {id: 'realistic', label: 'Realistic'}, {id: 'cartoon', label: 'Cartoon'}, {id: 'cinematic', label: 'Cinematic'}];
const enhancementModes: {id: AudioEnhancementMode, label: string, premium: SubscriptionTier, icon: React.ReactNode, description: string}[] = [
    { id: 'noise-reduction', label: 'Noise Reduction', premium: 'silver', icon: <AdjustmentsHorizontalIcon />, description: 'Remove background noise and hum.'},
    { id: 'speech-enhancement', label: 'Speech Enhancement', premium: 'golden', icon: <ChatBubbleBottomCenterTextIcon />, description: 'Isolate and clarify vocals.'},
    { id: 'sound-isolation', label: 'Sound Isolation', premium: 'diamond', icon: <SoundWaveIcon />, description: 'Separate distinct audio tracks.'},
];


export const AudioTools: React.FC<AudioToolsProps> = ({ setToast, subscriptionTier, promptUpgrade }) => {
    const [mode, setMode] = useState<AudioToolMode>('speech-to-text');
    const [sttMode, setSttMode] = useState<SpeechToTextMode>('live');
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [transcript, setTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [sttError, setSttError] = useState<string | null>(null);
    const [sttLanguage, setSttLanguage] = useState<Language>('english');
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [isTranscribingFile, setIsTranscribingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [ttsText, setTtsText] = useState('');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
    const [ttsError, setTtsError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [fxPrompt, setFxPrompt] = useState('');
    const [fxStyle, setFxStyle] = useState<SoundFXStyle>('none');
    const [isGeneratingFx, setIsGeneratingFx] = useState(false);
    const [generatedFx, setGeneratedFx] = useState<string | null>(null);
    const [fxError, setFxError] = useState<string | null>(null);
    const tierLevels: Record<SubscriptionTier, number> = { free: 0, silver: 1, golden: 2, diamond: 3 };
    
    // Audio Enhancement State
    const [enhancementFile, setEnhancementFile] = useState<File|null>(null);
    const [enhancementFilePreview, setEnhancementFilePreview] = useState<string|null>(null);
    const [enhancementMode, setEnhancementMode] = useState<AudioEnhancementMode>('noise-reduction');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancedAudio, setEnhancedAudio] = useState<string|null>(null);
    const [enhancementError, setEnhancementError] = useState<string|null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                setAvailableVoices(voices);
                const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                setSelectedVoiceURI(defaultVoice?.voiceURI || '');
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const drawWaveform = useCallback(() => {
        if (status !== 'recording' || !analyserRef.current || !waveformCanvasRef.current) return;
        const analyser = analyserRef.current;
        const canvas = waveformCanvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = 'rgba(17, 24, 39, 0.5)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#ef4444';
        canvasCtx.beginPath();
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }, [status]);

    const startRecording = async () => {
        setStatus('connecting'); setSttError(null); setTranscript(''); setFinalTranscript('');
        try {
            if (!process.env.API_KEY) throw new Error("API Key not found.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const langInstruction = sttLanguage === 'kinyarwanda' ? 'The user will be speaking in Kinyarwanda. Transcribe accurately.' : 'The user will be speaking in English. Transcribe accurately.';
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
                        const source = audioContextRef.current.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                        analyserRef.current = audioContextRef.current.createAnalyser();
                        analyserRef.current.fftSize = 2048;
                        scriptProcessorRef.current.onaudioprocess = (e) => sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: createBlobFromAudio(e.inputBuffer.getChannelData(0)) }));
                        source.connect(analyserRef.current);
                        analyserRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current.destination);
                        setStatus('recording');
                    },
                    onmessage: (msg: LiveServerMessage) => {
                        if (msg.serverContent?.inputTranscription) setTranscript(prev => prev + msg.serverContent.inputTranscription.text);
                        if (msg.serverContent?.turnComplete) { setFinalTranscript(prev => (prev + transcript + ' ').trim()); setTranscript(''); }
                    },
                    onerror: (e: any) => { console.error('Session error:', e); setSttError('Transcription service error.'); stopRecording(); },
                    onclose: (e: any) => { setStatus('idle'); },
                },
                config: { inputAudioTranscription: {}, responseModalities: [Modality.AUDIO], systemInstruction: `You are a transcription expert. ${langInstruction}` }
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not start. Check microphone permissions.";
            setSttError(msg); setToast(msg, 'error'); setStatus('idle');
        }
    };
    
    useEffect(() => {
        if (status === 'recording') drawWaveform();
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [status, drawWaveform]);

    const stopRecording = useCallback(async () => {
        setStatus('stopping');
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (sessionPromiseRef.current) {
            try { (await sessionPromiseRef.current).close(); } catch (e) { console.error("Error closing session", e); }
            sessionPromiseRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        if (audioContextRef.current?.state !== 'closed') await audioContextRef.current?.close();
        setFinalTranscript(prev => (prev + transcript).trim()); setTranscript(''); setStatus('idle');
    }, [transcript]);

    const handleFileTranscription = async (file: File) => {
        if (!file || !file.type.match('audio.*|video.*')) { setSttError("Please select a valid audio or video file."); return; }
        setIsTranscribingFile(true); setSttError(null); setFinalTranscript('');
        try {
            const result = await transcribeAudioFromFile(await fileToBase64(file), sttLanguage);
            setFinalTranscript(result);
            setToast("Transcription complete!", "success");
        } catch(err) {
            const msg = err instanceof Error ? err.message : "File transcription failed.";
            setSttError(msg); setToast(msg, 'error');
        } finally { setIsTranscribingFile(false); }
    }
    
    const handleGenerateSpeech = () => {
        if (!ttsText.trim()) { setTtsError("Please enter some text."); return; }
        setIsGeneratingSpeech(true); setTtsError(null); setGeneratedAudio(null);
        try {
            const utterance = new SpeechSynthesisUtterance(ttsText);
            const selectedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
            }
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({});
            const destination = audioContext.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(destination.stream);
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                setGeneratedAudio(URL.createObjectURL(blob));
                setIsGeneratingSpeech(false);
                setToast("Speech generated!", "success");
            };

            const source = audioContext.createBufferSource(); source.connect(destination);

            utterance.onend = () => { setTimeout(() => { try { mediaRecorder.stop(); audioContext.close(); } catch(e) {} }, 100); };
            utterance.onerror = (e) => { setTtsError(`Speech synthesis error: ${e.error}`); setIsGeneratingSpeech(false); try { mediaRecorder.stop(); audioContext.close(); } catch(e) {} }

            mediaRecorder.start();
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            const msg = "Speech generation failed. Your browser may not support this feature.";
            setTtsError(msg); setToast(msg, 'error'); setIsGeneratingSpeech(false);
        }
    };

    const handleGenerateFx = async () => {
        if (tierLevels[subscriptionTier] < tierLevels['golden']) {
            promptUpgrade();
            return;
        }
        if (!fxPrompt.trim()) { setFxError("Please describe the sound effect."); return; }
        setIsGeneratingFx(true); setFxError(null); setGeneratedFx(null);
        try {
            const result = await generateSoundEffect(fxPrompt, fxStyle);
            setGeneratedFx(result);
            setToast("Sound effect generated!", "success");
        } catch(err) {
            const msg = err instanceof Error ? err.message : "Sound effect generation failed.";
            setFxError(msg); setToast(msg, 'error');
        } finally { setIsGeneratingFx(false); }
    };

    const handleEnhanceAudio = async () => {
       const requiredTier = enhancementModes.find(m => m.id === enhancementMode)!.premium;
        if (tierLevels[subscriptionTier] < tierLevels[requiredTier]) {
            promptUpgrade();
            return;
        }
        if (!enhancementFile) { setEnhancementError("Please upload an audio file."); return; }
        setIsEnhancing(true); setEnhancementError(null); setEnhancedAudio(null);
        try {
            const result = await enhanceAudio(await fileToBase64(enhancementFile), enhancementMode);
            setEnhancedAudio(result);
            setToast("Audio enhanced successfully!", "success");
        } catch(err) {
            const msg = err instanceof Error ? err.message : "Audio enhancement failed.";
            setEnhancementError(msg); setToast(msg, 'error');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleEnhancementFile = (file: File) => {
        if (file && file.type.startsWith('audio/')) {
            setEnhancementFile(file);
            setEnhancementFilePreview(URL.createObjectURL(file));
        } else {
            setToast("Please select a valid audio file.", "error");
        }
    };
    
    const resetAll = () => {
        if (status === 'recording') stopRecording();
        setTranscript(''); setFinalTranscript(''); setSttError(null); setTtsText(''); setGeneratedAudio(null); setTtsError(null); setIsTranscribingFile(false);
        setFxPrompt(''); setGeneratedFx(null); setFxError(null); setIsGeneratingFx(false); setFxStyle('none');
        setEnhancementFile(null); setEnhancementFilePreview(null); setEnhancedAudio(null); setEnhancementError(null);
    }
    
    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setToast('Transcript copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
    
    const filteredVoices = (lang: 'en' | 'rw') => availableVoices.filter(v => v.lang.startsWith(lang));

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Audio Suite</h2>
                <button onClick={resetAll} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full"><XCircleIcon /></button>
            </div>
            <div className="flex bg-gray-950/50 p-1 rounded-lg mb-6 text-sm font-semibold">
                <button onClick={() => setMode('speech-to-text')} className={`w-1/4 py-2 rounded-md transition ${mode === 'speech-to-text' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Speech-to-Text</button>
                <button onClick={() => setMode('text-to-speech')} className={`w-1/4 py-2 rounded-md transition ${mode === 'text-to-speech' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Text-to-Speech</button>
                <button onClick={() => setMode('sound-fx')} className={`w-1/4 py-2 rounded-md transition ${mode === 'sound-fx' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Sound FX</button>
                <button onClick={() => setMode('audio-enhancement')} className={`w-1/4 py-2 rounded-md transition ${mode === 'audio-enhancement' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>Enhancement</button>
            </div>
            <div className="bg-gradient-panel rounded-lg flex-grow border border-[var(--border-color)] overflow-hidden">
                {mode === 'speech-to-text' ? (
                    <div className="flex flex-col h-full">
                        <div className="flex bg-black/20 p-1 rounded-t-lg border-b border-[var(--border-color)] items-center">
                           <button onClick={() => setSttMode('live')} className={`w-1/2 py-2 text-sm font-semibold transition ${sttMode === 'live' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Live Recording</button>
                           <button onClick={() => setSttMode('file')} className={`w-1/2 py-2 text-sm font-semibold transition ${sttMode === 'file' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Transcribe File</button>
                           <div className="w-px h-6 bg-gray-700 mx-2"></div>
                           <div className="flex items-center space-x-2 px-2">
                             <LanguageIcon className="w-5 h-5 text-gray-400" />
                             <select value={sttLanguage} onChange={e => setSttLanguage(e.target.value as Language)} className="bg-transparent text-sm text-gray-300 focus:outline-none">
                                <option value="english">English</option>
                                <option value="kinyarwanda">Kinyarwanda</option>
                             </select>
                           </div>
                        </div>
                        {sttMode === 'live' && (
                          <div className="flex flex-col h-full">
                            <div className="flex-grow flex flex-col items-center justify-center p-4 relative bg-black/20">
                                <canvas ref={waveformCanvasRef} width="600" height="150" className="absolute inset-0 w-full h-full opacity-50"></canvas>
                                <button onClick={status === 'idle' ? startRecording : stopRecording} disabled={status === 'connecting' || status === 'stopping'} className={`z-10 relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ease-in-out group ${ status === 'recording' ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700' } disabled:bg-gray-900 disabled:cursor-not-allowed interactive-glow-button`}>
                                    {status === 'recording' && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>}
                                    {status === 'recording' ? <StopCircleIcon className="w-12 h-12 text-white" /> : <MicrophoneIcon className="w-12 h-12 text-white" />}
                                </button>
                                <p className="z-10 mt-4 text-gray-400 font-semibold capitalize">{status === 'idle' ? 'Click to Record' : `${status}...`}</p>
                            </div>
                            <div className="bg-gray-950/50 border-t border-[var(--border-color)] p-4 rounded-b-lg flex-shrink-0 h-1/2 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold text-white">Live Transcript</h3>
                                    <button onClick={() => handleCopy((finalTranscript + transcript).trim())} className="text-gray-400 hover:text-white transition p-1 rounded-full">{copied ? <CheckIcon className="text-green-500"/> : <DocumentDuplicateIcon />}</button>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 flex-grow overflow-y-auto text-gray-300 whitespace-pre-wrap">
                                    {finalTranscript}{transcript}{status === 'recording' && <span className="inline-block w-2 h-4 bg-red-500 animate-pulse ml-1"></span>}
                                </div>
                                {sttError && <p className="mt-2 text-sm text-red-400">{sttError}</p>}
                            </div>
                          </div>
                        )}
                        {sttMode === 'file' && (
                             <div className="flex flex-col h-full">
                               <div className="flex-grow flex flex-col items-center justify-center p-4">
                                  <div className={`relative w-full max-w-md flex flex-col justify-center items-center rounded-lg border-2 border-dashed p-8 h-48 transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-gray-600'}`} onDragOver={(e)=>{e.preventDefault(); setIsDragging(true);}} onDragLeave={()=>{setIsDragging(false);}} onDrop={(e)=>{e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) handleFileTranscription(e.dataTransfer.files[0])}}>
                                    <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={(e)=> e.target.files && handleFileTranscription(e.target.files[0])} className="sr-only" />
                                    <UploadCloudIcon className="h-12 w-12 text-gray-500"/>
                                    <p className="mt-2 text-sm text-gray-400"><span className="font-semibold text-red-500 cursor-pointer" onClick={()=>fileInputRef.current?.click()}>Click to upload</span> or drag & drop</p>
                                    <p className="text-xs text-gray-500">Audio or Video File</p>
                                  </div>
                               </div>
                                <div className="bg-gray-950/50 border-t border-[var(--border-color)] p-4 rounded-b-lg flex-shrink-0 h-1/2 flex flex-col">
                                    <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-semibold text-white">File Transcript</h3> <button onClick={() => handleCopy(finalTranscript)} className="text-gray-400 hover:text-white transition p-1 rounded-full">{copied ? <CheckIcon className="text-green-500"/> : <DocumentDuplicateIcon />}</button></div>
                                    <div className="bg-gray-800 rounded-lg p-3 flex-grow overflow-y-auto"><p className="text-gray-300 whitespace-pre-wrap">{isTranscribingFile ? <div className="flex items-center justify-center h-full"><Spinner /></div> : finalTranscript || <span className="text-gray-500">Upload a file to begin transcription...</span>}</p></div>
                                    {sttError && <p className="mt-2 text-sm text-red-400">{sttError}</p>}
                                </div>
                             </div>
                        )}
                    </div>
                ) : mode === 'text-to-speech' ? (
                    <div className="flex flex-col h-full p-6 space-y-4">
                        <h3 className="text-xl font-semibold text-white">Text-to-Speech</h3>
                        <div>
                            <label htmlFor="tts-text" className="block text-sm font-medium text-gray-300 mb-2">Your Text</label>
                            <textarea id="tts-text" rows={6} value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder="Enter text to convert to speech..." className="w-full bg-gray-800 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition" />
                        </div>
                        <div>
                            <label htmlFor="voice" className="block text-sm font-medium text-gray-300 mb-2">System Voice</label>
                             <select id="voice" value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)} className="w-full bg-gray-800 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-red-500 border border-gray-700 transition">
                                <optgroup label="English">
                                    {filteredVoices('en').map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                                </optgroup>
                                <optgroup label="Kinyarwanda">
                                     {filteredVoices('rw').map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                                </optgroup>
                                <optgroup label="Other">
                                    {availableVoices.filter(v => !v.lang.startsWith('en') && !v.lang.startsWith('rw')).map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            {generatedAudio ? (
                                <div className="w-full max-w-sm flex flex-col items-center space-y-4">
                                    <CustomAudioPlayer src={generatedAudio} />
                                    <a href={generatedAudio} download="generated-speech.webm" className="flex items-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition interactive-glow-button">
                                        <ArrowDownTrayIcon className="mr-2"/> Download
                                    </a>
                                </div>
                            ) : (
                                <button onClick={handleGenerateSpeech} disabled={isGeneratingSpeech} className="flex items-center justify-center bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:bg-gray-800 disabled:text-gray-500 interactive-glow-button">
                                    {isGeneratingSpeech ? <Spinner /> : <><PlayCircleIcon className="mr-2"/> Generate Speech</>}
                                </button>
                            )}
                        </div>
                        {ttsError && <p className="mt-2 text-sm text-red-400">{ttsError}</p>}
                    </div>
                ) : mode === 'sound-fx' ? (
                    <div className="flex flex-col h-full p-6 space-y-4">
                        <h3 className="text-xl font-semibold text-white">AI Sound FX Generator <span className="text-sm font-normal text-yellow-400">(Golden ✨)</span></h3>
                        <div>
                            <label htmlFor="fx-prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe the sound</label>
                            <textarea id="fx-prompt" rows={4} value={fxPrompt} onChange={(e) => setFxPrompt(e.target.value)} placeholder="e.g., A heavy wooden door creaking open in a castle..." className="w-full bg-gray-800 text-gray-200 rounded-md p-3 focus:ring-2 focus:ring-red-500 border border-gray-700 transition" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">Style Modifier</label>
                           <div className="grid grid-cols-4 gap-2">
                                {fxStyles.map(s => <button key={s.id} onClick={() => setFxStyle(s.id)} className={`p-2 text-xs rounded-md font-semibold capitalize transition ${fxStyle === s.id ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{s.label}</button>)}
                           </div>
                        </div>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            {generatedFx ? (
                                <div className="w-full max-w-sm flex flex-col items-center space-y-4">
                                    <CustomAudioPlayer src={generatedFx} />
                                    <a href={generatedFx} download="generated-fx.wav" className="flex items-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition interactive-glow-button">
                                        <ArrowDownTrayIcon className="mr-2"/> Download FX
                                    </a>
                                </div>
                            ) : (
                                <button onClick={handleGenerateFx} disabled={isGeneratingFx} className="flex items-center justify-center bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:bg-gray-800 disabled:text-gray-500 interactive-glow-button">
                                    {isGeneratingFx ? <Spinner /> : <><SparklesIcon className="mr-2"/> Generate FX</>}
                                </button>
                            )}
                        </div>
                        {fxError && <p className="mt-2 text-sm text-red-400">{fxError}</p>}
                    </div>
                ) : ( // Audio Enhancement
                    <div className="flex flex-col h-full p-6 space-y-4">
                        <h3 className="text-xl font-semibold text-white">AI Audio Enhancement</h3>
                        <p className="text-sm text-gray-400">Upload an audio file to refine sounds, remove background noise, and enhance speech clarity.</p>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            {!enhancementFile && (
                                <div className={`relative w-full max-w-md flex flex-col justify-center items-center rounded-lg border-2 border-dashed p-8 h-48 transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-gray-600'}`} onDragOver={(e)=>{e.preventDefault(); setIsDragging(true);}} onDragLeave={()=>{setIsDragging(false);}} onDrop={(e)=>{e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) handleEnhancementFile(e.dataTransfer.files[0])}}>
                                    <input type="file" accept="audio/*" onChange={(e)=> e.target.files && handleEnhancementFile(e.target.files[0])} className="sr-only" ref={fileInputRef}/>
                                    <UploadCloudIcon className="h-12 w-12 text-gray-500"/>
                                    <p className="mt-2 text-sm text-gray-400"><span className="font-semibold text-red-500 cursor-pointer" onClick={()=>fileInputRef.current?.click()}>Click to upload</span> or drag & drop</p>
                                </div>
                            )}
                            {enhancementFile && (
                                <div className="w-full max-w-lg space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-400 mb-1">Original:</p>
                                        <CustomAudioPlayer src={enhancementFilePreview!} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-300">Enhancement Mode:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {enhancementModes.map(mode => (
                                                <button key={mode.id} onClick={() => setEnhancementMode(mode.id)} className={`p-3 text-left rounded-lg transition border-2 ${enhancementMode === mode.id ? 'bg-red-900/50 border-red-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`}>
                                                    <div className="flex items-center"><span className="mr-2">{mode.icon}</span>{mode.label}</div>
                                                    <p className="text-xs text-gray-400 mt-1">{mode.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {enhancedAudio && (
                                        <div>
                                            <p className="text-sm font-medium text-green-400 mb-1">Enhanced:</p>
                                            <CustomAudioPlayer src={enhancedAudio} />
                                        </div>
                                    )}
                                    <div className="flex justify-center space-x-4 pt-4">
                                        <button onClick={() => { setEnhancementFile(null); setEnhancementFilePreview(null); setEnhancedAudio(null); }} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition">
                                            <XCircleIcon className="w-5 h-5 mr-2" /> Clear
                                        </button>
                                        <button onClick={handleEnhanceAudio} disabled={isEnhancing} className="flex items-center justify-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:bg-red-700 disabled:bg-gray-800 interactive-glow-button">
                                            {isEnhancing ? <Spinner /> : <><WandSparklesIcon className="mr-2"/> Enhance Audio</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                         {enhancementError && <p className="mt-2 text-sm text-red-400 text-center">{enhancementError}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
