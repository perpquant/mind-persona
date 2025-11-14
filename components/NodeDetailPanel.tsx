
import React from 'react';
import { MindMapNode } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { FileIcon } from './icons/FileIcon';

interface NodeDetailPanelProps {
  node: MindMapNode | null;
  onClose: () => void;
  onOpenFile: (filePath: string) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose, onOpenFile }) => {
  if (!node) {
    return null;
  }

  const getTypePillColor = (type: MindMapNode['type']) => {
    switch (type) {
      case 'CORE_PERSONA': return 'bg-cyan-500/20 text-cyan-300';
      case 'MISSION': return 'bg-purple-500/20 text-purple-300';
      case 'TASK': return 'bg-gray-500/20 text-gray-300';
      case 'PSYCHOLOGY_ASPECT': return 'bg-indigo-500/20 text-indigo-300';
      case 'QUANTUM_INSIGHT': return 'bg-pink-500/20 text-pink-300';
      case 'KEY_TRAIT': return 'bg-yellow-500/20 text-yellow-300';
      case 'STRENGTH': return 'bg-lime-500/20 text-lime-300';
      case 'WEAKNESS': return 'bg-orange-500/20 text-orange-300';
      case 'KNOWLEDGE_CONCEPT': return 'bg-blue-500/20 text-blue-300';
      case 'ABSTRACT_CONCEPT': return 'bg-emerald-500/20 text-emerald-300';
      case 'FILE_REFERENCE': return 'bg-slate-500/20 text-slate-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusPillColor = (status: MindMapNode['status']) => {
    switch (status) {
        case 'complete': return 'bg-green-500/20 text-green-300';
        case 'in_progress': return 'bg-blue-500/20 text-blue-300';
        case 'pending': return 'bg-slate-500/20 text-slate-300';
        default: return 'bg-gray-500/20 text-gray-300';
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-[350px] bg-gray-900/80 backdrop-blur-sm shadow-2xl border-l-2 border-cyan-500/30 flex flex-col transition-transform transform translate-x-0 z-20">
      <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-cyan-500/20">
        <h3 className="text-md font-bold text-gray-200 font-orbitron truncate" title={node.name}>
          Node Details
        </h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
          <CloseIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar text-sm">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-400 text-xs uppercase mb-1">Name</h4>
            <p className="font-bold text-lg text-cyan-300">{node.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div>
              <h4 className="font-semibold text-gray-400 text-xs uppercase mb-1">Type</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${getTypePillColor(node.type)}`}>
                {node.type}
              </span>
            </div>
             {node.type === 'TASK' && node.status && (
                <div>
                    <h4 className="font-semibold text-gray-400 text-xs uppercase mb-1">Status</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${getStatusPillColor(node.status)}`}>
                        {node.status}
                    </span>
                </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-400 text-xs uppercase mb-1">Content</h4>
            <p className="text-gray-300 whitespace-pre-wrap bg-gray-800/50 p-2 rounded-md">
              {node.content}
            </p>
          </div>
          
          {node.linkedFile && (
            <div>
                 <h4 className="font-semibold text-gray-400 text-xs uppercase mb-2">Linked File</h4>
                 <button onClick={() => onOpenFile(node.linkedFile!)} className="w-full flex items-center p-2 text-left bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
                    <FileIcon className="w-4 h-4 mr-2 flex-shrink-0"/>
                    <span className="truncate text-cyan-400">{node.linkedFile}</span>
                 </button>
            </div>
          )}

          <div>
             <h4 className="font-semibold text-gray-400 text-xs uppercase mb-1">Metadata</h4>
             <div className="text-xs text-gray-500 space-y-1 font-mono bg-gray-800/50 p-2 rounded-md">
                <p>ID: <span className="text-gray-400 truncate">{node.id}</span></p>
                <p>Source: <span className="text-gray-400">{node.source}</span></p>
                <p>Created: <span className="text-gray-400">{new Date(node.createdAt).toLocaleString()}</span></p>
                <p>Updated: <span className="text-gray-400">{new Date(node.updatedAt).toLocaleString()}</span></p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
