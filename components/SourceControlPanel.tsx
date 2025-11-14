
import React, { useState, useEffect, useMemo } from 'react';
import { VirtualFileSystem, VFSChange, Commit, VFSNode } from '../types';
import { FileIcon } from './icons/FileIcon';
import { SourceControlIcon } from './icons/SourceControlIcon';

interface SourceControlPanelProps {
  vfs: VirtualFileSystem;
  committedVFS: VirtualFileSystem;
  commitLog: Commit[];
  onCommit: (message: string) => void;
  isLoading: boolean;
}

const diffVFS = (
  current: VirtualFileSystem,
  committed: VirtualFileSystem,
  pathPrefix: string = ''
): VFSChange[] => {
  let changes: VFSChange[] = [];
  const allKeys = new Set([...Object.keys(current), ...Object.keys(committed)]);

  for (const key of allKeys) {
    const currentPath = pathPrefix ? `${pathPrefix}/${key}` : key;
    const currentNode = current[key];
    const committedNode = committed[key];

    if (currentNode && !committedNode) {
      if (currentNode.type === 'file') {
        changes.push({ path: currentPath, status: 'new' });
      } else {
        changes.push(...diffVFS(currentNode.children, {}, currentPath));
      }
    } else if (!currentNode && committedNode) {
        // Deletion not implemented in UI, but logic is here
        // changes.push({ path: currentPath, status: 'deleted' });
    } else if (currentNode && committedNode) {
      if (currentNode.type === 'file' && committedNode.type === 'file') {
        if (currentNode.content !== committedNode.content) {
          changes.push({ path: currentPath, status: 'modified' });
        }
      } else if (currentNode.type === 'folder' && committedNode.type === 'folder') {
        changes.push(...diffVFS(currentNode.children, committedNode.children, currentPath));
      } else {
        // Type changed, treat as new/deleted for simplicity
        changes.push({ path: currentPath, status: 'modified' });
      }
    }
  }
  return changes;
};

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
  vfs,
  committedVFS,
  commitLog,
  onCommit,
  isLoading,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const changes = useMemo(() => diffVFS(vfs, committedVFS), [vfs, committedVFS]);

  const handleCommit = () => {
    if (commitMessage.trim() && changes.length > 0 && !isLoading) {
      onCommit(commitMessage.trim());
      setCommitMessage('');
    }
  };

  const getStatusColor = (status: VFSChange['status']) => {
    switch(status) {
        case 'new': return 'text-green-400';
        case 'modified': return 'text-yellow-400';
        case 'deleted': return 'text-red-400';
    }
  }

  return (
    <div className="bg-gray-800/50 h-full flex flex-col p-4 text-sm">
      <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/20">
        <h3 className="text-lg font-bold font-orbitron text-gray-200 flex items-center">
            <SourceControlIcon className="w-5 h-5 mr-2"/>
            Source Control
        </h3>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row md:space-x-4 overflow-hidden">
        {/* Left Side: Changes & Commit */}
        <div className="w-full md:w-1/2 flex flex-col space-y-4">
            <div>
                <h4 className="font-semibold text-gray-300 mb-2">Commit Changes</h4>
                 <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    rows={3}
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-300"
                    disabled={isLoading || changes.length === 0}
                />
                <button
                    onClick={handleCommit}
                    disabled={isLoading || changes.length === 0 || !commitMessage.trim()}
                    className="w-full mt-2 p-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                >
                    Commit ({changes.length}) {changes.length === 1 ? 'File' : 'Files'}
                </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                <h4 className="font-semibold text-gray-300 mb-2 sticky top-0 bg-gray-800/50 py-1">Changes ({changes.length})</h4>
                {changes.length === 0 ? (
                    <p className="text-gray-500 italic">No changes since last commit.</p>
                ) : (
                    <ul className="space-y-1">
                        {changes.map(change => (
                            <li key={change.path} className="flex items-center p-1 bg-gray-900/50 rounded">
                                <FileIcon className="w-4 h-4 mr-2 flex-shrink-0"/>
                                <span className="flex-grow truncate" title={change.path}>{change.path}</span>
                                <span className={`font-mono text-xs font-bold ${getStatusColor(change.status)}`}>{change.status.charAt(0).toUpperCase()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
        {/* Right Side: History */}
        <div className="w-full md:w-1/2 flex flex-col mt-4 md:mt-0">
             <h4 className="font-semibold text-gray-300 mb-2">History</h4>
             <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 border-t md:border-t-0 md:border-l border-cyan-500/10 pt-4 md:pt-0 md:pl-4">
                {commitLog.length === 0 ? (
                     <p className="text-gray-500 italic">No commit history yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {commitLog.map(commit => (
                            <li key={commit.id}>
                                <p className="font-semibold text-gray-200 truncate">{commit.message}</p>
                                <p className="text-xs text-gray-500 font-mono" title={new Date(commit.timestamp).toLocaleString()}>{new Date(commit.timestamp).toLocaleDateString()}</p>
                            </li>
                        ))}
                    </ul>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};
