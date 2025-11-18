import React, { useState } from 'react';
import ChatInterface from './ChatInterface';
import { Button } from './ui/button';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '../lib/utils';

const FloatingChat = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Chat Drawer/Popover */}
            <div
                className={cn(
                    "fixed bottom-24 right-6 w-[350px] md:w-[400px] z-40 transition-all duration-300 ease-in-out transform",
                    isOpen
                        ? "translate-y-0 opacity-100 scale-100"
                        : "translate-y-10 opacity-0 scale-95 pointer-events-none"
                )}
            >
                <div className="bg-background rounded-xl shadow-2xl border overflow-hidden h-[500px] flex flex-col">
                    <div className="bg-primary p-3 flex justify-between items-center text-primary-foreground">
                        <span className="font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Financial Coach
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-primary-foreground/20 text-primary-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {/* We render ChatInterface but need to make sure it fits nicely without its own card borders if possible, 
                     or we just wrap it. Since ChatInterface has its own Card, we might want to refactor it or just use it as is.
                     For now, let's use it as is but maybe hide the header if we provided one above. 
                     Actually, ChatInterface has a header. Let's just render it.
                 */}
                        <ChatInterface isFloating={true} />
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg z-40 transition-transform duration-200",
                    isOpen ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                size="icon"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </Button>
        </>
    );
};

export default FloatingChat;
