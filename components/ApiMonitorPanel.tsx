
import React, { useState } from 'react';
import { ApiCallLog } from '../types';
import { ServerIcon } from './icons/ServerIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';

const StatusIndicator: React.FC<{ status: ApiCallLog['status'] }> = ({ status }) => {
    const baseClasses = "w-3 h-3 rounded-full mr-2 flex-shrink-0";
    switch (status) {
        case 'Pending':
            return <div className={`${baseClasses} bg-gray-500`} title="Pending"></div>;
        case 'Processing':
            return <div className="w-4 h-4 mr-2 flex-shrink-0"><SpinnerIcon className="w-full h-full text-blue-400" /></div>;
        case 'Retrying':
            return <div className="w-4 h-4 mr-2 flex-shrink-0"><SpinnerIcon className="w-full h-full text-yellow-400" /></div>;
        case 'Success':
            return <div className={`${baseClasses} bg-green-500`} title="Success"></div>;
        case 'Failed':
            return <div className={`${baseClasses} bg-red-500`} title="Failed"></div>;
        default:
            return null;
    }
};

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
    if (typeof data === 'undefined' || data === null) {
        return <pre className="text-gray-500">null</pre>;
    }
    let content;
    try {
        content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    } catch (e) {
        content = "Could not stringify response. Check console for details.";
    }
    
    return (
        <pre className="text-xs bg-gray-900 p-2 rounded-md custom-scrollbar overflow-auto max-h-64">
            <code>{content}</code>
        </pre>
    );
};

const StatCard: React.FC<{ title: string; value: string; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
  <div className="bg-gray-900/50 p-2 rounded flex items-center">
    <div className={`mr-3 p-2 rounded bg-gray-800 ${color}`}>
        {icon}
    </div>
    <div>
      <p className={`font-bold text-lg ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs">{title}</p>
    </div>
  </div>
);


interface ApiMonitorPanelProps {
  logs: ApiCallLog[];
}

export const ApiMonitorPanel: React.FC<ApiMonitorPanelProps> = ({ logs }) => {
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

    const toggleDetails = (id: string) => {
        setSelectedLogId(prevId => (prevId === id ? null : id));
    };
    
    const totalCalls = logs.length;
    const successfulCalls = logs.filter(l => l.status === 'Success').length;
    const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : '0.0';
    const totalTokens = logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
    const totalCost = logs.reduce((acc, l) => acc + (l.estimatedCost || 0), 0);

    return (
        <div className="bg-gray-800/50 h-full flex flex-col p-4 text-sm">
            <div className="flex-shrink-0 mb-4 pb-2 border-b border-cyan-500/20">
                <h3 className="text-lg font-bold font-orbitron text-gray-200 flex items-center">
                    <ServerIcon className="w-5 h-5 mr-2"/>
                    API Analytics Dashboard
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                    <StatCard title="Total Calls" value={totalCalls.toString()} color="text-cyan-400" icon={<ServerIcon className="w-5 h-5"/>} />
                    <StatCard title="Success Rate" value={`${successRate}%`} color="text-green-400" icon={<ServerIcon className="w-5 h-5"/>} />
                    <StatCard title="Total Tokens" value={totalTokens.toLocaleString()} color="text-indigo-400" icon={<ServerIcon className="w-5 h-5"/>} />
                    <StatCard title="Est. Cost" value={`$${totalCost.toFixed(6)}`} color="text-yellow-400" icon={<DollarSignIcon className="w-5 h-5"/>} />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <p>No API calls have been made yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="bg-gray-900/50 rounded-lg text-xs">
                                <button onClick={() => toggleDetails(log.id)} className="w-full p-2 flex items-center justify-between text-left hover:bg-gray-700/50 rounded-t-lg">
                                    <div className="flex items-center truncate flex-grow min-w-0">
                                        <StatusIndicator status={log.status} />
                                        <span className="font-bold text-cyan-300 mr-2 truncate">{log.agentName}</span>
                                        <span className="text-gray-400 truncate hidden md:inline">{log.model}</span>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 ml-2">
                                        <span className="text-yellow-300 mr-4 font-mono">{log.totalTokens ? `${log.totalTokens.toLocaleString()} tk` : ''}</span>
                                        <span className="text-indigo-300 mr-4 font-mono">{log.duration ? `${log.duration}ms` : '...'}</span>
                                        <span className="text-gray-500 font-mono hidden sm:inline">{new Date(log.startTime).toLocaleTimeString()}</span>
                                    </div>
                                </button>
                                {selectedLogId === log.id && (
                                    <div className="p-3 border-t border-cyan-500/20 space-y-3">
                                        { (typeof log.totalTokens === 'number') &&
                                        <div>
                                            <h5 className="font-semibold text-gray-300 mb-1">Usage & Cost</h5>
                                            <div className="grid grid-cols-2 gap-2 text-center bg-gray-900 p-2 rounded-md">
                                                <div>
                                                    <p className="font-mono text-indigo-300">{log.totalTokens.toLocaleString()}</p>
                                                    <p className="text-gray-500 text-xxs">Total Tokens</p>
                                                </div>
                                                <div>
                                                    <p className="font-mono text-yellow-300">${(log.estimatedCost || 0).toFixed(6)}</p>
                                                    <p className="text-gray-500 text-xxs">Est. Cost</p>
                                                </div>
                                                <div>
                                                    <p className="font-mono text-gray-400">{log.promptTokens?.toLocaleString()}</p>
                                                    <p className="text-gray-500 text-xxs">Prompt Tokens</p>
                                                </div>
                                                <div>
                                                    <p className="font-mono text-gray-400">{log.candidateTokens?.toLocaleString()}</p>
                                                    <p className="text-gray-500 text-xxs">Output Tokens</p>
                                                </div>
                                            </div>
                                        </div>
                                        }
                                        <div>
                                            <h5 className="font-semibold text-gray-300 mb-1">Request Payload</h5>
                                            <JsonViewer data={log.requestPayload} />
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-gray-300 mb-1">{log.status === 'Failed' ? 'Error / Response' : 'Response Payload'}</h5>
                                            <JsonViewer data={log.responsePayload} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};