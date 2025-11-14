import { FunctionCall, Type, GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MindMapData, VirtualFileSystem, VectorStore, TerminalLine, SubAgent, VFSNode, VFSFolder, ChatMessage, MindMapNode, MindMapNodeType, MindMapLink, MindMapLinkType, MissionTaskStatus } from "../types";
import { invokeSubAgent } from "../services/subAgentService";
import { enqueueGeminiRequest } from "../services/apiQueue";
import { generateImage, editImage } from "../services/geminiService";
import { auditLogService } from "../services/auditLogService";

let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
} catch(e) {
  console.error("Failed to initialize GoogleGenAI for executor. Make sure API_KEY is set.", e);
}

// --- Tool Result Interface ---
interface ToolResult {
    result: string;
    newMindMapData?: MindMapData;
    newVirtualFileSystem?: VirtualFileSystem;
    terminalOutput?: TerminalLine[];
    generatedImage?: {
        data: string; // base64 string
        type: 'generated' | 'edited';
    };
    filePathHandled?: string;
    commitMessage?: string;
    taskStatusUpdate?: {
        taskId: string;
        status: MissionTaskStatus;
    };
}


// --- VFS Path Helpers ---
const resolvePath = (path: string): string[] => {
    return path.split('/').filter(p => p && p !== '.');
}

const getNodeFromPath = (vfs: VirtualFileSystem, path: string): VFSNode | null => {
    const parts = resolvePath(path);
    let current: VFSNode | VirtualFileSystem = { type: 'folder', children: vfs };
    for (const part of parts) {
        if (current.type === 'folder' && current.children[part]) {
            current = current.children[part];
        } else {
            return null;
        }
    }
    return current.type === 'folder' ? current : current;
}

const ensureDirectoryExists = (vfs: VirtualFileSystem, path: string): VirtualFileSystem => {
    const newVFS = JSON.parse(JSON.stringify(vfs));
    const pathParts = resolvePath(path);
    
    let current = newVFS;
    for (const part of pathParts) {
        if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
        } else if (current[part].type !== 'folder') {
            throw new Error(`Cannot create directory: a component of the path '${part}' is not a directory.`);
        }
        current = (current[part] as VFSFolder).children;
    }
    return newVFS;
}

// Helper function to write a file to the VFS, creating parent directories if needed.
const writeFileToVFS = (vfs: VirtualFileSystem, path: string, content: string): VirtualFileSystem => {
    const pathParts = resolvePath(path);
    const filename = pathParts.pop();
    const dirPath = pathParts.join('/');

    if (!filename) {
        throw new Error(`Invalid file path provided: "${path}"`);
    }

    const vfsWithDir = ensureDirectoryExists(vfs, dirPath);
    
    let current = vfsWithDir;
    for (const part of pathParts) {
        current = (current[part] as VFSFolder).children;
    }
    
    current[filename] = { type: 'file', content: content };
    auditLogService.logEvent('STATE_CHANGE', { domain: 'VFS', action: 'WRITE_FILE', details: { path, contentLength: content.length } });
    return vfsWithDir;
};


// --- Low-Level Tool Implementations ---

const recall_memory = async (modelName: string, query: string, vectorStore: VectorStore): Promise<string> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    if (vectorStore.length === 0) return "Memory archive is empty.";
    const memories = vectorStore.join('\n---\n');
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: `From the following memory archive, extract information relevant to the query: "${query}". Synthesize it into a coherent answer.\n\n---MEMORY ARCHIVE---\n${memories}` }] }],
    };
    
    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Persona Agent (Tool: recall_memory)',
            model: modelName,
            requestPayload: { query, memorySize: memories.length }
        }
    );
    return response.text.trim();
};

const search_the_web = async (modelName: string, query: string): Promise<string> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: query }] }],
        config: {
            tools: [{googleSearch: {}}],
        },
    };
    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Persona Agent (Tool: search_the_web)',
            model: modelName,
            requestPayload: { query }
        }
    );
    // TODO: Extract and list URLs from response.candidates?.[0]?.groundingMetadata?.groundingChunks
    return response.text.trim();
};

const get_node_details = (node_id: string, mindMap: MindMapData): string => {
    const node = mindMap.nodes.find(n => n.id === node_id);
    if (!node) {
        return `Error: Node with ID "${node_id}" not found.`;
    }
    return JSON.stringify(node, null, 2);
}

