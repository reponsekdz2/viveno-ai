
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageTools } from './components/ImageTools';
import { AudioTools } from './components/AudioTools';
import { Library } from './components/Library';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Premium } from './components/Premium';
import { Toast } from './components/Toast';
import type { GenerationMode, LibraryItem, SubscriptionTier, Toast as ToastType, GenerationSettings } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<GenerationMode>('IMAGE');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem('creative-suite-library');
      if (storedLibrary) setLibraryItems(JSON.parse(storedLibrary));

      const storedTier = localStorage.getItem('creative-suite-tier');
      if (storedTier && ['free', 'silver', 'golden', 'diamond'].includes(JSON.parse(storedTier))) {
         setSubscriptionTier(JSON.parse(storedTier));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('creative-suite-library', JSON.stringify(libraryItems));
    } catch (error) {
      console.error("Failed to save library to localStorage", error);
    }
  }, [libraryItems]);

  useEffect(() => {
    try {
      localStorage.setItem('creative-suite-tier', JSON.stringify(subscriptionTier));
    } catch (error) {
      console.error("Failed to save subscription tier to localStorage", error);
    }
  }, [subscriptionTier]);

  const addToast = useCallback((message: string, type: ToastType['type'] = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const handleSaveToLibrary = useCallback((item: { type: 'IMAGE' | 'VIDEO'; src: string; settings: GenerationSettings, audioSrc?: string, variations?: string[] }) => {
    const newItem: LibraryItem = {
      ...item,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setLibraryItems(prev => [newItem, ...prev]);
    addToast('Saved to Library!', 'success');
  }, [addToast]);
  
  const handleSetSubscriptionTier = (tier: SubscriptionTier) => {
    setSubscriptionTier(tier);
    addToast(`Successfully subscribed to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan!`, 'success');
    setActiveMode('PROFILE');
  };

  const commonProps = {
    setToast: addToast,
    onSaveToLibrary: handleSaveToLibrary,
    subscriptionTier: subscriptionTier,
    promptUpgrade: () => setShowUpgradeModal(true),
  };
  
  const renderContent = () => {
    switch (activeMode) {
      case 'IMAGE':
        return <ImageTools {...commonProps} />;
      case 'VIDEO':
        return <VideoGenerator {...commonProps} />;
      case 'AUDIO':
        return <AudioTools setToast={addToast} subscriptionTier={subscriptionTier} promptUpgrade={commonProps.promptUpgrade} />;
      case 'LIBRARY':
        return <Library items={libraryItems} setItems={setLibraryItems} setToast={addToast} />;
      case 'PROFILE':
        return <Profile subscriptionTier={subscriptionTier} />;
      case 'SETTINGS':
        return <Settings setLibraryItems={setLibraryItems} setToast={addToast} />;
      case 'PREMIUM':
        return <Premium currentTier={subscriptionTier} onSubscribe={handleSetSubscriptionTier} />;
      default:
        return <ImageTools {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-300">
      <Sidebar activeMode={activeMode} setActiveMode={setActiveMode} />
      <main key={activeMode} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative bg-gray-950/40 animate-fade-in">
        {renderContent()}
      </main>
      
      <div className="fixed bottom-5 right-5 z-[100] space-y-3">
        {toasts.map(toast => <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />)}
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99] modal-fade-in" onClick={() => setShowUpgradeModal(false)}>
            <div className="bg-gradient-panel border border-red-500/50 rounded-lg p-8 max-w-sm text-center modal-content-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-white mb-2">Upgrade Required</h3>
                <p className="text-gray-400 mb-6">This is a premium feature. Please upgrade your plan to unlock this and more powerful capabilities.</p>
                <button 
                    onClick={() => { setShowUpgradeModal(false); setActiveMode('PREMIUM'); }}
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out hover:bg-red-700 interactive-glow-button"
                >
                    View Premium Plans
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
