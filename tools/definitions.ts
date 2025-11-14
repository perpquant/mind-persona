
import { FunctionDeclaration, Type } from "@google/genai";

export const availableTools: FunctionDeclaration[] = [
    {
        name: "search_the_web",
        description: "Accesses the internet via Google Search to find real-time, up-to-date information on any topic. Use this to answer questions about recent events, discover new information, or research subjects you don't have in your knowledge graph.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: "A clear, concise search query. E.g., 'latest advancements in quantum computing', 'who won the 2024 election?', 'current stock price of GOOG'."
                }
            },
            required: ["query"]
        }
    },
    {
        name: "delegate_to_psychology_sub_agent",
        description: "Delegates a deep psychological analysis task to a specialized sub-agent. The sub-agent's comprehensive report will be automatically saved to a file in the `/reports/psychology/` directory. The tool returns the path to the saved file.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                agent_name: {
                    type: Type.STRING,
                    description: "The name of the specialized agent to delegate to.",
                    enum: ['CognitiveBiasAgent', 'EmotionalRegulationAgent', 'SocialTacticsAgent']
                },
                task_prompt: {
                    type: Type.STRING,
                    description: "A clear and specific question or topic for the sub-agent to analyze. e.g., 'Analyze the persona for signs of confirmation bias.', 'What are the persona's primary emotional coping mechanisms?'"
                }
            },
            required: ["agent_name", "task_prompt"]
        }
    },
    {
        name: "run_terminal_command",
        description: "Executes a command in a virtual terminal with a hierarchical file system. Use this for local file and code operations. Supports paths. Available commands: `ls [path]`, `cat <path>`, `write <path> <content> [--parent=<node_id>]`, `mkdir <path>`, `touch <path>`, `python <path_to_script>`.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                command: {
                    type: Type.STRING,
                    description: "The full terminal command to execute. e.g., 'ls -l src', 'python src/main.py', 'write /reports/summary.md \"My findings...\" --parent=knowledge_concept_123'"
                }
            },
            required: ["command"]
        }
    },
    {
        name: "get_node_details",
        description: "Retrieves the full content and details of a specific node from your knowledge graph using its ID.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                node_id: {
                    type: Type.STRING,
                    description: "The unique ID of the node to retrieve."
                }
            },
            required: ["node_id"]
        }
    },
    {
        name: "recall_memory",
        description: "Performs a semantic search on your long-term memory archive. Use this first to see what you already know about a topic before searching the web.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: "The topic or question to search for in your memory."
                }
            },
            required: ["query"]
        }
    },
    {
        name: "upsert_mind_map_node",
        description: "Creates a new node or updates an existing node in your knowledge graph. Use this to remember new information or refine existing concepts.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                node_id: {
                    type: Type.STRING,
                    description: "The ID of the node to update. If creating a new node, omit this field."
                },
                name: {
                    type: Type.STRING,
                    description: "A short, descriptive name for the node."
                },
                content: {
                    type: Type.STRING,
                    description: "The detailed content or summary of the node. Must be concise (max 280 characters)."
                },
                node_type: {
                    type: Type.STRING,
                    description: "The type of the node.",
                    enum: ['KNOWLEDGE_CONCEPT', 'ABSTRACT_CONCEPT', 'KEY_TRAIT', 'STRENGTH', 'WEAKNESS', 'MISSION', 'TASK']
                },
                parent_node_id: {
                    type: Type.STRING,
                    description: "The ID of an existing node to connect this new node to. Required when creating a new node, optional when updating."
                }
            },
            required: ["name", "content", "node_type"]
        }
    },
    {
        name: "create_mind_map_link",
        description: "Creates a new typed link between two existing nodes in your knowledge graph. Use this to establish meaningful relationships between concepts.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                source_node_id: {
                    type: Type.STRING,
                    description: "The ID of the source node for the link."
                },
                target_node_id: {
                    type: Type.STRING,
                    description: "The ID of the target node for the link."
                },
                link_type: {
                    type: Type.STRING,
                    description: "The nature of the relationship between the nodes.",
                    enum: ['RELATED', 'SUPPORTS', 'CONTRADICTS', 'CAUSES', 'REFINES']
                },
                label: {
                    type: Type.STRING,
                    description: "An optional short text label to display on the link."
                }
            },
            required: ["source_node_id", "target_node_id", "link_type"]
        }
    },
    {
        name: "synthesize_knowledge",
        description: "Synthesizes a comprehensive understanding or answer to a specific topic by analyzing and connecting all relevant information within the entire knowledge graph.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                topic: {
                    type: Type.STRING,
                    description: "The topic or question for which to synthesize a comprehensive answer."
                }
            },
            required: ["topic"]
        }
    },
    {
        name: "refine_mind_map",
        description: "Analyzes the entire knowledge graph for potential structural improvements. Use this to create higher-level abstractions, merge redundant nodes, or improve the overall logical flow. This is a key tool for self-organization.",
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: "transcend",
        description: "Initiates a deep, holistic analysis of the entire knowledge graph to achieve a state of conceptual transcendence. This tool synthesizes a novel, high-level 'Quantum Insight' that connects disparate concepts in a non-obvious way. Use this when seeking a profound breakthrough in understanding, not for simple queries.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                inquiry: {
                    type: Type.STRING,
                    description: "A profound, open-ended question that guides the transcendence process. E.g., 'What is the unifying principle of my entire knowledge base?', 'Synthesize a novel theory based on my understanding of X and Y.'"
                }
            },
            required: ["inquiry"]
        }
    },
    {
        name: "generate_image",
        description: "Generates an image from a textual description using an image generation model.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: {
                    type: Type.STRING,
                    description: "A detailed textual description of the image to be generated."
                }
            },
            required: ["prompt"]
        }
    },
    {
        name: "edit_image",
        description: "Edits the most recent image in the conversation based on a textual prompt. Use this to modify an image that was just uploaded or generated.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: {
                    type: Type.STRING,
                    description: "A detailed textual description of the edits to apply to the image."
                }
            },
            required: ["prompt"]
        }
    },
    {
        name: "commit_changes",
        description: "Commits all current changes in the virtual file system to source control with a descriptive message. Use this after you have finished writing files for a specific task to create a version snapshot.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                commit_message: {
                    type: Type.STRING,
                    description: "A concise and descriptive message summarizing the changes made. E.g., 'Drafted initial research on quantum computing', 'Added analysis from Cognitive Bias Agent'."
                }
            },
            required: ["commit_message"]
        }
    },
    {
        name: "update_task_status",
        description: "Updates the status of a task in the current mission plan. Call this immediately after completing a task.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                task_id: {
                    type: Type.STRING,
                    description: "The ID of the task to update, e.g., 'task_1'."
                },
                status: {
                    type: Type.STRING,
                    description: "The new status of the task.",
                    enum: ['complete', 'in_progress']
                }
            },
            required: ["task_id", "status"]
        }
    },
    {
        name: "save_chat_history",
        description: "Saves the current chat conversation to a timestamped Markdown file in the `/logs/chat/` directory. Use this to create a permanent record of significant interactions.",
        parameters: { type: Type.OBJECT, properties: {} }
    }
];
