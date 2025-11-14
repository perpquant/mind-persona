import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MindMapData, ChatMessage, VirtualFileSystem, VectorStore, MonitorAnalysis } from '../types';
import { enqueueGeminiRequest } from './apiQueue';

let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
} catch(e) {
  console.error("Failed to initialize GoogleGenAI for Monitor Service. Make sure API_KEY is set.", e);
}

const monitorSchema = {
    type: 'OBJECT',
    properties: {
        overallAssessment: { 
            type: 'STRING', 
            description: "A concise, high-level summary of the persona agent's current state, performance, and potential."
        },
        suggestions: {
            type: 'ARRAY',
            description: "A list of concrete, actionable suggestions for improvement.",
            items: {
                type: 'OBJECT',
                properties: {
                    area: {
                        type: 'STRING',
                        description: "The area of focus for the suggestion (e.g., 'Knowledge Graph', 'Tool Usage', 'New Capability')."
                    },
                    recommendation: {
                        type: 'STRING',
                        description: "The specific, detailed recommendation."
                    },
                    priority: {
                        type: 'STRING',
                        enum: ['High', 'Medium', 'Low'],
                        description: "The priority level for implementing this suggestion."
                    }
                },
                required: ['area', 'recommendation', 'priority']
            }
        }
    },
    required: ['overallAssessment', 'suggestions']
};

const serializeStateForMonitor = (
    mindMap: MindMapData,
    chatHistory: ChatMessage[],
    vfs: VirtualFileSystem,
    vectorStore: VectorStore
): string => {
    let stateString = "--- KNOWLEDGE GRAPH ---\n";
    stateString += `Nodes: ${mindMap.nodes.length}, Links: ${mindMap.links.length}\n`;
    stateString += JSON.stringify(mindMap.nodes.map(n => ({ id: n.id, name: n.name })), null, 2);

    stateString += "\n\n--- RECENT CONVERSATION (last 10 turns) ---\n";
    stateString += chatHistory.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n');
    
    stateString += "\n\n--- VIRTUAL FILE SYSTEM ---\n";
    stateString += Object.keys(vfs).length > 0 ? Object.keys(vfs).join(', ') : "Empty";

    stateString += "\n\n--- LONG-TERM MEMORY (Vector Store sample) ---\n";
    stateString += vectorStore.length > 0 ? vectorStore.slice(-3).join('\n---\n') : "Empty";

    return stateString;
};


export const getMonitorAgentAnalysis = async (
    modelName: string,
    mindMap: MindMapData,
    chatHistory: ChatMessage[],
    vfs: VirtualFileSystem,
    vectorStore: VectorStore
): Promise<MonitorAnalysis> => {
    if (!ai) throw new Error("Monitor Agent (Gemini AI client) not initialized.");
    const systemInstruction = `You are a highly intelligent System Architect and AI Supervisor. Your role is to analyze the complete operational state of an autonomous persona agent. You will be given a snapshot of its knowledge graph, recent conversations, file system, and memory. Your task is to provide an expert assessment and generate structured, actionable recommendations to enhance the agent's performance, expand its capabilities, or improve its knowledge organization.`;
    
    const prompt = `Analyze the following snapshot of the Persona Agent's state and provide your assessment and recommendations.\n\n${serializeStateForMonitor(mindMap, chatHistory, vfs, vectorStore)}`;
    
    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            systemInstruction, 
            responseMimeType: "application/json", 
            responseSchema: monitorSchema,
            temperature: 0.5,
        },
    };

    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName: 'Monitor Agent',
            model: modelName,
            requestPayload: {
                promptSummary: "Analyze Persona Agent State",
                config: requestPayload.config,
            }
        }
    );

    return JSON.parse(response.text);
}