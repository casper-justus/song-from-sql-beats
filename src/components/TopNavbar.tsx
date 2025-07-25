import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Search, User } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';

export function TopNavbar() {
  const { dominantColors } = useMusicPlayer();

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/library", icon: Music, label: "Library" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const activeClassName = "bg-white/20 text-white";
  const inactiveClassName = "text-white/60 hover:bg-white/10 hover:text-white";

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
      {/* Mobile: Pill shape */}
      <div
        className="md:hidden flex items-center gap-2 p-2 rounded-full border border-white/10 shadow-lg transition-colors duration-500"
        style={{
          backgroundColor: `rgba(0, 0, 0, 0.25)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all",
              isActive ? activeClassName : inactiveClassName
            )}
          >
            <item.icon className="w-6 h-6" />
          </NavLink>
        ))}
      </div>

      {/* Desktop: Full bar */}
      <div
        className="hidden md:flex items-center gap-4 p-2 rounded-full border border-white/10 shadow-lg transition-colors duration-500"
        style={{
          backgroundColor: `rgba(0, 0, 0, 0.25)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "px-4 py-2 flex items-center justify-center rounded-full transition-all text-sm font-medium",
              isActive ? activeClassName : inactiveClassName
            )}
          >
            <item.icon className="w-5 h-5 mr-2" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
