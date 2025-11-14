import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SubAgent } from "../types";
import { enqueueGeminiRequest } from './apiQueue';

let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
} catch(e) {
  console.error("Failed to initialize GoogleGenAI for Sub-agent Service. Make sure API_KEY is set.", e);
}

const getSubAgentSystemPrompt = (agentName: SubAgent): string => {
    switch(agentName) {
        case 'CognitiveBiasAgent':
            return "You are an expert psychologist specializing in cognitive biases. Your task is to analyze a given persona and a specific query to identify relevant cognitive biases at play. Provide a detailed, evidence-based analysis. Your final output must be a well-structured report in Markdown format, suitable for being saved as a file. Start with a title, a summary, and then use headings for each bias identified.";
        case 'EmotionalRegulationAgent':
            return "You are an expert therapist specializing in emotional regulation. Your task is to analyze a given persona and a specific query to understand their emotional patterns, triggers, and coping mechanisms. Provide a compassionate yet clinical analysis. Your final output must be a well-structured report in Markdown format, suitable for being saved as a file. Use headings for different sections like 'Emotional Triggers', 'Regulation Strategies', and 'Overall Assessment'.";
        case 'SocialTacticsAgent':
            return "You are a master strategist and social scientist specializing in social dynamics and manipulation. Your task is to analyze a given persona and a specific query to identify their methods of influence, persuasion techniques, and social maneuvering. Provide a neutral, objective breakdown. Your final output must be a well-structured report in Markdown format, suitable for being saved as a file. Use headings to categorize different tactics and strategies observed.";
        default:
            return "You are a helpful AI assistant tasked with writing a detailed report. Your final output must be a well-structured report in Markdown format.";
    }
}

export const invokeSubAgent = async (
    modelName: string,
    agentName: SubAgent,
    taskPrompt: string,
    personaContext: string
): Promise<string> => {
    if (!ai) throw new Error(`Sub-agent ${agentName} (Gemini AI client) not initialized.`);
    const systemInstruction = getSubAgentSystemPrompt(agentName);
    const finalPrompt = `**Persona Context:**\n"${personaContext}"\n\n**Analysis Task:**\n${taskPrompt}`;

    const requestPayload = {
        model: modelName,
        contents: [{ parts: [{ text: finalPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0.6,
        }
    };

    const response = await enqueueGeminiRequest<GenerateContentResponse>(
        (payload) => ai.models.generateContent(payload),
        requestPayload,
        {
            agentName,
            model: modelName,
            requestPayload: {
                task: taskPrompt,
                personaContext: '...', // Truncate for brevity
                config: requestPayload.config,
            }
        }
    );

    return response.text.trim();
};