
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MindMapData, MindMapNode, MindMapLink, MindMapNodeType } from '../types';
import { BrainIcon } from './icons/BrainIcon';
import { FolderIcon } from './icons/FolderIcon';
import { FileIcon } from './icons/FileIcon';

// --- New Knowledge Tree View Component ---

interface TreeNode {
  id: string;
  name: string;
  type: MindMapNodeType;
  node: MindMapNode;
  children: TreeNode[];
}

interface KnowledgeTreeViewProps {
  data: MindMapData;
  onNodeClick: (node: MindMapNode) => void;
  selectedNodeId: string | null;
}

const getNodeIcon = (type: MindMapNodeType, isExpanded: boolean) => {
    switch(type) {
        case 'CORE_PERSONA':
        case 'PSYCHOLOGY_ASPECT':
        case 'MISSION':
            return <FolderIcon className={`w-4 h-4 mr-2 flex-shrink-0 transition-transform ${isExpanded ? 'text-cyan-400' : 'text-gray-500'}`} />;
        default:
            return <FileIcon className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
}


const TreeViewNode: React.FC<{ treeNode: TreeNode, onNodeClick: (node: MindMapNode) => void, selectedNodeId: string | null, level: number }> = ({ treeNode, onNodeClick, selectedNodeId, level }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2);
    const hasChildren = treeNode.children && treeNode.children.length > 0;

    const handleToggle = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        } else {
            onNodeClick(treeNode.node);
        }
    };
    
    const handleNodeSelect = () => {
        onNodeClick(treeNode.node);
    };

    return (
        <li style={{ paddingLeft: `${level * 1}rem` }}>
            <div className={`flex items-center p-1 rounded-sm cursor-pointer ${selectedNodeId === treeNode.id ? 'bg-cyan-800' : 'hover:bg-gray-700'}`}>
                <div onClick={handleToggle} className="flex items-center flex-grow truncate">
                    {getNodeIcon(treeNode.type, isExpanded)}
                    <span className="truncate" onClick={handleNodeSelect}>{treeNode.name}</span>
                </div>
            </div>
            {hasChildren && isExpanded && (
                <ul>
                    {treeNode.children.map(child => (
                        <TreeViewNode key={child.id} treeNode={child} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const KnowledgeTreeView: React.FC<KnowledgeTreeViewProps> = ({ data, onNodeClick, selectedNodeId }) => {
    const treeData = useMemo(() => {
        if (!data.nodes || data.nodes.length === 0) return null;

        const nodesById = new Map(data.nodes.map(n => [n.id, { ...n, children: [] }]));
        const tree: TreeNode[] = [];

        data.links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            
            if (link.type === 'HIERARCHICAL') {
                const parent = nodesById.get(sourceId);
                const child = nodesById.get(targetId);
                if (parent && child) {
                    (parent as any).children.push(child);
                }
            }
        });

        const buildTree = (nodeData: any): TreeNode => {
            return {
                id: nodeData.id,
                name: nodeData.name,
                type: nodeData.type,
                node: nodeData,
                children: nodeData.children.map(buildTree)
            };
        };
        
        // Find root nodes (nodes not targeted by any hierarchical link)
        const childIds = new Set(data.links.filter(l => l.type === 'HIERARCHICAL').map(l => typeof l.target === 'string' ? l.target : l.target.id));
        const rootNodes = data.nodes.filter(n => !childIds.has(n.id));
        
        // If there are no clear roots, fall back to Persona Core
        if (rootNodes.length === 0) {
            const core = nodesById.get('Persona_Core');
            if (core) tree.push(buildTree(core));
        } else {
             rootNodes.forEach(rootNodeData => {
                 const fullRootNodeData = nodesById.get(rootNodeData.id);
                 if(fullRootNodeData) tree.push(buildTree(fullRootNodeData));
             });
        }

        return tree;

    }, [data]);

    if (!treeData || treeData.length === 0) return null;
    
    return (
        <div className="w-full h-full p-2 overflow-y-auto custom-scrollbar">
            <ul className="text-sm text-gray-300">
                {treeData.map(rootNode => (
                    <TreeViewNode key={rootNode.id} treeNode={rootNode} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} level={0} />
                ))}
            </ul>
        </div>
    );
};


// --- Main Component ---
export const MindMap: React.FC<KnowledgeTreeViewProps> = ({ data, onNodeClick, selectedNodeId }) => {
  return (
    <div className="w-full h-full bg-gray-900">
       {data.nodes.length > 0 ? (
        <KnowledgeTreeView data={data} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-600">
          <div className="text-center">
            <BrainIcon className="w-24 h-24 mx-auto text-cyan-900" />
            <p className="mt-4 text-lg font-orbitron">KNOWLEDGE GRAPH WILL BE GENERATED HERE</p>
            <p className="text-sm text-gray-500">Define a persona and click 'Create Mind' to begin.</p>
          </div>
        </div>
      )}
    </div>
  );
};
