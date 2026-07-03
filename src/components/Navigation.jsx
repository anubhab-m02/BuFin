import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Calendar, PieChart, MessageSquareText, LogOut, User, Target, Wallet, Wallet2, Plus, MoreHorizontal, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const ALL_ITEMS = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Ledger', path: '/ledger', icon: FileText },
    { name: 'Planner', path: '/planner', icon: Calendar },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Budgets', path: '/budgets', icon: Wallet2 },
    { name: 'Insights', path: '/insights', icon: PieChart },
    { name: 'Coach', path: '/coach', icon: MessageSquareText },
];

// Mobile bottom bar caps at 5 slots (4 nav + center Add) so nothing overflows at 375px.
// The rest live behind "More". Desktop keeps the full sidebar list untouched.
const MOBILE_PRIMARY = ['/', '/ledger', '/planner'];
const MOBILE_MORE = ALL_ITEMS.filter((item) => !MOBILE_PRIMARY.includes(item.path));

const Navigation = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const bottomItems = [{ name: 'Profile', path: '/profile', icon: User }];

    const getInitials = (name) => {
        return name
            ? name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
            : 'U';
    };

    const mobilePrimaryItems = ALL_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.path));

    return (
        <>
            {/* Desktop Sidebar - unchanged */}
            <nav className="hidden md:flex md:w-64 md:shrink-0 md:sticky md:top-4 md:h-[calc(100vh-2rem)] bg-background shadow-lg rounded-2xl p-6 flex-col justify-between">
                <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 mb-8 px-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">BuFin</span>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        {ALL_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-fast text-sm font-medium",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border/40">
                    {bottomItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-fast text-sm font-medium",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}

                    {/* Sign Out lives only on the Profile page (deliberate visit) and the mobile
                        More sheet (explicit tap) - this card just links to Profile now, instead
                        of doubling as a second, hover-only, easier-to-fat-finger sign-out. */}
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl hover:bg-secondary/50 transition-colors duration-fast"
                    >
                        <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name}`} />
                            <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-foreground">{user?.full_name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                        </div>
                    </NavLink>
                </div>
            </nav>

            {/* Mobile Bottom Bar - 5 slots max: 4 nav items + a raised center Add FAB */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="grid grid-cols-5 items-end h-16">
                    {mobilePrimaryItems.slice(0, 2).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center justify-center gap-0.5 h-full min-w-[44px] text-[10px] font-medium",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}

                    {/* Center Add FAB - the core "log an expense" action, always one tap away */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="h-14 w-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform duration-fast active:scale-95"
                            aria-label="Add transaction"
                        >
                            <Plus className="h-6 w-6" />
                        </button>
                    </div>

                    {mobilePrimaryItems.slice(2).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center justify-center gap-0.5 h-full min-w-[44px] text-[10px] font-medium",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}

                    <button
                        onClick={() => setIsMoreOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 h-full min-w-[44px] text-[10px] font-medium text-muted-foreground"
                        aria-label="More"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            {/* "More" sheet - remaining nav items + profile, off the primary 5 mobile slots */}
            {isMoreOpen && (
                <div
                    className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-fast"
                    onClick={() => setIsMoreOpen(false)}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-in slide-in-from-bottom duration-normal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold">More</h2>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMoreOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {[...MOBILE_MORE, { name: 'Profile', path: '/profile', icon: User }].map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMoreOpen(false)}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary text-muted-foreground text-xs font-medium"
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                </NavLink>
                            ))}
                            <button
                                onClick={() => { setIsMoreOpen(false); logout(); }}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-destructive/10 text-destructive text-xs font-medium"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navigation;
