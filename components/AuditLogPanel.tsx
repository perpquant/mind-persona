
import React, { useState, useEffect } from 'react';
import { AuditLogEntry, AuditEventType } from '../types';
import { auditLogService } from '../services/auditLogService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
    const content = JSON.stringify(data, null, 2);
    return (
        <pre className="text-xs bg-gray-900 p-2 rounded-md custom-scrollbar overflow-auto max-h-64">
            <code>{content}</code>
        </pre>
    );
};

const getTypeStyles = (type: AuditEventType) => {
    switch (type) {
        case 'API_CALL': return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' };
        case 'AGENT_ACTION': return { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/30' };
        case 'STATE_CHANGE': return { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/30' };
        case 'SYSTEM_EVENT': return { bg: 'bg-yellow-500/10', text: 'text-yellow-300', border: 'border-yellow-500/30' };
        case 'USER_INTERACTION': return { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30' };
        default: return { bg: 'bg-gray-500/10', text: 'text-gray-300', border: 'border-gray-500/30' };
    }
}

const eventTypes: AuditEventType[] = ['API_CALL', 'AGENT_ACTION', 'STATE_CHANGE', 'SYSTEM_EVENT', 'USER_INTERACTION'];

export const AuditLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [filter, setFilter] = useState<AuditEventType | 'ALL'>('ALL');

    useEffect(() => {
        const unsubscribe = auditLogService.subscribe(setLogs);
        return () => unsubscribe();
    }, []);

    const toggleDetails = (id: string) => {
        setSelectedLogId(prevId => prevId === id ? null : id);
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `persona_audit_log_MANUAL_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };
    
    const handleClear = () => {
        if (confirm('Are you sure you want to permanently delete the entire audit log? This cannot be undone.')) {
            auditLogService.clear();
        }
    }

    const filteredLogs = filter === 'ALL' ? logs : logs.filter(log => log.type === filter);

    return (
        <div className="bg-gray-800/50 h-full flex flex-col p-4 text-sm">
            <header className="flex-shrink-0 mb-4 pb-2 border-b border-cyan-500/20">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold font-orbitron text-gray-200 flex items-center">
                        <ClipboardIcon className="w-5 h-5 mr-2"/>
                        Persistent Audit Log
                    </h3>
                    <div className="flex space-x-2">
                        <button onClick={handleDownload} className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded" title="Download Full Log"><DownloadIcon className="w-4 h-4" /></button>
                        <button onClick={handleClear} className="px-3 py-1 text-xs bg-red-800 hover:bg-red-700 text-white rounded">Clear Log</button>
                    </div>
                </div>
                 <div className="mt-2 flex space-x-1">
                    <button onClick={() => setFilter('ALL')} className={`px-2 py-1 text-xs rounded ${filter === 'ALL' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>ALL</button>
                    {eventTypes.map(type => (
                         <button key={type} onClick={() => setFilter(type)} className={`px-2 py-1 text-xs rounded ${filter === type ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{type.replace('_', ' ')}</button>
                    ))}
                </div>
            </header>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {filteredLogs.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <p>No audit log entries found{filter !== 'ALL' ? ` for type: ${filter}`: ''}.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredLogs.map(log => {
                            const styles = getTypeStyles(log.type);
                            return (
                                <div key={log.id} className={`${styles.bg} rounded-lg text-xs border ${styles.border}`}>
                                    <button onClick={() => toggleDetails(log.id)} className="w-full p-2 flex items-center justify-between text-left hover:bg-gray-700/50 rounded-t-lg">
                                        <div className="flex items-center truncate flex-grow min-w-0">
                                            <span className={`font-mono font-bold ${styles.text} mr-3`}>{log.type}</span>
                                            <span className="text-gray-400 truncate hidden md:inline">
                                                {/* Summary Here */}
                                            </span>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 ml-2">
                                            <span className="text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </button>
                                    {selectedLogId === log.id && (
                                        <div className="p-3 border-t border-cyan-500/20">
                                            <h5 className="font-semibold text-gray-300 mb-1">Event Payload</h5>
                                            <JsonViewer data={log.payload} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
