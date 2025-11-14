
import React from 'react';
import { MindMap } from './MindMap';
import { CognitiveIDE } from './CognitiveIDE';
import { Terminal } from './Terminal';
import { MindMapData, ChatMessage, VirtualFileSystem, TerminalLine, SystemLogEntry, Commit, ApiCallLog, Tab, MindMapNode, MissionTask } from '../types';
import { BrainIcon } from './icons/BrainIcon';
import { CodeIcon } from './icons/CodeIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { SystemLogPanel } from './SystemLogPanel';
import { LogIcon } from './icons/LogIcon';
import { SourceControlIcon } from './icons/SourceControlIcon';
import { SourceControlPanel } from './SourceControlPanel';
import { ServerIcon } from './icons/ServerIcon';
import { ApiMonitorPanel } from './ApiMonitorPanel';
import { NodeDetailPanel } from './NodeDetailPanel';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { AuditLogPanel } from './AuditLogPanel';
import { MissionIcon } from './icons/MissionIcon';
import { MissionControlPanel } from './MissionControlPanel';
import { ChatPanel } from './ChatPanel';
import { MessageIcon } from './icons/MessageIcon';

interface WorkspaceProps {
  mindMapData: MindMapData;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, source?: 'chat' | 'terminal' | 'system', image?: string) => void;
  isChatting: boolean;
  isMindCreated: boolean;
  virtualFileSystem: VirtualFileSystem;
  setVirtualFileSystem: React.Dispatch<React.SetStateAction<VirtualFileSystem>>;
  terminalHistory: TerminalLine[];
  systemLog: SystemLogEntry[];
  committedVFS: VirtualFileSystem;
  commitLog: Commit[];
  onCommit: (message: string) => void;
  apiCallLogs: ApiCallLog[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  fileToAutoOpen: string | null;
  onFileOpened: () => void;
  selectedNodeId: string | null;
  onNodeSelectionChange: (nodeId: string | null) => void;
  onOpenFileFromNode: (filePath: string) => void;
  missionStatement: string;
  missionTasks: MissionTask[];
  onSetMission: (mission: string) => void;
  isLoading: boolean;
}

const TabButton: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-2 text-xs border-b-2 transition-all ${
            isActive
                ? 'bg-gray-800/50 border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white'
        }`}
        title={label}
    >
        {icon}
        <span className="mt-1 hidden sm:inline">{label}</span>
    </button>
);


export const Workspace: React.FC<WorkspaceProps> = (props) => {
    const { activeTab, onTabChange, selectedNodeId, onNodeSelectionChange, missionStatement, onSetMission } = props;
    const selectedNode = selectedNodeId ? props.mindMapData.nodes.find(n => n.id === selectedNodeId) ?? null : null;

    const isMissionActive = !!missionStatement;

    const renderContent = () => {
        switch (activeTab) {
            case 'MIND_MAP':
                return <MindMap data={props.mindMapData} onNodeClick={(node) => onNodeSelectionChange(node ? node.id : null)} selectedNodeId={selectedNodeId}/>;
            case 'CHAT':
                return <ChatPanel 
                            chatHistory={props.chatHistory}
                            onSendMessage={props.onSendMessage}
                            isChatting={props.isChatting}
                            isMindCreated={props.isMindCreated}
                            onSetMission={onSetMission}
                            isLoading={props.isLoading}
                        />;
            case 'IDE':
                return <CognitiveIDE 
                            virtualFileSystem={props.virtualFileSystem} 
                            setVirtualFileSystem={props.setVirtualFileSystem}
                            fileToAutoOpen={props.fileToAutoOpen}
                            onFileOpened={props.onFileOpened}
                        />;
            case 'TERMINAL':
                return <Terminal history={props.terminalHistory} onCommand={(cmd) => props.onSendMessage(cmd, 'terminal')} isLoading={props.isChatting} />;
            case 'LOG':
                return <SystemLogPanel log={props.systemLog} />;
            case 'SOURCE_CONTROL':
                 return <SourceControlPanel 
                            vfs={props.virtualFileSystem} 
                            committedVFS={props.committedVFS}
                            commitLog={props.commitLog}
                            onCommit={props.onCommit}
                            isLoading={props.isChatting}
                        />
            case 'API_MONITOR':
                return <ApiMonitorPanel logs={props.apiCallLogs} />;
            case 'AUDIT_LOG':
                return <AuditLogPanel />;
            default:
                return null;
        }
    };
    
    const tabs: {id: Tab, icon: React.ReactNode, label: string}[] = [
        { id: 'CHAT', icon: <MessageIcon className="w-5 h-5" />, label: 'Chat' },
        { id: 'MIND_MAP', icon: <BrainIcon className="w-5 h-5"/>, label: 'Knowledge' },
        { id: 'IDE', icon: <CodeIcon className="w-5 h-5"/>, label: 'IDE' },
        { id: 'TERMINAL', icon: <TerminalIcon className="w-5 h-5"/>, label: 'Terminal' },
        { id: 'SOURCE_CONTROL', icon: <SourceControlIcon className="w-5 h-5"/>, label: 'Source Control' },
        { id: 'LOG', icon: <LogIcon className="w-5 h-5"/>, label: 'Log' },
        { id: 'API_MONITOR', icon: <ServerIcon className="w-5 h-5"/>, label: 'API Monitor' },
        { id: 'AUDIT_LOG', icon: <ClipboardIcon className="w-5 h-5"/>, label: 'Audit Log' },
    ];

    return (
        <div className="h-full w-full flex relative">
            <div className={`h-full flex flex-col ${isMissionActive ? 'w-[70%]' : 'w-full'}`}>
                <div className="flex-shrink-0 bg-gray-900/80 border-b border-cyan-500/20 flex">
                    {tabs.map(tab => (
                        <TabButton 
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            isActive={activeTab === tab.id}
                            onClick={() => onTabChange(tab.id)}
                        />
                    ))}
                </div>
                <div className="flex-grow overflow-hidden">
                    {renderContent()}
                </div>
            </div>

            {isMissionActive && (
                <div className="w-[30%] h-full border-l-2 border-cyan-500/30">
                    <MissionControlPanel 
                        missionStatement={props.missionStatement}
                        tasks={props.missionTasks}
                        onConcludeMission={() => onSetMission('')} // Pass empty string to conclude
                    />
                </div>
            )}

            <NodeDetailPanel 
                node={selectedNode}
                onClose={() => onNodeSelectionChange(null)}
                onOpenFile={props.onOpenFileFromNode}
            />
        </div>
    );
};