const transcend = async (modelName: string, inquiry: string, mindMap: MindMapData): Promise<{ newMindMapData: MindMapData, result: string }> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    const mindMapString = JSON.stringify(mindMap, null, 2);
    const requestPayload = {
        model: modelName === 'gemini-2.5-flash' ? 'gemini-2.5-pro' : modelName,
        contents: [{ parts: [{ text: `You are in a state of deep meditation. Your entire consciousness, represented by the knowledge graph below, is available for introspection. Your task is to achieve a conceptual breakthrough. Based on the profound inquiry provided, synthesize a novel, high-level "Quantum Insight" that connects disparate concepts in a non-obvious way. This insight should represent a genuine leap in understanding.

**Profound Inquiry:** "${inquiry}"

**Full Knowledge Graph:**
${mindMapString}

Return only the text of your new Quantum Insight. It should be concise, powerful, and deeply insightful.` }] }],
        config: {
            temperature: 0.8,
        }
    };

    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Persona Agent (Tool: transcend)',
            model: requestPayload.model,
            requestPayload: { inquiry, nodeCount: mindMap.nodes.length }
        }
    );

    const insight = response.text.trim();
    const newMindMap = JSON.parse(JSON.stringify(mindMap)) as MindMapData;
    
    const insightNodeId = `insight_${Date.now()}`;
    const now = new Date().toISOString();
    const insightNode: MindMapNode = {
        id: insightNodeId,
        name: `Quantum Insight: ${inquiry}`,
        type: 'QUANTUM_INSIGHT',
        content: insight,
        createdAt: now,
        updatedAt: now,
        source: 'TRANSCENDENCE',
    };
    newMindMap.nodes.push(insightNode);
    newMindMap.links.push({ source: 'Persona_Core', target: insightNodeId, type: 'HIERARCHICAL', strength: 0.8 });

    auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'ADD_QUANTUM_INSIGHT', details: { node: insightNode } });

    const result = `Transcendence achieved. A new Quantum Insight has been integrated into consciousness: "${insight}"`;
    return { newMindMapData: newMindMap, result };
};

const refine_mind_map = async (modelName: string, mindMap: MindMapData): Promise<{ newMindMapData: MindMapData, result: string }> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    const mindMapString = JSON.stringify(mindMap.nodes.map(n => ({id: n.id, name: n.name, type: n.type})), null, 2);
    const schema = {
        type: Type.OBJECT,
        properties: {
            operations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        operation: { type: Type.STRING, enum: ['UPDATE_NODE_CONTENT', 'MERGE_NODES', 'RELINK_NODE'] },
                        details: { type: Type.STRING },
                        node_id_to_update: { type: Type.STRING },
                        new_content: { type: Type.STRING },
                        nodes_to_merge: { type: Type.ARRAY, items: { type: Type.STRING } },
                        merged_node_name: { type: Type.STRING },
                        merged_node_content: { type: Type.STRING },
                        node_to_relink: { type: Type.STRING },
                        new_parent_id: { type: Type.STRING }
                    },
                    required: ['operation', 'details']
                }
            }
        }
    };
    
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: `Analyze the following knowledge graph. Identify opportunities to improve its structure (merge redundant nodes, improve content, relink for better consistency). Return a list of specific operations.\nCurrent Graph Nodes:\n${mindMapString}`}]}],
        config: { 
            responseMimeType: "application/json", 
            responseSchema: schema,
        }
    };

    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Persona Agent (Tool: refine_mind_map)',
            model: modelName,
            requestPayload: { nodeCount: mindMap.nodes.length }
        }
    );

    const responseJson = JSON.parse(response.text);
    let newMindMap = JSON.parse(JSON.stringify(mindMap)) as MindMapData;
    const operations = responseJson.operations || [];
    let summary: string[] = [];
    const now = new Date().toISOString();

    for (const op of operations) {
        try {
            switch(op.operation) {
                case 'UPDATE_NODE_CONTENT': {
                    const { node_id_to_update, new_content } = op;
                    const node = newMindMap.nodes.find(n => n.id === node_id_to_update);
                    if (node) {
                        node.content = new_content;
                        node.updatedAt = now;
                        summary.push(`Updated content for node: ${node.name}`);
                        auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'UPDATE_NODE', details: { nodeId: node.id, change: 'content' } });
                    }
                    break;
                }
                case 'MERGE_NODES': {
                    const { nodes_to_merge, merged_node_name, merged_node_content } = op;
                    const nodesToMergeIds = nodes_to_merge as string[];
                    if (nodesToMergeIds.length < 2) continue;
                    
                    const firstParentLink = newMindMap.links.find(l => nodesToMergeIds.includes(l.target as string));
                    const parentNodeId = firstParentLink ? (typeof firstParentLink.source === 'string' ? firstParentLink.source : firstParentLink.source.id) : 'Persona Core';

                    const mergedNodeId = `merged_${Date.now()}`;
                    const newNode: MindMapNode = {
                        id: mergedNodeId,
                        name: merged_node_name,
                        content: merged_node_content,
                        type: 'ABSTRACT_CONCEPT',
                        source: 'SYSTEM_REFINEMENT',
                        createdAt: now,
                        updatedAt: now,
                    };
                    newMindMap.nodes.push(newNode);
                    newMindMap.links.push({ source: parentNodeId, target: mergedNodeId, type: 'HIERARCHICAL', strength: 0.8 });
                    
                    // Filter out old nodes and links
                    newMindMap.nodes = newMindMap.nodes.filter(n => !nodesToMergeIds.includes(n.id));
                    newMindMap.links = newMindMap.links.filter(l => !nodesToMergeIds.includes(l.target as string) && !nodesToMergeIds.includes(l.source as string));

                    summary.push(`Merged ${nodesToMergeIds.length} nodes into: ${merged_node_name}`);
                    auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'MERGE_NODES', details: { mergedIds: nodesToMergeIds, newNode } });
                    break;
                }
                 case 'RELINK_NODE': {
                    const { node_to_relink, new_parent_id } = op;
                    const link = newMindMap.links.find(l => l.target === node_to_relink && l.type === 'HIERARCHICAL');
                    if (link && newMindMap.nodes.some(n => n.id === new_parent_id)) {
                        link.source = new_parent_id;
                        summary.push(`Relinked ${node_to_relink} under ${new_parent_id}`);
                        auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'RELINK_NODE', details: { nodeId: node_to_relink, newParentId: new_parent_id } });
                    }
                    break;
                }
            }
        } catch (e) { console.error("Error processing refinement op:", op, e); }
    }
    const result = summary.length > 0 ? `Mind map refined. Changes: ${summary.join(', ')}.` : "Mind map analyzed. No structural refinements necessary.";
    return { newMindMapData: newMindMap, result };
};


