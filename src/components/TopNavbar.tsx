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
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div
        className="flex items-center justify-center gap-2 p-3 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: `rgba(0, 0, 0, 0.3)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "px-4 py-2 flex items-center gap-2 rounded-full transition-all duration-300 text-sm font-medium",
              isActive ? activeClassName : inactiveClassName
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
