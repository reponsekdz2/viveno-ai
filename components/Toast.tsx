
import React, { useState, useEffect } from 'react';
import type { Toast as ToastType } from '../types';
import { CheckIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from './Icons';

const icons = {
  success: <CheckIcon className="w-6 h-6 text-green-400" />,
  error: <XCircleIcon className="w-6 h-6 text-red-400" />,
  info: <InformationCircleIcon className="w-6 h-6 text-sky-400" />,
};

const borderColors = {
  success: 'border-green-500/50',
  error: 'border-red-500/50',
  info: 'border-sky-500/50',
};

interface ToastProps extends ToastType {
    onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 3500);

        const removeTimer = setTimeout(() => {
            onDismiss();
        }, 4000);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    }

    return (
        <div 
            className={`w-80 bg-gray-900/80 backdrop-blur-md border ${borderColors[type]} rounded-lg shadow-lg flex items-center p-3 ${isExiting ? 'toast-out' : 'toast-in'}`}
        >
            <div className="flex-shrink-0 mr-3">
                {icons[type]}
            </div>
            <p className="text-sm text-gray-200 flex-grow">{message}</p>
            <button onClick={handleDismiss} className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};