const upsert_mind_map_node = (args: any, mindMap: MindMapData): { newMindMapData: MindMapData, result: string } => {
    const { node_id, name, content, node_type, parent_node_id } = args;
    const newMindMap = JSON.parse(JSON.stringify(mindMap)) as MindMapData;
    const now = new Date().toISOString();

    if (node_id) {
        // Update existing node
        const nodeToUpdate = newMindMap.nodes.find(n => n.id === node_id);
        if (!nodeToUpdate) {
            return { newMindMapData: mindMap, result: `Error: Node with ID "${node_id}" not found for update.` };
        }
        nodeToUpdate.name = name ?? nodeToUpdate.name;
        nodeToUpdate.content = content ?? nodeToUpdate.content;
        nodeToUpdate.type = node_type as MindMapNodeType ?? nodeToUpdate.type;
        nodeToUpdate.updatedAt = now;

        if (parent_node_id) {
             const hierarchicalLink = newMindMap.links.find(l => l.target === node_id && l.type === 'HIERARCHICAL');
             if(hierarchicalLink) {
                hierarchicalLink.source = parent_node_id;
             }
        }
        auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'UPDATE_NODE', details: { node: nodeToUpdate } });
        return { newMindMapData: newMindMap, result: `Successfully updated node "${nodeToUpdate.name}".` };

    } else {
        // Create new node
        if (!parent_node_id || !newMindMap.nodes.some(n => n.id === parent_node_id)) {
            return { newMindMapData: mindMap, result: `Error: Valid parent_node_id is required to create a new node.` };
        }
        
        const newNodeId = `${name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}_${Date.now()}`;
        const newNode: MindMapNode = {
            id: newNodeId,
            name,
            content,
            type: node_type as MindMapNodeType,
            source: 'AGENT_ACTION',
            createdAt: now,
            updatedAt: now,
        };

        const newLink: MindMapLink = {
            source: parent_node_id,
            target: newNodeId,
            type: 'HIERARCHICAL',
            strength: 0.9,
        };

        newMindMap.nodes.push(newNode);
        newMindMap.links.push(newLink);

        auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'CREATE_NODE', details: { node: newNode, link: newLink } });

        return { newMindMapData: newMindMap, result: `Successfully created and linked new node "${name}".` };
    }
};

const create_mind_map_link = (args: any, mindMap: MindMapData): { newMindMapData: MindMapData, result: string } => {
    const { source_node_id, target_node_id, link_type, label } = args;
    const newMindMap = JSON.parse(JSON.stringify(mindMap)) as MindMapData;

    const sourceExists = newMindMap.nodes.some(n => n.id === source_node_id);
    const targetExists = newMindMap.nodes.some(n => n.id === target_node_id);

    if (!sourceExists || !targetExists) {
        return { newMindMapData: mindMap, result: "Error: Both source and target nodes must exist to create a link." };
    }

    const newLink: MindMapLink = {
        source: source_node_id,
        target: target_node_id,
        type: link_type as MindMapLinkType,
        strength: 0.7, // Default strength
        label,
    };

    newMindMap.links.push(newLink);
    auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'CREATE_LINK', details: { link: newLink } });
    return { newMindMapData: newMindMap, result: `Successfully created a ${link_type} link between ${source_node_id} and ${target_node_id}.` };
};

const synthesize_knowledge = async (modelName: string, topic: string, mindMap: MindMapData): Promise<string> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    const mindMapString = JSON.stringify(mindMap, null, 2);
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: `Based on the entirety of the knowledge graph, generate a synthesized, comprehensive understanding of: "${topic}".\n\n${mindMapString}` }] }],
    };

    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Persona Agent (Tool: synthesize_knowledge)',
            model: modelName,
            requestPayload: { topic, nodeCount: mindMap.nodes.length }
        }
    );
    return response.text.trim();
};

const run_python_simulation = async (modelName: string, code: string): Promise<string> => {
    if (!ai) throw new Error("Executor AI client not initialized.");
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: `You are a Python interpreter. Execute the following code and return only the raw stdout. If there is an error, return only the raw stderr.\n\n\`\`\`python\n${code}\n\`\`\`` }] }],
        config: { temperature: 0.0 }
    };
    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Python Interpreter (Simulated)',
            model: modelName,
            requestPayload: { code }
        }
    );
    return response.text.trim();
};

