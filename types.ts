import type * as d3 from 'd3';

// NEW: Descriptive types for nodes and links
export type MindMapNodeType =
  | 'CORE_PERSONA'
  | 'PSYCHOLOGY_ASPECT'
  | 'KEY_TRAIT'
  | 'STRENGTH'
  | 'WEAKNESS'
  | 'KNOWLEDGE_CONCEPT'
  | 'QUANTUM_INSIGHT'
  | 'FILE_REFERENCE'
  | 'ABSTRACT_CONCEPT'
  | 'MISSION'
  | 'TASK';

export type MindMapNodeSource =
  | 'INITIAL_ANALYSIS'
  | 'AGENT_ACTION'
  | 'USER_INPUT'
  | 'SYSTEM_REFINEMENT'
  | 'TRANSCENDENCE';

export type MindMapLinkType =
  | 'HIERARCHICAL' // Parent-child
  | 'RELATED'      // General connection
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'CAUSES'
  | 'REFINES';

export type MissionTaskStatus = 'pending' | 'in_progress' | 'complete';


// UPDATED: Replaced GraphNode with the more descriptive MindMapNode
export interface MindMapNode extends d3.SimulationNodeDatum {
  id: string;
  name: string; // A short, display-friendly name or title
  type: MindMapNodeType;
  content: string; // A more detailed description or summary
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  source: MindMapNodeSource;
  linkedFile?: string; // Optional path to a file in the VFS
  status?: MissionTaskStatus; // For 'TASK' nodes
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// UPDATED: Replaced GraphLink with the more descriptive MindMapLink
export interface MindMapLink extends d3.SimulationLinkDatum<MindMapNode> {
  source: string | MindMapNode;
  target: string | MindMapNode;
  type: MindMapLinkType;
  strength: number; // 0.0 to 1.0
  label?: string; // Optional display label for the link
}

// UPDATED: Uses the new Node and Link types
export interface MindMapData {
  nodes: MindMapNode[];
  links: MindMapLink[];
}


export interface AnalysisAspect {
  name:string;
  prompt: string;
}

export interface GeminiAnalysisResponse {
  summary: string;
  keyTraits: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ChatMessage {
  sender: 'user' | 'persona' | 'system';
  text: string;
  type?: 'thought';
  image?: {
    url: string; // base64 data URL
    source: 'upload' | 'generated' | 'edited';
  };
}

// --- Hierarchical File System ---
export interface VFSFile {
  type: 'file';
  content: string;
}

export interface VFSFolder {
  type: 'folder';
  children: VirtualFileSystem;
}

export type VFSNode = VFSFile | VFSFolder;
export type VirtualFileSystem = Record<string, VFSNode>;
// --- End Hierarchical File System ---

export type VectorStore = string[];

export interface TerminalLine {
    type: 'input' | 'output' | 'error';
    text: string;
}

export interface MonitorSuggestion {
  area: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface MonitorAnalysis {
  overallAssessment: string;
  suggestions: MonitorSuggestion[];
}

export interface SystemLogEntry {
  timestamp: string;
  directive: string;
  finding: string;
  upgrades: string[];
}

export type SubAgent = 'CognitiveBiasAgent' | 'EmotionalRegulationAgent' | 'SocialTacticsAgent';

// --- Source Control Types ---
export interface Commit {
  id: string;
  message: string;
  timestamp: string;
}

export interface VFSChange {
  path: string;
  status: 'new' | 'modified' | 'deleted';
}

// --- API Monitoring Types ---
export interface ApiCallLog {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'Pending' | 'Processing' | 'Success' | 'Failed' | 'Retrying';
  agentName: string;
  model: string;
  requestPayload: any;
  responsePayload?: any;
  error?: string;
  duration?: number;
  // New fields for advanced monitoring
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
}

// --- Mission Control Types ---
export interface MissionTask {
  id: string;
  description: string;
  status: MissionTaskStatus;
  dependencies: string[];
}

// --- UI Types ---
export type Tab = 'MIND_MAP' | 'IDE' | 'TERMINAL' | 'LOG' | 'SOURCE_CONTROL' | 'API_MONITOR' | 'AUDIT_LOG' | 'CHAT';

// --- Audit Log Types ---
export type AuditEventType = 'API_CALL' | 'AGENT_ACTION' | 'STATE_CHANGE' | 'SYSTEM_EVENT' | 'USER_INTERACTION';

export type AuditLogPayload = 
  | { type: 'API_CALL'; data: ApiCallLog }
  | { type: 'AGENT_ACTION'; data: { toolName: string; args: any; result: any; } }
  | { type: 'STATE_CHANGE'; data: { domain: 'MIND_MAP' | 'VFS' | 'COMMIT'; action: string; details: any; } }
  | { type: 'SYSTEM_EVENT'; data: { event: string; details?: any; } }
  | { type: 'USER_INTERACTION'; data: { action: string; details?: any; } };

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  type: AuditEventType;
  payload: AuditLogPayload['data'];
}