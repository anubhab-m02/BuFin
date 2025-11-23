import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, PieChart, User, Sparkles, Settings, LogOut, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Navigation = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Transactions', path: '/ledger', icon: BookOpen }, // Renamed from Ledger for reference match
        { name: 'Planner', path: '/planner', icon: Calendar },
        { name: 'Insights', path: '/insights', icon: PieChart },
        { name: 'AI Coach', path: '/coach', icon: Sparkles },
    ];

    const bottomItems = [
        { name: 'Profile', path: '/profile', icon: User },
        // Settings could be a separate page or just point to Profile for now
        // { name: 'Settings', path: '/settings', icon: Settings }, 
    ];

    const getInitials = (name) => {
        return name
            ? name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
            : 'U';
    };

    return (
        <nav className="h-full bg-background border-t md:border-none md:shadow-lg md:rounded-2xl p-2 md:p-6 flex md:flex-col justify-between">

            {/* Top Section: Brand & Main Nav */}
            <div className="flex md:flex-col justify-around md:justify-start gap-1 w-full">
                {/* Brand - Hidden on Mobile, Visible on Desktop */}
                <div className="hidden md:flex items-center gap-2 mb-8 px-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">BuFin</span>
                </div>

                {/* Main Navigation */}
                <div className="flex md:flex-col gap-1 w-full">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col md:flex-row items-center md:gap-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all text-[10px] md:text-sm font-medium",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Bottom Section: Profile & Footer - Hidden on Mobile (simplified) */}
            <div className="hidden md:flex flex-col gap-2 mt-auto pt-4 border-t border-border/40">
                {/* Secondary Nav (Settings/Profile) */}
                {bottomItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}

                {/* User Profile Card */}
                <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl hover:bg-secondary/50 transition-colors group">
                    <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name}`} />
                        <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-foreground">{user?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                        onClick={logout}
                        title="Sign Out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
