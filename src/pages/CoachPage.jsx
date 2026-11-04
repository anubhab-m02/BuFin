import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Send, TrendingUp, GraduationCap, ShoppingBag, User, Bot, ChevronDown, Check, PanelLeft, Plus, Trash2 } from 'lucide-react';
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
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

    // Populate the sidebar on mount, but never auto-load or auto-create a session - the
    // page always opens on a fresh draft, same as the pre-history default welcome message.
    useEffect(() => {
        refreshSessions();
    }, []);

    const refreshSessions = async () => {
        try {
            const list = await api.getChatSessions();
            setSessions(list);
        } catch (error) {
            console.error('Failed to load chat sessions', error);
        }
    };

    const resetToFreshDraft = (mode) => {
        setCurrentSessionId(null);
        setMessages([
            { role: 'assistant', content: `Hello! I'm your ${mode.title}. ${mode.description} How can I help?` }
        ]);
    };

    const handleModeSelect = (mode) => {
        setSelectedMode(mode);
        setIsModeMenuOpen(false);
        // Switching modes already wipes the transcript today - that's now literally the
        // start of a new session under the new mode, rather than mutating the old one.
        resetToFreshDraft(mode);
    };

    const handleNewConversation = () => {
        resetToFreshDraft(selectedMode);
    };

    const handleLoadSession = async (sessionId) => {
        if (sessionId === currentSessionId) return;
        try {
            const session = await api.getChatSession(sessionId);
            const mode = MODES.find(m => m.id === session.mode) || MODES[0];
            setSelectedMode(mode);
            setMessages(session.messages.map(m => ({ role: m.role, content: m.content })));
            setCurrentSessionId(session.id);
        } catch (error) {
            console.error('Failed to load chat session', error);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            await api.deleteChatSession(sessionId);
            if (sessionId === currentSessionId) {
                resetToFreshDraft(selectedMode);
            }
            refreshSessions();
        } catch (error) {
            console.error('Failed to delete chat session', error);
        }
    };

    const formatSessionDate = (isoString) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
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
            // Sessions are created lazily, on the first message of a conversation - not
            // just from opening the page or switching modes.
            let sessionId = currentSessionId;
            if (!sessionId) {
                const session = await api.createChatSession(selectedMode.id);
                sessionId = session.id;
                setCurrentSessionId(sessionId);
            }
            await api.postChatMessage(sessionId, 'user', userMsg.content);

            const context = {
                balance,
                recentTransactions: transactions.slice(0, 5),
                recurringPlans: recurringPlans.map(p => ({ name: p.name, amount: p.amount }))
            };

            const response = await api.coachChat(userMsg.content, selectedMode.id, context);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            await api.postChatMessage(sessionId, 'assistant', response);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
            // Refresh regardless of outcome - even a failed AI reply may have already
            // created the session and persisted the user's message above.
            refreshSessions();
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <PageHeader title="Financial Coach" subtitle="Your personal AI expert for every financial decision." />

            {/* Mode switcher sits outside the chat Card - the Card needs overflow-hidden for
                its own scroll containment, which would otherwise clip this dropdown. */}
            <div className="flex items-center justify-between gap-3 relative" ref={modeMenuRef}>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors duration-fast"
                        title={isSidebarOpen ? "Hide history" : "Show history"}
                        aria-label={isSidebarOpen ? "Hide chat history" : "Show chat history"}
                        aria-pressed={isSidebarOpen}
                    >
                        <PanelLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
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
                </div>
                <p className="hidden sm:block text-xs text-muted-foreground text-right">{selectedMode.description}</p>

                {isModeMenuOpen && (
                    <div
                        role="listbox"
                        className="absolute left-0 top-full mt-1 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-lg p-1.5 animate-in fade-in slide-in-from-top-1 duration-fast"
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

            <Card className="flex-1 flex overflow-hidden border-border shadow-sm">
                {isSidebarOpen && (
                    <div className="w-64 shrink-0 border-r border-border flex flex-col bg-secondary/20">
                        <div className="p-3 border-b border-border flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">History</span>
                            <button
                                type="button"
                                onClick={handleNewConversation}
                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors duration-fast"
                                title="New conversation"
                                aria-label="New conversation"
                            >
                                <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sessions.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6 px-2">No conversations yet. Start chatting to save your history.</p>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group relative flex items-center rounded-lg",
                                            session.id === currentSessionId ? "bg-secondary" : "hover:bg-secondary/60"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleLoadSession(session.id)}
                                            className="flex-1 min-w-0 text-left px-2.5 py-2"
                                        >
                                            <p className="text-xs font-medium text-foreground truncate pr-6">{session.title || 'New Conversation'}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatSessionDate(session.updated_at)}</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                                            className="absolute right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity duration-fast shrink-0"
                                            title="Delete conversation"
                                            aria-label="Delete conversation"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                <CardContent className="flex-1 flex flex-col p-0 h-full min-w-0">
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
