
import React from 'react';
import type { SubscriptionTier } from '../types';
import { CheckIcon, CrownIcon } from './Icons';

interface PremiumProps {
    currentTier: SubscriptionTier;
    onSubscribe: (tier: SubscriptionTier) => void;
}

const tiers = [
    {
        name: 'Silver',
        id: 'silver' as SubscriptionTier,
        price: '$10',
        description: 'Unlock core creative features.',
        features: [
            'Standard Quality Generation',
            'All Standard AI Personas',
            'Medium Length Videos (~15s)',
            'Prompt History',
            'AI Audio Enhancement',
        ],
        color: 'border-slate-400',
        textColor: 'text-slate-400',
        buttonColor: 'bg-slate-500 hover:bg-slate-400',
    },
    {
        name: 'Golden',
        id: 'golden' as SubscriptionTier,
        price: '$20',
        description: 'For creators who need more power.',
        features: [
            'All Silver Features',
            'High Quality Generation',
            'Long Videos (up to 30s)',
            'Cinematic Video Ratios (16:9, 9:16)',
            'High FPS Video (30/60fps)',
            'AI Sound FX Generator',
            'Style & Motion Intensity Controls',
            'AI Image Variations'
        ],
        color: 'border-yellow-500',
        textColor: 'text-yellow-500',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-500',
    },
    {
        name: 'Diamond',
        id: 'diamond' as SubscriptionTier,
        price: '$40',
        description: 'The ultimate creative powerhouse.',
        features: [
            'All Golden Features',
            'Epic Videos (up to 60s+)',
            'Exclusive Diamond AI Personas',
            'Image Generation Seed',
            'Seamless Video Looping',
            'AI Image & Video Enhancement',
            'Multi-Prompt Blending',
        ],
        color: 'border-sky-400',
        textColor: 'text-sky-400',
        buttonColor: 'bg-sky-500 hover:bg-sky-400',
    },
];

export const Premium: React.FC<PremiumProps> = ({ currentTier, onSubscribe }) => {
    return (
        <div className="h-full flex flex-col items-center">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-2">Unlock Your Full Creative Potential</h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">Choose a plan that fits your creative needs and gain access to powerful, exclusive features to take your creations to the next level.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {tiers.map((tier) => (
                    <div key={tier.id} className={`bg-gradient-panel rounded-xl border-2 ${currentTier === tier.id ? tier.color : 'border-[var(--border-color)]'} p-6 flex flex-col transition-all duration-300 premium-card-glow ${currentTier === tier.id ? 'transform scale-105 shadow-2xl' : 'hover:scale-102'}`}>
                        <h3 className={`text-2xl font-bold ${tier.textColor}`}>{tier.name}</h3>
                        <p className="text-4xl font-bold text-white my-4">{tier.price}<span className="text-lg font-medium text-gray-400">/mo</span></p>
                        <p className="text-gray-400 flex-grow mb-6">{tier.description}</p>
                        
                        <ul className="space-y-3 mb-6">
                            {tier.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button 
                            onClick={() => onSubscribe(tier.id)}
                            disabled={currentTier === tier.id}
                            className={`w-full mt-auto font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out disabled:cursor-not-allowed ${
                                currentTier === tier.id
                                ? 'bg-gray-700 text-white'
                                : `${tier.buttonColor} text-white interactive-glow-button`
                            }`}
                        >
                            {currentTier === tier.id ? 'Current Plan' : 'Subscribe'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};