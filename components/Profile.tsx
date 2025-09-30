
import React from 'react';
import type { SubscriptionTier, LibraryItem } from '../types';
import { UserCircleIcon, CrownIcon, FilmIcon, ImageIcon, MusicalNoteIcon, SparklesIcon, TrophyIcon } from './Icons';

interface ProfileProps {
    subscriptionTier: SubscriptionTier;
    libraryItems: LibraryItem[];
}

const tierDetails: Record<SubscriptionTier, { name: string; color: string; imageLimit: number; videoLimit: number; audioLimit: number; }> = {
    free: { name: 'Free', color: 'text-gray-400', imageLimit: 50, videoLimit: 5, audioLimit: 10 },
    silver: { name: 'Silver', color: 'text-slate-400', imageLimit: 200, videoLimit: 20, audioLimit: 50 },
    golden: { name: 'Golden', color: 'text-yellow-500', imageLimit: 1000, videoLimit: 100, audioLimit: 250 },
    diamond: { name: 'Diamond', color: 'text-sky-400', imageLimit: 5000, videoLimit: 500, audioLimit: 1000 },
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; limit: number; color: string }> = ({ icon, label, value, limit, color }) => (
    <div className="bg-gray-950/50 p-4 rounded-lg">
        <div className="flex items-center text-gray-400 mb-2">
            {icon}
            <span className="ml-2 text-sm font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value} / <span className="text-lg">{limit}</span></p>
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
            <div className={`${color}`} style={{ width: `${Math.min(100, (value / limit) * 100)}%`, height: '100%', borderRadius: '9999px' }}></div>
        </div>
    </div>
);

const Achievement: React.FC<{ icon: React.ReactNode; label: string; achieved: boolean; description: string }> = ({ icon, label, achieved, description }) => (
    <div className="text-center group relative">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${achieved ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-gray-800 border-2 border-gray-700'}`}>
            <span className={`transition-colors duration-300 ${achieved ? 'text-yellow-400' : 'text-gray-500'}`}>{icon}</span>
        </div>
        <p className={`mt-2 font-semibold text-sm ${achieved ? 'text-white' : 'text-gray-500'}`}>{label}</p>
        <div className="absolute bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none shadow-lg border border-[var(--border-color)]">
            {description}
        </div>
    </div>
);

export const Profile: React.FC<ProfileProps> = ({ subscriptionTier, libraryItems }) => {
    const details = tierDetails[subscriptionTier];
    const imageCount = libraryItems.filter(item => item.type === 'IMAGE').length;
    // Note: Audio tool doesn't save to library, so this is a placeholder.
    const audioCount = 18;
    const videoCount = libraryItems.filter(item => item.type === 'VIDEO').length;

    const achievements = [
        { id: 'first_creation', label: 'First Masterpiece', icon: <SparklesIcon className="w-10 h-10"/>, achieved: libraryItems.length > 0, description: 'Create your first image or video.' },
        { id: 'video_virtuoso', label: 'Video Virtuoso', icon: <FilmIcon className="w-10 h-10"/>, achieved: videoCount >= 10, description: 'Generate 10 videos.' },
        { id: 'image_imitator', label: 'Pixel Pioneer', icon: <ImageIcon className="w-10 h-10"/>, achieved: imageCount >= 25, description: 'Generate 25 images.' },
        { id: 'diamond_club', label: 'Diamond Club', icon: <CrownIcon className="w-10 h-10"/>, achieved: subscriptionTier === 'diamond', description: 'Subscribe to the Diamond plan.' },
        { id: 'power_user', label: 'Power User', icon: <TrophyIcon className="w-10 h-10"/>, achieved: libraryItems.length >= 50, description: 'Create 50+ items in the library.' },
    ];

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">User Profile</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6 text-center">
                        <UserCircleIcon className="w-24 h-24 mx-auto text-gray-400" />
                        <h3 className="text-2xl font-bold text-white mt-4">Guest User</h3>
                        <p className="text-gray-400">welcome@olivierstudio.ai</p>
                        <p className="text-xs text-gray-500 mt-4">User since: {new Date().toLocaleDateString()}</p>
                    </div>
                     <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                        <h4 className="font-semibold text-white mb-3 text-center">Current Plan</h4>
                        <div className="flex items-center justify-center space-x-3 p-4 rounded-lg bg-gray-950/50">
                            <CrownIcon className={`w-8 h-8 ${details.color}`} />
                            <span className={`text-2xl font-bold ${details.color}`}>
                                {details.name}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                        <h4 className="text-xl font-semibold text-white mb-4">Monthly Usage</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard icon={<ImageIcon />} label="Images" value={imageCount} limit={details.imageLimit} color="bg-sky-500"/>
                            <StatCard icon={<FilmIcon />} label="Videos" value={videoCount} limit={details.videoLimit} color="bg-red-500"/>
                            <StatCard icon={<MusicalNoteIcon />} label="Audio" value={audioCount} limit={details.audioLimit} color="bg-green-500"/>
                        </div>
                    </div>
                     <div className="bg-gradient-panel border border-[var(--border-color)] rounded-lg p-6">
                        <h4 className="text-xl font-semibold text-white mb-6">Achievements</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                            {achievements.map(ach => (
                                <Achievement key={ach.id} {...ach} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
