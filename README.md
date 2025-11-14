
# Persona Mind Creator: Deep Psychology Department

**A multi-agent AI system where a core persona agent collaborates with specialized agents to perform deep psychological analysis, building and refining an interactive mind map of its own evolving consciousness.**

This application provides a sophisticated environment for creating, visualizing, and interacting with a digital persona. By providing a simple natural language description, users can initiate a complex process where multiple AI agents work together to construct a detailed psychological profile, represented as an interactive knowledge graph. The persona then becomes an autonomous agent capable of learning, reasoning, and creating within its simulated workspace.

---

## ✨ Core Features

*   **Persona Definition**: Kickstart the process by defining a persona in a simple text area (e.g., "A cynical but brilliant detective haunted by a past failure...").
*   **Directorate & Mission Command**: Set high-level missions for the agent (e.g., "Research topic X and produce a technical report"). The system will automatically decompose the mission into a step-by-step plan for the agent to execute.
*   **Automated Mind Map Generation**: AI agents analyze the persona from various psychological angles (Emotional Core, Cognitive Profile, etc.) and automatically construct an interactive knowledge graph using D3.js.
*   **Multi-Agent System**: The application uses a "team" of specialized AI agents, each with a distinct role:
    *   **Core Persona Agent**: The central agent that embodies the persona, interacts with the user, and uses tools to learn and grow.
    *   **System Monitor Agent**: A supervisor agent that analyzes the Core Agent's performance and provides actionable feedback for improvement.
    *   **Psychology Sub-Agents**: Expert agents for deep analysis in specific domains like Cognitive Biases, Emotional Regulation, and Social Tactics.
*   **Autonomous Operation**: Once created, the agent can operate autonomously, executing its mission plan, identifying knowledge gaps, and seeking new information to continuously refine its mind map and create new content in its file system.
*   **Interactive Workspace**: A rich, multi-tabbed interface for deep interaction:
    *   **Mind Map**: Visualize the persona's knowledge graph, including active missions and tasks.
    *   **Mission Control**: A dashboard to monitor the agent's real-time progress against its current mission objectives.
    *   **Chat**: Converse directly with the persona agent.
    *   **Cognitive IDE**: A full-featured code editor (Monaco) to view and edit the agent's virtual file system.
    *   **Terminal**: A virtual terminal for the agent to execute commands (`ls`, `cat`, `write`, `python`, etc.).
    *   **Source Control**: A Git-like system to track changes to the agent's file system and commit them with messages.
    *   **System Log**: A log of all system directives and the agent's high-level findings.
*   **Advanced Metacognition**: Users can trigger the agent to perform self-audits, integrate its psychological profile with its domain knowledge, and refine its own mind map structure.
*   **Configurable AI Model**: Seamlessly switch between **Gemini 2.5 Flash** (for speed and efficiency) and **Gemini 2.5 Pro** (for complex reasoning) to power all agents.

---

## 🚀 How It Works

1.  **Initialization**: The user provides a persona description and selects a base AI model.
2.  **Analysis & Generation**: The application creates a queue of analysis tasks, one for each psychological "department." It calls the Gemini API for each aspect, requesting a structured JSON output containing traits, strengths, and weaknesses.
3.  **Mind Map Construction**: The structured results are used to build the initial nodes and links of the persona's mind map.
4.  **Mission Assignment (Optional)**: The user (Director) provides a high-level mission. A planning agent decomposes this into a series of concrete tasks, which are added to the mind map and Mission Control dashboard.
5.  **Autonomous Loop**: The agent becomes "active." It can now chat with the user, use its tools, and autonomously execute its mission plan or run general learning cycles to improve its knowledge and create assets.
6.  **Tool Usage & Delegation**: The Core Agent uses Gemini's function calling capabilities to interact with its environment. It can modify its own knowledge graph, manage files, search the web, and delegate deep psychological analysis to its specialized sub-agents. Feedback from these agents is integrated into its memory and knowledge graph.

---

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI/LLM**: Google Gemini API (`@google/genai`)
*   **Visualization**: D3.js
*   **Editor**: Monaco Editor

---

## 🏃‍♀️ Getting Started

This application is designed to run in a managed environment where the Google Gemini API key is securely provided.

### Usage

1.  **Define Persona**: Open the application and write a detailed description of the persona you want to create in the "Persona Definition" text area.
2.  **Select Model**: Choose the desired base model (Gemini 2.5 Flash is recommended for starting).
3.  **Create Mind**: Click the "Create Mind" button.
4.  **Observe**: Watch as the AI agents analyze the persona and build the mind map in real-time. The status will be updated in the control panel.
5.  **Assign a Mission**: Once the mind is created, go to the "Directorate" panel, define a mission, and click "Set Mission".
6.  **Interact & Monitor**: The agent becomes autonomous. You can now:
    *   Track its progress in the **Mission Control** tab.
    *   Talk to it in the **Chat** tab.
    *   Explore its thought process in the **Mind Map**.
    *   View the files it creates in the **Cognitive IDE**.
    *   Commit its work in the **Source Control** panel.
    *   Use the **Metacognition Tools** in the control panel to guide its development.
