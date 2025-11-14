
import React from 'react';
import { SystemLogEntry } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { LogIcon } from './icons/LogIcon';

interface SystemLogPanelProps {
  log: SystemLogEntry[];
}

export const SystemLogPanel: React.FC<SystemLogPanelProps> = ({ log }) => {
  
  const formatLogToString = () => {
    return log.map(entry => {
      const upgrades = entry.upgrades.length > 0 ? `Upgrades:\n- ${entry.upgrades.join('\n- ')}` : 'Upgrades: None';
      return `[${new Date(entry.timestamp).toLocaleString()}]
Directive: ${entry.directive}
Finding: ${entry.finding}
${upgrades}
------------------------------------`;
    }).join('\n\n');
  };
  
  const handleDownload = () => {
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(formatLogToString());
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "persona_system_log.txt");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatLogToString()).then(() => {
        alert('Log copied to clipboard!');
    }, (err) => {
        console.error('Could not copy log: ', err);
        alert('Failed to copy log.');
    });
  };

  return (
    <div className="bg-gray-800/50 h-full flex flex-col p-4">
      <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/20">
        <h3 className="text-lg font-bold font-orbitron text-gray-200">System Directives Log</h3>
        <div className="flex space-x-2">
            <button onClick={handleCopy} className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center" title="Copy Log">
                Copy
            </button>
            <button onClick={handleDownload} className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded" title="Download Log">
                <DownloadIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        {log.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-center text-gray-500">
            <div>
              <LogIcon className="w-16 h-16 mx-auto text-gray-600" />
              <p className="mt-2">System log is empty.</p>
              <p className="text-xs">Directives and agent findings will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {log.slice().reverse().map((entry, index) => (
              <div key={index} className="bg-gray-900/50 p-3 rounded-lg text-sm">
                <p className="text-xs text-gray-500 font-mono mb-2">{new Date(entry.timestamp).toLocaleString()}</p>
                <p className="text-indigo-300 font-semibold">Directive:</p>
                <p className="text-gray-300 whitespace-pre-wrap pl-2 border-l-2 border-indigo-500/50 mb-2">{entry.directive}</p>
                <p className="text-cyan-400 font-semibold">Finding:</p>
                <p className="text-gray-300 whitespace-pre-wrap pl-2 border-l-2 border-cyan-500/50 mb-2">{entry.finding || 'No text response from agent.'}</p>
                {entry.upgrades.length > 0 && (
                  <>
                    <p className="text-green-400 font-semibold">Mind Upgrades:</p>
                    <ul className="list-disc pl-8 text-gray-400 text-xs">
                      {entry.upgrades.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
