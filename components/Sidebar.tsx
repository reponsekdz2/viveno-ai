
import React from 'react';
import type { GenerationMode, SidebarLink } from '../types';
import { FilmIcon, ImageIcon, UserCircleIcon, Cog6ToothIcon, RectangleStackIcon, SparklesIcon, MusicalNoteIcon, CrownIcon } from './Icons';

const mainLinks: SidebarLink[] = [
  { id: 'IMAGE', label: 'Image Tools', icon: <ImageIcon /> },
  { id: 'VIDEO', label: 'Video Generator', icon: <FilmIcon /> },
  { id: 'AUDIO', label: 'Audio Tools', icon: <MusicalNoteIcon /> },
];

const secondaryLinks: SidebarLink[] = [
  { id: 'LIBRARY', label: 'Library', icon: <RectangleStackIcon /> },
  { id: 'PROFILE', label: 'Profile', icon: <UserCircleIcon /> },
  { id: 'SETTINGS', label: 'Settings', icon: <Cog6ToothIcon /> },
];

interface SidebarProps {
  activeMode: GenerationMode;
  setActiveMode: (mode: GenerationMode) => void;
}

const NavLink: React.FC<{ link: SidebarLink; isActive: boolean; onClick: () => void }> = ({ link, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <span className="mr-3">{link.icon}</span>
      {link.label}
    </button>
  );

export const Sidebar: React.FC<SidebarProps> = ({ activeMode, setActiveMode }) => {
  return (
    <aside className="w-64 bg-gray-950/70 backdrop-blur-sm p-4 flex flex-col border-r border-[var(--border-color)]">
      <div className="flex items-center mb-8 px-2">
        <SparklesIcon className="w-8 h-8 text-red-500" />
        <h1 className="ml-3 text-xl font-bold text-white">Creative Suite</h1>
      </div>
      <nav className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Create</h2>
          <ul className="space-y-1">
            {mainLinks.map((link) => (
              <li key={link.id}>
                <NavLink link={link} isActive={activeMode === link.id} onClick={() => setActiveMode(link.id)} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <button 
            onClick={() => setActiveMode('PREMIUM')}
            className="w-full flex items-center justify-center bg-gradient-to-r from-red-600 to-red-800 text-white font-bold py-3 px-4 rounded-lg mb-6 transition-transform duration-200 hover:scale-105 interactive-glow-button"
          >
            <CrownIcon className="mr-2" /> Get Premium
          </button>
           <h2 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Manage</h2>
           <ul className="space-y-1">
            {secondaryLinks.map((link) => (
              <li key={link.id}>
                <NavLink link={link} isActive={activeMode === link.id} onClick={() => setActiveMode(link.id)} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};
