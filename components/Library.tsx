
import React, { useState } from 'react';
import type { LibraryItem, Toast } from '../types';
import { ImageIcon, FilmIcon, XMarkIcon, ArrowDownTrayIcon, TrashIcon, RectangleStackIcon } from './Icons';

interface LibraryProps {
  items: LibraryItem[];
  setItems: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
  setToast: (message: string, type?: Toast['type']) => void;
}

const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const LibraryItemCard: React.FC<{ item: LibraryItem, onClick: () => void }> = ({ item, onClick }) => (
    <div className="relative group aspect-square bg-gray-900 rounded-lg overflow-hidden cursor-pointer" onClick={onClick}>
        {item.type === 'IMAGE' ? (
            <img src={item.src} alt="Library item" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
            <video src={item.src} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loop muted onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()}/>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            {item.type === 'IMAGE' ? <ImageIcon className="w-10 h-10 text-white" /> : <FilmIcon className="w-10 h-10 text-white" />}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-white text-xs truncate">{item.settings.prompts.join('; ')}</p>
        </div>
    </div>
);

const DetailItem: React.FC<{label: string, value: any}> = ({label, value}) => {
    if (!value || value === 'none' || value === false) return null;
    return (
        <div className="flex justify-between text-xs capitalize">
            <span className="text-gray-400">{label}:</span>
            <span className="font-semibold text-gray-200">{String(value).replace('-', ' ')}</span>
        </div>
    )
}

const LibraryDetailModal: React.FC<{ item: LibraryItem, onClose: () => void, onDelete: () => void }> = ({ item, onClose, onDelete }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal-fade-in" onClick={onClose}>
        <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg w-full max-w-4xl h-[90vh] flex flex-col modal-content-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-white">Library Item</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"><XMarkIcon /></button>
            </div>
            <div className="flex-grow p-4 flex flex-col md:flex-row gap-4 overflow-y-auto">
                <div className="flex-1 flex items-center justify-center bg-black/30 rounded-lg">
                     {item.type === 'IMAGE' ? (
                        <img src={item.src} alt="Library item detail" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <video src={item.src} className="max-w-full max-h-full object-contain" controls autoPlay loop />
                    )}
                </div>
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col space-y-4">
                    <div className="bg-gray-950/50 p-3 rounded-lg text-sm">
                        <p className="font-semibold text-gray-400">Created:</p>
                        <p>{formatTimestamp(item.createdAt)}</p>
                    </div>
                    <div className="bg-gray-950/50 p-3 rounded-lg text-sm">
                        <p className="font-semibold text-gray-400 mb-2">Prompt:</p>
                        <p className="whitespace-pre-wrap break-words text-gray-200">{item.settings.prompts.join('; ')}</p>
                    </div>
                    <div className="bg-gray-950/50 p-3 rounded-lg text-sm flex-grow space-y-2 overflow-y-auto">
                         <p className="font-semibold text-gray-400 mb-2">Settings:</p>
                         <DetailItem label="Persona" value={item.settings.persona} />
                         <DetailItem label="Style" value={item.settings.style} />
                         <DetailItem label="Style Intensity" value={item.settings.styleIntensity} />
                         <DetailItem label="Aspect Ratio" value={item.settings.aspectRatio} />
                         <DetailItem label="Quality" value={item.settings.quality} />
                         <DetailItem label="Duration" value={item.settings.duration} />
                         <DetailItem label="Camera" value={item.settings.cameraMovement} />
                         <DetailItem label="Motion Intensity" value={item.settings.motionIntensity} />
                         <DetailItem label="Framing" value={item.settings.framing} />
                         <DetailItem label="Audio Mood" value={item.settings.audioMood} />
                         <DetailItem label="FPS" value={item.settings.fps} />
                         <DetailItem label="Seed" value={item.settings.seed} />
                         <DetailItem label="Loop" value={item.settings.loop} />
                         {item.settings.negativePrompt && (
                            <div>
                                <p className="text-xs text-gray-400">Negative Prompt:</p>
                                <p className="text-xs font-semibold text-gray-200">{item.settings.negativePrompt}</p>
                            </div>
                         )}
                    </div>
                    <div className="flex space-x-2">
                        <a href={item.src} download={`creative-suite-${item.id}.${item.type === 'IMAGE' ? 'png' : 'mp4'}`} className="flex-1 flex items-center justify-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition interactive-glow-button">
                            <ArrowDownTrayIcon className="mr-2" /> Download
                        </a>
                         <button onClick={onDelete} className="flex items-center justify-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition">
                            <TrashIcon className="mr-2" /> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


export const Library: React.FC<LibraryProps> = ({ items, setItems, setToast }) => {
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
    
    const handleDelete = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
        setSelectedItem(null);
        setToast("Item deleted from library.", 'success');
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-3xl font-bold text-white mb-6">Creative Library</h2>
            {items.length === 0 ? (
                 <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                    <div>
                        <RectangleStackIcon className="mx-auto h-16 w-16" />
                        <p className="mt-4 text-lg">Your library is empty.</p>
                        <p>Creations from Image and Video tools will appear here automatically.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-y-auto pr-2">
                    {items.map(item => (
                        <LibraryItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                    ))}
                </div>
            )}

            {selectedItem && (
                <LibraryDetailModal 
                    item={selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    onDelete={() => handleDelete(selectedItem.id)}
                />
            )}
        </div>
    );
};