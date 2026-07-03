import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Send, TrendingUp, GraduationCap, ShoppingBag, User, Bot, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageHeader from '../components/PageHeader';

const MODES = [
    {
        id: 'analyst',
        title: 'Purchase Analyst',
        description: 'Decide on big purchases with trade-offs & alternatives.',
        icon: ShoppingBag,
        color: 'var(--chart-1)',
        placeholder: 'e.g., "Should I buy the iPhone 16 or wait?"',
        starters: ['Can I afford a ₹40,000 laptop right now?', 'iPhone 16 vs waiting for next year?', 'Should I lease or buy a car?']
    },
    {
        id: 'strategist',
        title: 'Savings Strategist',
        description: 'Plan targets & investments based on your profile.',
        icon: TrendingUp,
        color: 'var(--chart-2)',
        placeholder: 'e.g., "How do I save for a house in 5 years?"',
        starters: ['How do I save for a house in 5 years?', 'What should my emergency fund be?', 'Where should I put my next bonus?']
    },
    {
        id: 'educator',
        title: 'Financial Educator',
        description: 'Learn concepts simply with clear analogies.',
        icon: GraduationCap,
        color: 'var(--chart-4)',
        placeholder: 'e.g., "What is an SIP and how does it work?"',
        starters: ['What is an SIP and how does it work?', 'Explain the 50/30/20 rule simply', 'What\'s the difference between a stock and a mutual fund?']
    }
];

const CoachPage = () => {
    const { balance, transactions, recurringPlans } = useFinancial();
    const [selectedMode, setSelectedMode] = useState(MODES[0]);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! I'm your ${MODES[0].title}. ${MODES[0].description} How can I help?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const scrollRef = useRef(null);
    const modeMenuRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!isModeMenuOpen) return;
        const handleClickOutside = (e) => {
            if (modeMenuRef.current && !modeMenuRef.current.contains(e.target)) {
                setIsModeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModeMenuOpen]);

    const handleModeSelect = (mode) => {
        setSelectedMode(mode);
        setIsModeMenuOpen(false);
        setMessages([
            { role: 'assistant', content: `Hello! I'm your ${mode.title}. ${mode.description} How can I help?` }
        ]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = e.starterText || input;
        if (!text.trim() || isLoading) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const context = {
                balance,
                recentTransactions: transactions.slice(0, 5),
                recurringPlans: recurringPlans.map(p => ({ name: p.name, amount: p.amount }))
            };

            const response = await api.coachChat(userMsg.content, selectedMode.id, context);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <PageHeader title="Financial Coach" subtitle="Your personal AI expert for every financial decision." />

            <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-sm">
                <div className="flex items-center justify-between gap-3 p-3 border-b border-border relative" ref={modeMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsModeMenuOpen((prev) => !prev)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors duration-fast"
                        aria-haspopup="listbox"
                        aria-expanded={isModeMenuOpen}
                    >
                        <div
                            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `color-mix(in srgb, ${selectedMode.color} 15%, transparent)`, color: selectedMode.color }}
                        >
                            <selectedMode.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{selectedMode.title}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-fast", isModeMenuOpen && "rotate-180")} />
                    </button>
                    <p className="hidden sm:block text-xs text-muted-foreground text-right">{selectedMode.description}</p>

                    {isModeMenuOpen && (
                        <div
                            role="listbox"
                            className="absolute left-3 top-full mt-1 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-lg p-1.5 animate-in fade-in slide-in-from-top-1 duration-fast"
                        >
                            {MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    role="option"
                                    aria-selected={mode.id === selectedMode.id}
                                    onClick={() => handleModeSelect(mode)}
                                    className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left hover:bg-secondary transition-colors duration-fast"
                                >
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `color-mix(in srgb, ${mode.color} 15%, transparent)`, color: mode.color }}
                                    >
                                        <mode.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{mode.title}</p>
                                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                                    </div>
                                    {mode.id === selectedMode.id && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <CardContent className="flex-1 flex flex-col p-0 h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                {msg.role === 'assistant' && (
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `color-mix(in srgb, ${selectedMode.color} 15%, transparent)`, color: selectedMode.color }}
                                    >
                                        <Bot className="h-5 w-5" />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-secondary text-secondary-foreground rounded-tl-none"
                                )}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />,
                                            strong: ({ node, ...props }) => <span className="font-bold text-foreground" {...props} />,
                                            table: ({ node, ...props }) => (
                                                <div className="my-4 w-full overflow-hidden rounded-lg border border-border">
                                                    <table className="w-full text-sm text-left" {...props} />
                                                </div>
                                            ),
                                            thead: ({ node, ...props }) => <thead className="bg-muted/50 text-muted-foreground font-medium" {...props} />,
                                            tbody: ({ node, ...props }) => <tbody className="divide-y divide-border bg-card" {...props} />,
                                            tr: ({ node, ...props }) => <tr className="transition-colors hover:bg-muted/20" {...props} />,
                                            th: ({ node, ...props }) => <th className="px-4 py-3 font-medium" {...props} />,
                                            td: ({ node, ...props }) => <td className="px-4 py-3" {...props} />,
                                            a: ({ node, href, children, ...props }) => {
                                                const isCitation = href && href.startsWith('http');
                                                return (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center min-w-[1.2rem] h-[1.2rem] px-1 ml-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors no-underline align-top"
                                                        title={href}
                                                        {...props}
                                                    >
                                                        {children}
                                                    </a>
                                                );
                                            },
                                            ul: ({ node, ...props }) => <ul className="my-2 pl-4 list-disc space-y-1 marker:text-muted-foreground" {...props} />,
                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {messages.length === 1 && !isLoading && (
                            <div className="flex flex-wrap gap-2 pl-11">
                                {selectedMode.starters.map((starter) => (
                                    <button
                                        key={starter}
                                        onClick={() => handleSend({ preventDefault: () => { }, starterText: starter })}
                                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fast text-left"
                                    >
                                        {starter}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div
                                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `color-mix(in srgb, ${selectedMode.color} 15%, transparent)`, color: selectedMode.color }}
                                >
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-none px-4 py-2 text-sm shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-border bg-card">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={selectedMode.placeholder}
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CoachPage;
