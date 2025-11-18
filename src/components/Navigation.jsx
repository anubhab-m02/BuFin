import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, LineChart } from 'lucide-react';
import { cn } from '../lib/utils';

const Navigation = () => {
    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Ledger', path: '/ledger', icon: BookOpen },
        { name: 'Planner', path: '/planner', icon: Calendar },
        { name: 'Insights', path: '/insights', icon: LineChart },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 md:relative md:border-t-0 md:border-r md:w-64 md:h-screen md:p-4 flex md:flex-col justify-around md:justify-start gap-2 z-30">
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
        </nav>
    );
};

export default Navigation;
