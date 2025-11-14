import React, { useState, useEffect, useRef } from 'react';
import { VirtualFileSystem, VFSNode, VFSFolder } from '../types';
import { SaveIcon } from './icons/SaveIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { FolderIcon } from './icons/FolderIcon';
import { FileIcon } from './icons/FileIcon';

declare const window: any;

interface CognitiveIDEProps {
  virtualFileSystem: VirtualFileSystem;
  setVirtualFileSystem: React.Dispatch<React.SetStateAction<VirtualFileSystem>>;
  fileToAutoOpen: string | null;
  onFileOpened: () => void;
}

const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop();
    switch (extension) {
        case 'py': return 'python';
        case 'js': return 'javascript';
        case 'ts': return 'typescript';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'html': return 'html';
        case 'css': return 'css';
        default: return 'plaintext';
    }
}

const filterVFS = (vfs: VirtualFileSystem, searchTerm: string): VirtualFileSystem => {
    if (!searchTerm) {
        return vfs;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered: VirtualFileSystem = {};

    for (const name in vfs) {
        const node = vfs[name];
        const lowerCaseName = name.toLowerCase();

        if (node.type === 'folder') {
            const filteredChildren = filterVFS(node.children, searchTerm);
            if (lowerCaseName.includes(lowerCaseSearchTerm) || Object.keys(filteredChildren).length > 0) {
                filtered[name] = { ...node, children: filteredChildren };
            }
        } else if (lowerCaseName.includes(lowerCaseSearchTerm)) {
            filtered[name] = node;
        }
    }
    return filtered;
};

interface FileTreeProps {
    vfs: VirtualFileSystem;
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
    level?: number;
    pathPrefix?: string;
    expandedFolders: Record<string, boolean>;
    setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const FileTree: React.FC<FileTreeProps> = ({ vfs, onFileSelect, selectedFile, level = 0, pathPrefix = '', expandedFolders, setExpandedFolders }) => {
    const sortedEntries = (Object.entries(vfs) as [string, VFSNode][]).sort(([aName, aNode], [bName, bNode]) => {
        if (aNode.type === 'folder' && bNode.type !== 'folder') return -1;
        if (aNode.type !== 'folder' && bNode.type === 'folder') return 1;
        return aName.localeCompare(bName);
    });

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
    }

    return (
        <ul style={{ paddingLeft: level > 0 ? '1rem' : '0' }}>
            {sortedEntries.map(([name, node]) => {
                const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;
                if (node.type === 'folder') {
                    const isExpanded = expandedFolders[currentPath] ?? false;
                    return (
                        <li key={currentPath}>
                            <button onClick={() => toggleFolder(currentPath)} className="w-full text-left flex items-center p-1 text-sm text-gray-300 hover:bg-gray-700 rounded-sm">
                                <FolderIcon className={`w-4 h-4 mr-2 flex-shrink-0 transition-transform ${isExpanded ? 'text-cyan-400' : 'text-gray-500'}`} />
                                <span className="truncate">{name}</span>
                            </button>
                            {isExpanded && (
                                <FileTree
                                    vfs={node.children}
                                    onFileSelect={onFileSelect}
                                    selectedFile={selectedFile}
                                    level={level + 1}
                                    pathPrefix={currentPath}
                                    expandedFolders={expandedFolders}
                                    setExpandedFolders={setExpandedFolders}
                                />
                            )}
                        </li>
                    )
                } else {
                    return (
                        <li key={currentPath}>
                            <button
                                onClick={() => onFileSelect(currentPath)}
                                className={`w-full text-left flex items-center p-1 text-sm truncate ${selectedFile === currentPath ? 'bg-cyan-800 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                            >
                                <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{name}</span>
                            </button>
                        </li>
                    )
                }
            })}
        </ul>
    )
}

const getNodeFromPath = (vfs: VirtualFileSystem, path: string): VFSNode | null => {
    const parts = path.split('/').filter(p => p);
    let current: VFSNode | VirtualFileSystem = { type: 'folder', children: vfs };
    for (const part of parts) {
        if (current.type === 'folder' && current.children[part]) {
            current = current.children[part];
        } else {
            return null;
        }
    }
    return current.type !== 'folder' ? current : null;
}


export const CognitiveIDE: React.FC<CognitiveIDEProps> = ({ virtualFileSystem, setVirtualFileSystem, fileToAutoOpen, onFileOpened }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({'/': true});
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMonacoLoading, setIsMonacoLoading] = useState(true);

  useEffect(() => {
    if (fileToAutoOpen) {
        const node = getNodeFromPath(virtualFileSystem, fileToAutoOpen);
        if (node && node.type === 'file') {
            setSelectedFile(fileToAutoOpen);

            // Expand all parent folders
            const pathParts = fileToAutoOpen.split('/');
            pathParts.pop(); // remove filename
            const newExpanded: Record<string, boolean> = {};
            let currentPath = '';
            for (const part of pathParts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                newExpanded[currentPath] = true;
            }
            setExpandedFolders(prev => ({ ...prev, ...newExpanded }));
        }
        onFileOpened();
    }
  }, [fileToAutoOpen, onFileOpened, virtualFileSystem]);


  useEffect(() => {
    if (window.monaco) {
        setIsMonacoLoading(false);
        return;
    }

    if (window.require) {
        window.require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
        window.require(['vs/editor/editor.main'], () => {
             setIsMonacoLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    if (!isMonacoLoading && containerRef.current && !editorRef.current) {
        monacoRef.current = window.monaco;
        editorRef.current = monacoRef.current.editor.create(containerRef.current, {
            theme: 'vs-dark',
            automaticLayout: true,
            backgroundColor: '#111827' // tailwind gray-900
        });

        editorRef.current.onDidChangeModelContent(() => {
            setIsDirty(true);
        });
    }

    return () => {
        if(editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
        }
    }
  }, [isMonacoLoading]);

  useEffect(() => {
    if (selectedFile && editorRef.current && monacoRef.current) {
      const node = getNodeFromPath(virtualFileSystem, selectedFile);
      const content = (node?.type === 'file') ? node.content : '';
      
      if (content !== editorRef.current.getValue()) {
         editorRef.current.setValue(content);
      }
      const language = getLanguageFromFilename(selectedFile);
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language);
      setIsDirty(false);
    } else if (!selectedFile && editorRef.current) {
        editorRef.current.setValue('');
    }
  }, [selectedFile, virtualFileSystem, isMonacoLoading]);
  
  const handleFileSelect = (path: string) => {
    if (isDirty && selectedFile) {
        if(confirm(`You have unsaved changes in ${selectedFile}. Do you want to discard them?`)) {
             setIsDirty(false);
        } else {
            return;
        }
    }
    setSelectedFile(path);
  };

  const handleSave = () => {
    if (selectedFile && editorRef.current) {
        const newContent = editorRef.current.getValue();
        setVirtualFileSystem(prevVFS => {
            const newVFS = JSON.parse(JSON.stringify(prevVFS));
            const parts = selectedFile.split('/');
            let currentLevel: VFSFolder['children'] = newVFS;
            
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                const nextNode = currentLevel[part];
                if (nextNode && nextNode.type === 'folder') {
                    currentLevel = nextNode.children;
                } else {
                    // This case should ideally not happen if the path is correct
                    return prevVFS;
                }
            }

            const filename = parts[parts.length - 1];
            const fileNode = currentLevel[filename];
            if (fileNode && fileNode.type === 'file') {
                fileNode.content = newContent;
            }
            
            return newVFS;
        });
        setIsDirty(false);
    }
  };

  const filteredVFS = filterVFS(virtualFileSystem, searchTerm);

  return (
    <div className="bg-gray-800/50 h-full flex flex-col">
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/3 min-w-[200px] border-r border-cyan-500/20 overflow-y-auto bg-gray-900/50">
          <div className="p-2 bg-gray-900 flex flex-col justify-between items-center sticky top-0 z-10">
             <h4 className="text-sm font-semibold text-gray-400 w-full mb-2">Workspace</h4>
             <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
             />
          </div>
          <div className="p-2">
            <FileTree 
                vfs={filteredVFS}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
            />
          </div>
        </div>
        <div className="w-2/3 flex flex-col">
          <div className="p-2 bg-gray-900/50 flex justify-between items-center">
            <h4 className="text-sm font-semibold text-gray-400 truncate">{selectedFile || 'Editor'}</h4>
            {selectedFile && (
                <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="flex items-center px-2 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                >
                   <SaveIcon className="w-4 h-4 mr-1"/>
                   Save
                </button>
            )}
          </div>
          <div className="flex-grow relative bg-gray-900">
             {isMonacoLoading && <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><SpinnerIcon/> Loading Editor...</div>}
             <div ref={containerRef} className="w-full h-full" style={{ visibility: isMonacoLoading ? 'hidden' : 'visible'}}></div>
             {!selectedFile && !isMonacoLoading && <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">Select a file to begin editing.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};