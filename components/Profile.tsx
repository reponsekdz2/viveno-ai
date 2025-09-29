
import React from 'react';
import type { SubscriptionTier } from '../types';
import { UserCircleIcon, CrownIcon } from './Icons';

interface ProfileProps {
    subscriptionTier: SubscriptionTier;
}

const tierDetails: Record<SubscriptionTier, { name: string; color: string }> = {
    free: { name: 'Free', color: 'bg-gray-500' },
    silver: { name: 'Silver', color: 'bg-slate-400' },
    golden: { name: 'Golden', color: 'bg-yellow-500' },
    diamond: { name: 'Diamond', color: 'bg-sky-400' },
};

export const Profile: React.FC<ProfileProps> = ({ subscriptionTier }) => {
    const { name: tierName, color: tierColor } = tierDetails[subscriptionTier];

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-gradient-panel border border-[var(--border-color)] rounded-lg p-8 text-center shadow-2xl">
                <UserCircleIcon className="w-24 h-24 mx-auto text-gray-400" />
                <h2 className="text-3xl font-bold text-white mt-4">Guest User</h2>
                <p className="text-gray-400">welcome@creativesuite.ai</p>

                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-2">Subscription Plan</h3>
                    <div className="flex items-center justify-center space-x-2">
                        <CrownIcon className="w-6 h-6 text-yellow-400" />
                        <span className={`px-4 py-1 text-sm font-bold text-white rounded-full ${tierColor}`}>
                            {tierName}
                        </span>
                    </div>
                </div>

                <div className="mt-8 border-t border-[var(--border-color)] pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
                    <div className="flex justify-around">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-500">42</p>
                            <p className="text-sm text-gray-400">Images Generated</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-500">12</p>
                            <p className="text-sm text-gray-400">Videos Created</p>
                        </div>
                         <div className="text-center">
                            <p className="text-2xl font-bold text-red-500">18</p>
                            <p className="text-sm text-gray-400">Audio Files</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};