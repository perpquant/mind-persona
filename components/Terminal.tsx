
import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine } from '../types';

interface TerminalProps {
    history: TerminalLine[];
    onCommand: (command: string) => void;
    isLoading: boolean;
}

const availableCommands = ['ls', 'cat', 'write', 'mkdir', 'touch', 'python'];

export const Terminal: React.FC<TerminalProps> = ({ history, onCommand, isLoading }) => {
    const [input, setInput] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const endOfHistoryRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const command = input.trim();
        if (command && !isLoading) {
            onCommand(command);
            if (commandHistory[commandHistory.length - 1] !== command) {
                 setCommandHistory(prev => [...prev, command]);
            }
            setHistoryIndex(commandHistory.length);
            setInput('');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newIndex = Math.max(0, historyIndex - 1);
            if (commandHistory.length > 0) {
              setInput(commandHistory[newIndex] || '');
              setHistoryIndex(newIndex);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newIndex = Math.min(commandHistory.length, historyIndex + 1);
            if (newIndex < commandHistory.length) {
                setInput(commandHistory[newIndex]);
            } else {
                setInput('');
            }
            setHistoryIndex(newIndex);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const currentInput = e.currentTarget.value;
            const parts = currentInput.split(' ');
            const termToComplete = parts[parts.length - 1];

            if (termToComplete) {
                const potentialCompletions = availableCommands.filter(cmd => cmd.startsWith(termToComplete));
                if (potentialCompletions.length === 1) {
                    setInput(currentInput.replace(new RegExp(`${termToComplete}$`), potentialCompletions[0] + ' '));
                }
            }
        }
    }

    const renderLine = (line: TerminalLine, index: number) => {
        const textClass = line.type === 'error' ? 'text-red-400' : 'text-gray-300';
        const prefix = line.type === 'input' ? <span className="text-cyan-400 mr-2">$</span> : null;
        return (
            <div key={index}>
                {prefix}
                <pre className={`whitespace-pre-wrap break-words inline ${textClass}`}>{line.text}</pre>
            </div>
        )
    }

    return (
        <div className="bg-black h-full flex flex-col font-mono text-sm p-4" onClick={() => inputRef.current?.focus()}>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {history.map(renderLine)}
                <div ref={endOfHistoryRef} />
            </div>
            <form onSubmit={handleFormSubmit} className="flex items-center mt-2">
                <span className="text-cyan-400 mr-2">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent text-gray-200 focus:outline-none"
                    placeholder="Enter command..."
                    disabled={isLoading}
                    autoFocus
                />
            </form>
        </div>
    );
};