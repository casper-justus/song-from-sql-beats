
import React from 'react';
import { Home, Search, Heart, User, Music } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Music, label: 'Library', path: '/library' },
    { icon: Heart, label: 'Liked', path: '/library?tab=liked' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md h-16 rounded-full shadow-2xl backdrop-blur-lg border border-white/20 bg-black/80 z-40">
      <div className="flex items-center justify-around h-full px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/library?tab=liked' && location.pathname === '/library' && location.search.includes('tab=liked'));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200",
                isActive 
                  ? "text-yellow-400 scale-110" 
                  : "text-gray-400 hover:text-white hover:scale-105"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
