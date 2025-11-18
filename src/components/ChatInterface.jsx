import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { analyzePurchase } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

const ChatInterface = ({ isFloating }) => {
    const { transactions, balance, income, expense } = useFinancial();
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your financial coach. Ask me anything about your spending or if you can afford a new purchase." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Prepare context for the AI
            const financialContext = {
                balance,
                income,
                expense,
                recentTransactions: transactions.slice(0, 10), // Limit context size
                savingsGoals: [] // Placeholder for future feature
            };

            const response = await analyzePurchase(userMessage, financialContext);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my brain right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={`flex flex-col ${isFloating ? 'h-full border-0 rounded-none shadow-none' : 'h-[600px]'}`}>
            {!isFloating && (
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        Financial Coach
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                                {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                {msg.role === 'user' ? 'You' : 'Coach'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </CardContent>
            <CardFooter className="border-t p-4">
                <form onSubmit={handleSend} className="flex w-full gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Can I afford a new bike?"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
};

export default ChatInterface;