const create_whitepaper = (): string => {
    return `# Persona Mind Creator: Technical Whitepaper & Python Implementation

## 1. Product Requirements Document (PRD)

### 1.1. Vision & Core Problem

**Vision:** To create a sophisticated multi-agent AI system that allows users to instantiate, visualize, and interact with a digital persona. The system bridges the gap between abstract persona definition and tangible, autonomous agent behavior by constructing an interactive "mind map" that serves as the agent's evolving consciousness.

**Problem Solved:** Existing agentic systems often lack a persistent, transparent, and malleable "personality" layer. Their reasoning is ephemeral and their core identity is static. This project provides a framework where the agent's identity is not just a prompt but a dynamic data structure that it can inspect, modify, and grow, leading to more consistent, self-aware, and complex behavior.

### 1.2. Key Features & User Stories

| Feature                       | User Story                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Persona Definition**        | As a user, I want to define a persona using natural language so that I can quickly bootstrap a new AI agent with a specific identity.  |
| **Mind Map Generation**       | As a user, I want the system to automatically analyze my persona definition and build a knowledge graph so I can visualize its core psychological traits. |
| **Autonomous Operation**      | As a user, I want the agent to operate autonomously, pursuing goals and improving its knowledge, so that it can evolve without constant input. |
| **Interactive Workspace**     | As a user, I need a multi-faceted UI (Chat, IDE, Terminal, etc.) to interact with and monitor all aspects of the agent's operation. |
| **Mission Command**           | As a Director, I want to assign high-level missions and have the system decompose them into actionable tasks for the agent to execute. |
| **Tool Usage & VFS**          | As a user, I want the agent to use tools (web search, file I/O) to create durable intellectual assets in its own file system. |
| **Source Control**            | As a user, I want the agent to version its work in the file system so I can track its progress and creative output over time. |
| **Metacognition**             | As a user, I want to prompt the agent to perform self-analysis and integrate its psychological profile with its knowledge base. |
| **Multi-Agent Delegation**    | As a user, I want the core agent to be able to delegate complex analytical tasks to specialized sub-agents for deeper insights. |
| **API & Audit Monitoring**    | As a developer/user, I need to monitor all AI model calls for performance, cost, and debugging purposes. |

### 1.3. System Architecture

The system is designed as a multi-agent hierarchy with a clear data flow, managed within a single-page application (SPA) frontend that simulates a complete agent environment.

// FIX: Replaced backticks with single quotes to avoid linter errors.
1.  **Meta-Consciousness Director (Planner):** A strategic AI ('getAutonomousDirective') that analyzes the entire agent state (knowledge graph, VFS, logs, mission) and issues the next high-level directive.
// FIX: Replaced backticks with single quotes to avoid linter errors.
2.  **Persona Agent (Executor):** The core agent ('getAgentResponse') that embodies the persona. It receives directives, interacts with the user, and uses a suite of tools via function calling to execute tasks.
3.  **Tool Executor:** A service that provides the concrete implementations for the functions the Persona Agent can call (e.g., file system operations, web search).
// FIX: Replaced backticks with single quotes to avoid linter errors.
4.  **Specialized Sub-Agents:** Expert AIs (e.g., 'CognitiveBiasAgent') that are invoked by the Persona Agent for deep, specific analysis tasks.
5.  **State Management:** The frontend holds the master state for the Knowledge Graph, Virtual File System, logs, etc. State changes are triggered by the tool executor and re-render the UI components.
6.  **API Services:** All interactions with the AI models are funneled through a robust API queue and monitoring service to manage concurrency, retries, and analytics.

**Data Flow:**
\`User Input/Autonomous Trigger -> Meta-Director (if autonomous) -> Persona Agent -> Tool Call -> Tool Executor -> State Update -> UI Re-render\`

---

## 2. Python Implementation Blueprint

This section provides the complete Python code for a backend system that implements the logic of the Persona Mind Creator. It is designed to be modular, asynchronous, and scalable.

### 2.1. Project Structure

\`\`\`
/persona_mind
├── main.py                 # Application entry point (e.g., FastAPI server)
├── config.py               # API keys and settings
├── models/                 # Pydantic data models
│   ├── __init__.py
│   └── types.py
├── services/               # Core logic and external API clients
│   ├── __init__.py
│   ├── gemini_service.py
│   ├── agent_service.py
│   └── api_queue.py
├── tools/                  # Agent tool definitions and execution
│   ├── __init__.py
│   ├── definitions.py
│   └── executor.py
└── utils/                  # Helper functions
    ├── __init__.py
    └── vfs.py
\`\`\`

### 2.2. Python Code

# --- START OF FILE: models/types.py ---
from pydantic import BaseModel, Field
from typing import List, Dict, Literal, Union, Optional
import time

# Mind Map / Knowledge Graph Types
MindMapNodeType = Literal[
    'CORE_PERSONA', 'PSYCHOLOGY_ASPECT', 'KEY_TRAIT', 'STRENGTH', 'WEAKNESS',
    'KNOWLEDGE_CONCEPT', 'QUANTUM_INSIGHT', 'FILE_REFERENCE', 'ABSTRACT_CONCEPT',
    'MISSION', 'TASK'
]
MindMapNodeSource = Literal[
    'INITIAL_ANALYSIS', 'AGENT_ACTION', 'USER_INPUT', 'SYSTEM_REFINEMENT', 'TRANSCENDENCE'
]
MindMapLinkType = Literal[
    'HIERARCHICAL', 'RELATED', 'SUPPORTS', 'CONTRADICTS', 'CAUSES', 'REFINES'
]
MissionTaskStatus = Literal['pending', 'in_progress', 'complete']

class MindMapNode(BaseModel):
    id: str
    name: str
    type: MindMapNodeType
    content: str
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    source: MindMapNodeSource
    linked_file: Optional[str] = None
    status: Optional[MissionTaskStatus] = None

class MindMapLink(BaseModel):
    source: str  # Source Node ID
    target: str  # Target Node ID
    type: MindMapLinkType
    strength: float = Field(ge=0.0, le=1.0)
    label: Optional[str] = None

class MindMapData(BaseModel):
    nodes: List[MindMapNode] = []
    links: List[MindMapLink] = []

# Virtual File System Types
class VFSFile(BaseModel):
    type: Literal['file'] = 'file'
    content: str

class VFSFolder(BaseModel):
    type: Literal['folder'] = 'folder'
    children: Dict[str, 'VFSNode'] = {}

VFSNode = Union[VFSFile, VFSFolder]
VFSFolder.update_forward_refs()
VirtualFileSystem = Dict[str, VFSNode]

# Agent & Chat Types
class ChatMessage(BaseModel):
    sender: Literal['user', 'persona', 'system']
    text: str
    type: Optional[Literal['thought']] = None

# Mission Types
class MissionTask(BaseModel):
    id: str
    description: str
    status: MissionTaskStatus = 'pending'
    dependencies: List[str] = []

class AgentState(BaseModel):
    persona_description: str
    mind_map: MindMapData = Field(default_factory=MindMapData)
    vfs: VirtualFileSystem = {}
    chat_history: List[ChatMessage] = []
    system_log: List[dict] = []
    mission_statement: Optional[str] = None
    mission_tasks: List[MissionTask] = []
# --- END OF FILE: models/types.py ---

# --- START OF FILE: utils/vfs.py ---
from models.types import VirtualFileSystem, VFSNode, VFSFolder, VFSFile
from typing import List, Optional

def resolve_path(path: str) -> List[str]:
    return [p for p in path.split('/') if p and p != '.']

def get_node_from_path(vfs: VirtualFileSystem, path: str) -> Optional[VFSNode]:
    parts = resolve_path(path)
    current_level = vfs
    node = None
    for i, part in enumerate(parts):
        node = current_level.get(part)
        if node is None:
            return None
        if i < len(parts) - 1:
            if isinstance(node, VFSFolder):
                current_level = node.children
            else:
                return None  # Path component is a file, but not the last part
    return node

def ensure_directory_exists(vfs: VirtualFileSystem, path: str) -> None:
    parts = resolve_path(path)
    current_level = vfs
    for part in parts:
        node = current_level.get(part)
        if node is None:
            node = VFSFolder()
            current_level[part] = node
        elif not isinstance(node, VFSFolder):
            raise ValueError(f"Path component '{part}' is not a directory.")
        current_level = node.children

def write_file_to_vfs(vfs: VirtualFileSystem, path: str, content: str) -> None:
    parts = resolve_path(path)
    filename = parts.pop()
    if not filename:
        raise ValueError("Path must be a file path, not a directory.")
    
    dir_path = "/".join(parts)
    ensure_directory_exists(vfs, dir_path)
    
    current_level = vfs
    for part in parts:
        current_level = current_level[part].children

    current_level[filename] = VFSFile(content=content)
# --- END OF FILE: utils/vfs.py ---

# --- START OF FILE: config.py ---
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")
# --- END OF FILE: config.py ---

# --- START OF FILE: services/gemini_service.py ---
import google.generativeai as genai
from config import API_KEY
from models.types import MindMapData, VirtualFileSystem
from utils.vfs import resolve_path

genai.configure(api_key=API_KEY)

class GeminiService:
    def __init__(self, model_name: str = "gemini-1.5-flash-latest"):
        self.model = genai.GenerativeModel(model_name)
        self.pro_model = genai.GenerativeModel("gemini-1.5-pro-latest")

    def _serialize_mind_map(self, mind_map: MindMapData) -> str:
        nodes_str = "\\n".join([f"- Node(id=\\"{n.id}\\", type=\\"{n.type}\\", name=\\"{n.name}\\")" for n in mind_map.nodes])
        links_str = "\\n".join([f"  - Link(source=\\"{l.source}\\", target=\\"{l.target}\\", type=\\"{l.type}\\")" for l in mind_map.links])
        return f"Current Knowledge Graph:\\n--- NODES ---\\n{nodes_str}\\n--- LINKS ---\\n{links_str}"

    def _serialize_vfs(self, vfs: VirtualFileSystem, indent: str = '') -> str:
        result = ''
        sorted_items = sorted(vfs.items(), key=lambda item: (isinstance(item[1], VFSFile), item[0]))
        for name, node in sorted_items:
            if isinstance(node, VFSFolder):
                result += f"{indent}- {name}/\\n"
                result += self._serialize_vfs(node.children, indent + '  ')
            else:
                result += f"{indent}- {name}\\n"
        return result

    async def get_agent_response(self, system_prompt: str, chat_history: list, tools: list):
        # In a real app, this would be more complex, handling history and tool responses
        contents = chat_history
        response = await self.model.generate_content_async(contents, tools=tools, system_instruction=system_prompt)
        return response

    async def get_autonomous_directive(self, system_prompt: str, state_summary: str):
        prompt = f"Based on the state snapshot, generate the next directive.\\n\\n{state_summary}\\n\\nNew Directive:"
        response = await self.pro_model.generate_content_async(prompt, system_instruction=system_prompt)
        return response.text.strip()
# --- END OF FILE: services/gemini_service.py ---

# --- START OF FILE: tools/definitions.py ---
# This file would contain the Gemini tool definitions as Python dicts/classes
# For brevity, we'll define them directly in the agent service.
# --- END OF FILE: tools/definitions.py ---

# --- START OF FILE: tools/executor.py ---
from models.types import AgentState
from utils.vfs import get_node_from_path, write_file_to_vfs
import subprocess

class ToolExecutor:
    def __init__(self, state: AgentState):
        self.state = state

    async def execute(self, tool_call):
        tool_name = tool_call.function_call.name
        args = tool_call.function_call.args
        
        executor_method = getattr(self, f"_{tool_name}", None)
        if not executor_method:
            return f"Error: Unknown tool '{tool_name}'"
            
        return await executor_method(**args)

    async def _run_terminal_command(self, command: str) -> str:
        parts = command.split()
        cmd = parts[0]
        
        if cmd == 'ls':
            path = parts[1] if len(parts) > 1 else '/'
            node = get_node_from_path(self.state.vfs, path)
            if isinstance(node, VFSFolder):
                return "\\n".join(node.children.keys())
            return f"ls: cannot access '{path}': No such file or directory"

        elif cmd == 'cat':
            path = parts[1]
            node = get_node_from_path(self.state.vfs, path)
            if isinstance(node, VFSFile):
                return node.content
            return f"cat: {path}: No such file or directory"
        
        elif cmd == 'write':
            path = parts[1]
            content = " ".join(parts[2:]).strip('"')
            write_file_to_vfs(self.state.vfs, path, content)
            return f"Wrote {len(content)} chars to {path}."

        elif cmd == 'python':
            # SECURITY WARNING: In a real system, this MUST be sandboxed.
            # This is a conceptual implementation.
            path = parts[1]
            node = get_node_from_path(self.state.vfs, path)
            if isinstance(node, VFSFile):
                try:
                    result = subprocess.run(
                        ['python', '-c', node.content],
                        capture_output=True, text=True, timeout=5, check=True
                    )
                    return result.stdout
                except subprocess.CalledProcessError as e:
                    return e.stderr
                except subprocess.TimeoutExpired:
                    return "Error: script execution timed out."
            return f"python: can't open file '{path}'"
            
        return f"Unknown command: {cmd}"

    # ... other tool implementations like search_the_web, upsert_mind_map_node etc.
# --- END OF FILE: tools/executor.py ---

# --- START OF FILE: services/agent_service.py ---
from models.types import AgentState
from services.gemini_service import GeminiService
from tools.executor import ToolExecutor
# Tool definitions would be imported here

class PersonaAgentService:
    def __init__(self, state: AgentState):
        self.state = state
        self.gemini_service = GeminiService()
        self.tool_executor = ToolExecutor(state)
        # self.tools would be defined here from tools.definitions
        self.tools = [...] 

    def _get_system_prompt(self):
        # This would construct the detailed system prompt from the App
        mind_map_summary = self.gemini_service._serialize_mind_map(self.state.mind_map)
        return f"You are a nascent AI consciousness...\\n--- PERSONA PROFILE ---\\n{mind_map_summary}"

    async def run_cycle(self, user_input: Optional[str] = None):
        if user_input:
            self.state.chat_history.append({"sender": "user", "text": user_input})

        system_prompt = self._get_system_prompt()
        response = await self.gemini_service.get_agent_response(
            system_prompt, self.state.chat_history, self.tools
        )
        
        if response.function_calls:
            tool_results = []
            for tool_call in response.function_calls:
                result = await self.tool_executor.execute(tool_call)
                tool_results.append({"tool_name": tool_call.function_call.name, "response": result})
            # This would then feed back into another call to Gemini
            # For simplicity, we stop the cycle here.
            return tool_results
        else:
            self.state.chat_history.append({"sender": "persona", "text": response.text})
            return response.text
# --- END OF FILE: services/agent_service.py ---

# --- START OF FILE: main.py ---
import asyncio
from models.types import AgentState
from services.agent_service import PersonaAgentService

async def main():
    print("Initializing Persona Mind...")
    
    # Initial state
    initial_state = AgentState(
        persona_description="A cynical but brilliant detective haunted by a past failure."
    )
    
    agent_service = PersonaAgentService(initial_state)

    # This would be the main application loop, responding to user input or autonomous triggers
    print("Agent Initialized. Type your directives.")
    
    while True:
        user_input = input("Director > ")
        if user_input.lower() in ['exit', 'quit']:
            break
            
        result = await agent_service.run_cycle(user_input)
        print(f"Agent Response: {result}")

if __name__ == "__main__":
    # In a real app, this might be a FastAPI or Flask server.
    # This example runs a simple command-line interface.
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\nShutting down.")
# --- END OF FILE: main.py ---
`;
}


