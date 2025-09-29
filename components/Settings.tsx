
import React, { useState } from 'react';
import type { LibraryItem, Toast } from '../types';
import { TrashIcon } from './Icons';

interface SettingsProps {
    setLibraryItems: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
    setToast: (message: string, type?: Toast['type']) => void;
}

const Modal: React.FC<{onClose: () => void, onConfirm: () => void, title: string, children: React.ReactNode}> = ({onClose, onConfirm, title, children}) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 modal-fade-in" onClick={onClose}>
        <div className="bg-gradient-panel border border-red-500/50 rounded-lg p-6 max-w-sm text-center modal-content-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <div className="text-gray-400 mb-6">{children}</div>
            <div className="flex justify-center space-x-4">
                <button onClick={onClose} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-gray-600">Cancel</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-red-700 interactive-glow-button">Confirm</button>
            </div>
        </div>
    </div>
)

export const Settings: React.FC<SettingsProps> = ({ setLibraryItems, setToast }) => {
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleClearLibrary = () => {
        setLibraryItems([]);
        setShowClearConfirm(false);
        setToast("Creative Library has been cleared.", 'success');
    };

    return (
        <div className="h-full flex flex-col max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">Settings</h2>

            <div className="space-y-6">
                <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Application Data</h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-200">Clear Creative Library</p>
                            <p className="text-sm text-gray-400">This will permanently delete all your saved images and videos. This action cannot be undone.</p>
                        </div>
                        <button 
                            onClick={() => setShowClearConfirm(true)}
                            className="flex items-center bg-red-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <TrashIcon className="mr-2" /> Clear
                        </button>
                    </div>
                </div>

                 <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Theme</h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-200">Appearance</p>
                            <p className="text-sm text-gray-400">Studio Dark mode is currently active.</p>
                        </div>
                         <div className="px-3 py-1 bg-gray-700 text-sm rounded-full text-white">Active</div>
                    </div>
                </div>
            </div>

            {showClearConfirm && (
                <Modal 
                    onClose={() => setShowClearConfirm(false)}
                    onConfirm={handleClearLibrary}
                    title="Are you sure?"
                >
                    <p>You are about to delete your entire Creative Library. All saved items will be lost forever.</p>
                </Modal>
            )}
        </div>
    );
};