import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { MessageSquare, Send, Sparkles, TrendingUp, GraduationCap, ShoppingBag, User, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MODES = [
    {
        id: 'analyst',
        title: 'Purchase Analyst',
        description: 'Decide on big purchases with trade-offs & alternatives.',
        icon: ShoppingBag,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        placeholder: 'e.g., "Should I buy the iPhone 16 or wait?"'
    },
    {
        id: 'strategist',
        title: 'Savings Strategist',
        description: 'Plan targets & investments based on your profile.',
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        placeholder: 'e.g., "How do I save for a house in 5 years?"'
    },
    {
        id: 'educator',
        title: 'Financial Educator',
        description: 'Learn concepts simply with clear analogies.',
        icon: GraduationCap,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        placeholder: 'e.g., "What is an SIP and how does it work?"'
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
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleModeSelect = (mode) => {
        setSelectedMode(mode);
        setMessages([
            { role: 'assistant', content: `Hello! I'm your ${mode.title}. ${mode.description} How can I help?` }
        ]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
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
            <div className="pb-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">
                    Financial Coach
                </h1>
                <p className="text-muted-foreground mt-1">
                    Your personal AI expert for every financial decision.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MODES.map(mode => (
                    <Card
                        key={mode.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-2",
                            selectedMode.id === mode.id ? `${mode.borderColor} ${mode.bgColor}` : "border-transparent hover:border-border"
                        )}
                        onClick={() => handleModeSelect(mode)}
                    >
                        <CardHeader className="p-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <mode.icon className={cn("h-5 w-5", mode.color)} />
                                {mode.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {mode.description}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-sm">
                <CardContent className="flex-1 flex flex-col p-0 h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                {msg.role === 'assistant' && (
                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", selectedMode.bgColor)}>
                                        <Bot className={cn("h-5 w-5", selectedMode.color)} />
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
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", selectedMode.bgColor)}>
                                    <Bot className={cn("h-5 w-5", selectedMode.color)} />
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
