
import React, { useState, useRef } from 'react';
import type { LibraryItem, Toast, AppSettings, Theme, NotificationSettings } from '../types';
import { TrashIcon, ChevronDownIcon, UploadCloudIcon, ArrowDownTrayIcon } from './Icons';

interface SettingsProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    setLibraryItems: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
    setToast: (message: string, type?: Toast['type']) => void;
}

const themes: {id: Theme, name: string, colors: [string, string]}[] = [
    {id: 'studio-dark', name: 'Studio Dark', colors: ['#ef4444', '#111827']},
    {id: 'crimson', name: 'Crimson', colors: ['#dc2626', '#120000']},
    {id: 'cyberpunk', name: 'Cyberpunk', colors: ['#10b981', '#0c0a1d']},
]

const Modal: React.FC<{onClose: () => void, onConfirm: () => void, title: string, children: React.ReactNode}> = ({onClose, onConfirm, title, children}) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 modal-fade-in" onClick={onClose}>
        <div className="bg-gradient-panel border border-[rgb(var(--accent-color))]/50 rounded-lg p-6 max-w-sm text-center modal-content-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <div className="text-gray-400 mb-6">{children}</div>
            <div className="flex justify-center space-x-4">
                <button onClick={onClose} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-gray-600">Cancel</button>
                <button onClick={onConfirm} className="text-white font-bold py-2 px-6 rounded-lg transition-colors interactive-glow-button">Confirm</button>
            </div>
        </div>
    </div>
)

const ToggleSwitch: React.FC<{enabled: boolean, onChange: (enabled: boolean) => void}> = ({enabled, onChange}) => (
    <button onClick={() => onChange(!enabled)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${enabled ? 'bg-[rgb(var(--accent-color))]' : 'bg-gray-600'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-5' : ''}`}></div>
    </button>
)

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, setLibraryItems, setToast }) => {
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleClearLibrary = () => {
        setLibraryItems([]);
        setShowClearConfirm(false);
        setToast("Creative Library has been cleared.", 'success');
    };
    
    const handleThemeChange = (theme: Theme) => {
        setSettings(s => ({...s, theme}));
    }
    
    const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
        setSettings(s => ({...s, notifications: {...s.notifications, [key]: value}}));
    }
    
    const handleExportSettings = () => {
        try {
            const settingsJson = JSON.stringify(settings, null, 2);
            const blob = new Blob([settingsJson], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'olivier-studio-settings.json';
            a.click();
            URL.revokeObjectURL(url);
            setToast('Settings exported successfully!', 'success');
        } catch (error) {
            setToast('Failed to export settings.', 'error');
        }
    }
    
    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if(typeof text !== 'string') throw new Error("Invalid file content");
                const importedSettings = JSON.parse(text);
                
                // Basic validation
                if(importedSettings.theme && importedSettings.notifications) {
                     setSettings(importedSettings);
                     setToast('Settings imported successfully!', 'success');
                } else {
                    throw new Error("Invalid settings file format.");
                }
            } catch (error) {
                 setToast(error instanceof Error ? error.message : 'Failed to import settings.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">Settings</h2>

            <div className="space-y-8">
                {/* Appearance Settings */}
                <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-1">Appearance</h3>
                    <p className="text-sm text-gray-400 mb-4">Customize the look and feel of the studio.</p>
                    <div className="space-y-3">
                         <p className="font-medium text-gray-200">Theme</p>
                         <div className="flex space-x-4">
                             {themes.map(theme => (
                                 <div key={theme.id} onClick={() => handleThemeChange(theme.id)} className="cursor-pointer">
                                     <div className={`w-20 h-12 rounded-lg flex items-center justify-center border-2 transition-all ${settings.theme === theme.id ? 'border-[rgb(var(--accent-color))]' : 'border-gray-700 hover:border-gray-500'}`}>
                                         <div className="w-6 h-6 rounded-full" style={{backgroundColor: theme.colors[0]}}></div>
                                         <div className="w-6 h-6 rounded-full -ml-2" style={{backgroundColor: theme.colors[1]}}></div>
                                     </div>
                                     <p className="text-center text-xs mt-1">{theme.name}</p>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
                
                {/* Notification Settings */}
                <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-1">Notifications</h3>
                    <p className="text-sm text-gray-400 mb-4">Manage in-app toast notifications.</p>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-200">Generation Complete</p>
                                <p className="text-sm text-gray-400">Notify when an image, video, or audio is finished.</p>
                            </div>
                            <ToggleSwitch enabled={settings.notifications.generationComplete} onChange={(val) => handleNotificationChange('generationComplete', val)} />
                        </div>
                         <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-200">Promotional Updates</p>
                                <p className="text-sm text-gray-400">Receive news about new features and offers.</p>
                            </div>
                           <ToggleSwitch enabled={settings.notifications.promotions} onChange={(val) => handleNotificationChange('promotions', val)} />
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Data Management</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-200">Manage Settings</p>
                                <p className="text-sm text-gray-400">Save your current settings to a file or import them.</p>
                            </div>
                            <div className="flex space-x-2">
                                <input type="file" ref={importFileRef} onChange={handleImportSettings} accept=".json" className="hidden" />
                                <button onClick={() => importFileRef.current?.click()} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                                    <UploadCloudIcon className="w-4 h-4 mr-2" /> Import
                                </button>
                                 <button onClick={handleExportSettings} className="flex items-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Export
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-200">Clear Creative Library</p>
                                <p className="text-sm text-gray-400">This will permanently delete all your saved items.</p>
                            </div>
                            <button 
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center bg-red-800/80 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700/80 transition-colors"
                            >
                                <TrashIcon className="mr-2" /> Clear Library
                            </button>
                        </div>
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