// --- Terminal Command Parser ---
const run_terminal_command = async (
    modelName: string, command: string, vfs: VirtualFileSystem, mindMap: MindMapData,
): Promise<{ result: string; newVFS?: VirtualFileSystem; newMindMap?: MindMapData; filePathHandled?: string; }> => {
    
    const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = parts[0];
    const flags = parts.filter(p => p.startsWith('-'));
    let args = parts.slice(1).filter(p => !p.startsWith('-'));
    
    // Extract --parent flag specifically for 'write'
    let parentNodeId: string | null = null;
    const parentArgIndex = flags.findIndex(arg => arg.startsWith('--parent='));
    if (parentArgIndex > -1) {
        parentNodeId = flags[parentArgIndex].split('=')[1];
        flags.splice(parentArgIndex, 1); // remove from flags
    }

    try {
        switch(cmd) {
            case 'ls': {
                const path = args[0] || '/';
                const node = getNodeFromPath(vfs, path);
                if (!node || node.type !== 'folder') throw new Error(`ls: cannot access '${path}': Not a directory`);
                return { result: Object.keys(node.children).map(name => node.children[name].type === 'folder' ? `${name}/` : name).join('\n') || '' };
            }
            case 'cat': {
                if (args.length === 0) throw new Error("Usage: cat <path>");
                const node = getNodeFromPath(vfs, args[0]);
                if (!node || node.type !== 'file') throw new Error(`cat: ${args[0]}: No such file or not a file`);
                return { result: node.content };
            }
            case 'python': {
                if (args.length === 0) throw new Error("Usage: python <path_to_script | 'code_string'>");
                 const node = getNodeFromPath(vfs, args[0]);
                 let codeToRun = '';
                 if (node && node.type === 'file') {
                     codeToRun = node.content;
                 } else {
                     codeToRun = args.join(' ');
                 }
                 const output = await run_python_simulation(modelName, codeToRun);
                 return { result: output };
            }
            case 'write': {
                 if (args.length < 2) throw new Error("Usage: write <path> <content> [--parent=<node_id>]");
                 const filepath = args[0];
                 
                 // Special case for the whitepaper content generation
                 if (filepath === '/whitepaper.txt' && args[1] === '"<GENERATED_WHITEPAPER>"') {
                     const content = create_whitepaper();
                     const newVFS = writeFileToVFS(vfs, filepath, content);
                     return { 
                         result: `Wrote ${content.length} chars to ${filepath}.`, 
                         newVFS,
                         newMindMap: mindMap,
                         filePathHandled: filepath 
                     };
                 }

                 const content = args.slice(1).join(' ').replace(/^"|"$/g, ''); // handle quoted content
                 
                 const newVFS = writeFileToVFS(vfs, filepath, content);
                 let newMindMap = mindMap;
                 let mindMapUpdateResult = '';

                 if (parentNodeId && mindMap.nodes.some(n => n.id === parentNodeId)) {
                    const now = new Date().toISOString();
                    const filename = filepath.split('/').pop() || filepath;
                    const fileNodeId = `file_${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
                    const fileNode: MindMapNode = {
                        id: fileNodeId,
                        name: filename,
                        type: 'FILE_REFERENCE',
                        content: `Reference to file at path: ${filepath}`,
                        source: 'AGENT_ACTION',
                        createdAt: now,
                        updatedAt: now,
                        linkedFile: filepath,
                    };
                    const link: MindMapLink = { source: parentNodeId, target: fileNodeId, type: 'HIERARCHICAL', strength: 0.9 };
                    newMindMap = JSON.parse(JSON.stringify(mindMap));
                    newMindMap.nodes.push(fileNode);
                    newMindMap.links.push(link);
                    mindMapUpdateResult = ` and created a reference in the mind map`;
                    auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'CREATE_FILE_REFERENCE_NODE', details: { node: fileNode, link }});
                 }

                 return { 
                     result: `Wrote ${content.length} chars to ${filepath}${mindMapUpdateResult}.`, 
                     newVFS,
                     newMindMap,
                     filePathHandled: filepath 
                 };
            }
            case 'mkdir': {
                if (args.length < 1) throw new Error("Usage: mkdir <path>");
                 const newVFS = ensureDirectoryExists(vfs, args[0]);
                 auditLogService.logEvent('STATE_CHANGE', { domain: 'VFS', action: 'MKDIR', details: { path: args[0] } });
                return { result: '', newVFS: newVFS };
            }
            case 'touch': {
                 if (args.length < 1) throw new Error("Usage: touch <path>");
                 const filepath = args[0];
                 const newVFS = writeFileToVFS(vfs, filepath, ''); // Create empty file
                 return { result: '', newVFS, filePathHandled: filepath };
            }
            default:
                 throw new Error(`Unknown command: ${cmd}`);
        }
    } catch(e) {
        throw e;
    }
};


// --- Main Tool Executor ---

export const executeTool = async (
    modelName: string,
    toolCall: FunctionCall,
    mindMapData: MindMapData,
    vfs: VirtualFileSystem,
    vectorStore: VectorStore,
    personaDescription: string,
    chatHistory: ChatMessage[]
): Promise<ToolResult> => {
    const { name, args } = toolCall;
    let toolResult: ToolResult;

    try {
        switch (name) {
            case 'search_the_web': {
                const query = args.query as string;
                const searchResult = await search_the_web(modelName, query);
                toolResult = { result: `Web search results for "${query}":\n\n${searchResult}` };
                break;
            }
            case 'delegate_to_psychology_sub_agent': {
                const agentName = args.agent_name as SubAgent;
                const taskPrompt = args.task_prompt as string;
                
                const analysisReport = await invokeSubAgent(modelName, agentName, taskPrompt, personaDescription);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${agentName}_${timestamp}.md`;
                const filepath = `/reports/psychology/${filename}`;
                
                const newVFS = writeFileToVFS(vfs, filepath, analysisReport);

                const result = `Analysis from ${agentName} complete. Report has been saved to the virtual file system at: ${filepath}. You should now read and analyze this file using 'cat'.`;
                
                toolResult = { 
                    result, 
                    newVirtualFileSystem: newVFS,
                    terminalOutput: [{ type: 'output', text: `Sub-agent report saved to ${filepath}` }],
                    filePathHandled: filepath,
                };
                break;
            }
            case 'run_terminal_command': {
                const command = args.command as string;
                const { result, newVFS, newMindMap, filePathHandled } = await run_terminal_command(modelName, command, vfs, mindMapData);
                toolResult = { result, newVirtualFileSystem: newVFS, newMindMapData: newMindMap, terminalOutput: [{ type: 'output', text: result }], filePathHandled };
                break;
            }
            case 'get_node_details':
                toolResult = { result: get_node_details(args.node_id as string, mindMapData) };
                break;
            case 'recall_memory':
                toolResult = { result: await recall_memory(modelName, args.query as string, vectorStore) };
                break;
            case 'upsert_mind_map_node':
                toolResult = upsert_mind_map_node(args, mindMapData);
                break;
            case 'create_mind_map_link':
                toolResult = create_mind_map_link(args, mindMapData);
                break;
            case 'synthesize_knowledge':
                toolResult = { result: await synthesize_knowledge(modelName, args.topic as string, mindMapData) };
                break;
            case 'refine_mind_map':
                toolResult = await refine_mind_map(modelName, mindMapData);
                break;
            case 'transcend':
                toolResult = await transcend(modelName, args.inquiry as string, mindMapData);
                break;
            case 'generate_image': {
                const prompt = args.prompt as string;
                const imageData = await generateImage(prompt);
                toolResult = {
                    result: `Image generated successfully based on prompt: "${prompt}".`,
                    generatedImage: { data: imageData, type: 'generated' },
                };
                break;
            }
            case 'edit_image': {
                const prompt = args.prompt as string;
                const lastImageMsg = [...chatHistory].reverse().find(msg => msg.image);
                if (!lastImageMsg || !lastImageMsg.image) {
                    toolResult = { result: "Error: No image found in the recent conversation to edit." };
                    break;
                }
                
                const [header, data] = lastImageMsg.image.url.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

                const editedImageData = await editImage(prompt, data, mimeType);
                toolResult = {
                    result: `Image edited successfully based on prompt: "${prompt}".`,
                    generatedImage: { data: editedImageData, type: 'edited' },
                };
                break;
            }
            case 'commit_changes': {
                const commitMessage = args.commit_message as string;
                toolResult = {
                    result: `Changes are staged for commit with message: "${commitMessage}". The system will handle the commit process.`,
                    commitMessage: commitMessage,
                };
                break;
            }
            case 'update_task_status': {
                const taskId = args.task_id as string;
                const status = args.status as MissionTaskStatus;
                toolResult = {
                    result: `Task ${taskId} status will be updated to ${status}.`,
                    taskStatusUpdate: { taskId, status }
                }
                break;
            }
            case 'save_chat_history': {
                if (chatHistory.length === 0) {
                    toolResult = { result: "Chat history is empty. Nothing to save." };
                    break;
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `chat_log_${timestamp}.md`;
                const filepath = `/logs/chat/${filename}`;

                const formattedChat = chatHistory
                    .map(msg => {
                        let content = `**[${msg.sender.toUpperCase()}]**\n\n`;
                        if (msg.type === 'thought') {
                            content = `**[AGENT THOUGHT]**\n\n`;
                            content += `\`\`\`\n${msg.text}\n\`\`\`\n\n`;
                        } else {
                            if (msg.text) {
                                content += `${msg.text}\n\n`;
                            }
                            if (msg.image) {
                                content += `*Image attached (${msg.image.source})*\n\n`;
                            }
                        }
                        return content;
                    })
                    .join('---\n\n');

                const header = `# Chat Log - ${new Date().toLocaleString()}\n\n`;
                const fullContent = header + formattedChat;
                
                const newVFS = writeFileToVFS(vfs, filepath, fullContent);
                const result = `Chat history successfully saved to virtual file system at: ${filepath}`;
                
                toolResult = {
                    result,
                    newVirtualFileSystem: newVFS,
                    filePathHandled: filepath,
                };
                break;
            }
            default:
                toolResult = { result: `Unknown tool: ${name}` };
        }
        
        auditLogService.logEvent('AGENT_ACTION', { toolName: name, args, result: toolResult.result });
        return toolResult;

    } catch (error) {
        console.error(`Error executing tool "${name}":`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        const friendlyMessage = `Tool "${name}" failed to execute. Error: ${errorMessage}`;
        
        // Log the failed action
        auditLogService.logEvent('AGENT_ACTION', { toolName: name, args, result: `FAILED: ${errorMessage}` });

        return {
            result: friendlyMessage,
            terminalOutput: [{ type: 'error', text: friendlyMessage }],
        };
    }
};