import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopNavbar() {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/library", icon: Music, label: "Library" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const activeClassName = "bg-white/20 text-white";
  const inactiveClassName = "text-white/60 hover:bg-white/10 hover:text-white";

  return (
    <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs sm:max-w-sm px-4">
      <div
        className="flex items-center justify-around gap-1 p-1 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center justify-center rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap',
              'w-16 h-12 sm:w-auto sm:h-auto sm:py-2 sm:px-4 sm:gap-2', // Mobile: taller, icon-only; sm+: wider with text
              isActive ? activeClassName : inactiveClassName
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
