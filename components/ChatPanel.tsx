import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { AttachIcon } from './icons/AttachIcon';
import { SaveIcon } from './icons/SaveIcon';
import { BrainIcon } from './icons/BrainIcon';
import { MissionIcon } from './icons/MissionIcon';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, source?: 'chat' | 'terminal' | 'system', image?: string) => void;
  isChatting: boolean;
  isMindCreated: boolean;
  onSetMission: (mission: string) => void;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = (props) => {
    const { chatHistory, onSendMessage, isChatting, isMindCreated, onSetMission, isLoading } = props;
    const [input, setInput] = useState('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [isMissionMode, setIsMissionMode] = useState(false);
    const [missionInput, setMissionInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);
    
    const handleSetMission = () => {
        if (missionInput.trim()) {
            onSetMission(missionInput.trim());
            setMissionInput('');
            setIsMissionMode(false);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = input.trim();
        if ((messageToSend || attachedImage) && !isChatting) {
            onSendMessage(messageToSend, 'chat', attachedImage ?? undefined);
            setInput('');
            setAttachedImage(null);
        }
    };

    const handleAttachClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setAttachedImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
        if (event.target) event.target.value = '';
    };
    
    const renderMessage = (msg: ChatMessage, index: number) => {
        if (msg.sender === 'system' || msg.type === 'thought') return null;
        const bubbleClasses = `rounded-lg px-4 py-2 max-w-[90%] whitespace-pre-wrap break-words ${msg.sender === 'user' ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-200'}`;
        return (
            <div key={index} className={`flex my-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={bubbleClasses}>
                    {msg.image && (
                        <div className="mb-2 relative">
                            <img src={msg.image.url} alt="chat content" className="max-w-xs max-h-64 rounded-md" />
                            <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{msg.image.source}</span>
                        </div>
                    )}
                    {msg.text && <p>{msg.text}</p>}
                </div>
            </div>
        );
    };

    const lastMessage = chatHistory[chatHistory.length - 1];
    const showSpinner = isChatting && (!lastMessage || lastMessage.sender !== 'persona');
    
    if (!isMindCreated) {
        return (
            <div className="bg-gray-800/50 h-full flex items-center justify-center text-center text-gray-500 p-4">
                <div>
                    <BrainIcon className="w-16 h-16 mx-auto text-gray-600"/>
                    <p className="mt-2">Create a mind to begin conversation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow flex flex-col min-h-0 bg-gray-900/30">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
             <header className="flex-shrink-0 p-2 bg-gray-900/50 flex justify-between items-center border-b border-cyan-500/20">
                <h4 className="text-sm font-bold text-gray-300">Directorate Communication Channel</h4>
                <button onClick={() => onSendMessage("System Directive: Use the 'save_chat_history' tool to archive this conversation.", 'system')} disabled={!isMindCreated || chatHistory.length === 0} className="flex items-center px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded" title="Save Chat History">
                    <SaveIcon className="w-4 h-4 mr-1" /> Save Chat
                </button>
            </header>
            <div className="flex-grow overflow-y-auto p-2 pr-4 custom-scrollbar">
                {chatHistory.map(renderMessage)}
                {showSpinner && (
                    <div className="flex my-2 justify-start">
                        <div className="rounded-lg px-4 py-2 max-w-[80%] bg-gray-700 text-gray-200 flex items-center">
                            <SpinnerIcon className="w-4 h-4 mr-2" /><span>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
             {attachedImage && (
                <div className="p-2 border-t border-gray-700 relative w-fit">
                    <img src={attachedImage} alt="preview" className="max-h-24 rounded" />
                    <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold">&times;</button>
                </div>
            )}
             {isMissionMode && (
                <div className="p-4 border-t border-cyan-500/20 bg-gray-800 space-y-2">
                    <label htmlFor="mission-statement" className="text-cyan-400 text-sm font-semibold flex items-center">
                        <MissionIcon className="w-4 h-4 mr-2" />
                        New Mission Statement
                    </label>
                    <textarea
                        id="mission-statement"
                        value={missionInput}
                        onChange={(e) => setMissionInput(e.target.value)}
                        placeholder="e.g., 'Develop a Python script to analyze market sentiment...'"
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all text-gray-300 resize-none"
                        rows={3}
                        disabled={isLoading}
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSetMission}
                            disabled={isLoading || !missionInput.trim()}
                            className="w-full flex items-center justify-center p-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 disabled:bg-gray-600 transition-all"
                        >
                           Set Mission
                        </button>
                         <button onClick={() => setIsMissionMode(false)} className="px-4 bg-gray-600 text-white rounded-md hover:bg-gray-500">Cancel</button>
                    </div>
                </div>
            )}
            <form onSubmit={handleSend} className="p-2 flex space-x-2 border-t border-gray-700">
                <button type="button" onClick={handleAttachClick} disabled={isChatting} className="p-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all" title="Attach Image">
                    <AttachIcon className="w-5 h-5" />
                </button>
                 <button type="button" onClick={() => setIsMissionMode(true)} disabled={isChatting || isLoading} className="p-3 bg-purple-700 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all" title="Start New Mission">
                    <MissionIcon className="w-5 h-5" />
                </button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Guide the agent or issue a new command..." className="flex-grow p-3 bg-gray-900 border-2 border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-gray-300" disabled={isChatting} />
                <button type="submit" disabled={isChatting || (!input.trim() && !attachedImage)} className="p-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-bold">
                    Send
                </button>
            </form>
        </div>
    );
}