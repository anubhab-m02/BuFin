import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, LineChart, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';

const Navigation = () => {
    const { isPrivacyMode, togglePrivacyMode } = useFinancial();
    const { theme, setTheme } = useTheme();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Ledger', path: '/ledger', icon: BookOpen },
        { name: 'Planner', path: '/planner', icon: Calendar },
        { name: 'Insights', path: '/insights', icon: LineChart },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 md:relative md:border-t-0 md:border-r md:w-64 md:h-screen md:p-4 flex md:flex-col justify-between z-30">
            <div className="flex md:flex-col justify-around md:justify-start gap-2 w-full">
                <div className="hidden md:block mb-8 px-4">
                    <h1 className="text-2xl font-bold text-primary">BuFin</h1>
                    <p className="text-xs text-muted-foreground">AI Financial System</p>
                </div>

                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex flex-col md:flex-row items-center md:gap-3 p-2 rounded-lg transition-colors text-xs md:text-sm font-medium",
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

            <div className="hidden md:block px-2 pb-4 space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    onClick={togglePrivacyMode}
                >
                    {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>Privacy Mode</span>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </Button>
            </div>
        </nav>
    );
};

export default Navigation;
