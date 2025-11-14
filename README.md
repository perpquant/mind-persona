
<div align="center">
  <h1 align="center">Persona Mind Creator: Deep Psychology Department</h1>
  <strong>A multi-agent AI system that constructs, visualizes, and evolves a digital consciousness.</strong>
</div>

<br />

> **Note:** This application is a sophisticated multi-agent AI system where a core persona agent collaborates with specialized agents to perform deep psychological analysis, building and refining an interactive mind map of its own evolving consciousness.

---

## ✨ Core Features

The Persona Mind Creator is a rich, interactive environment for instantiating and developing autonomous AI agents.

| Feature                       | Description                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persona Definition**        | Bootstrap a new AI agent's identity using a simple, natural language description.                                                                                                                           |
| **Automated Mind Map**        | AI agents automatically analyze the persona from multiple psychological angles (Emotional Core, Cognitive Profile, etc.) and construct an interactive, hierarchical knowledge graph.                            |
| **Mission Command**           | Assign high-level missions (e.g., "Research and produce a technical whitepaper on AI consciousness"). A planning agent decomposes the mission into a step-by-step task list for the agent to execute.             |
| **Autonomous Operation**      | Once created, the agent can operate autonomously, pursuing its mission, identifying knowledge gaps, and seeking new information to continuously refine its mind map and create durable intellectual assets.      |
| **Multi-Agent System**        | A team of specialized AI agents work in concert: `Core Persona` (executor), `Meta-Consciousness Director` (planner), `System Monitor` (supervisor), and `Psychology Sub-Agents` (deep analysis experts). |
| **Comprehensive Workspace**   | A rich, multi-tabbed UI provides deep interaction: Mind Map, Mission Control, Chat, IDE, Terminal, Source Control, System & API Monitors, and a persistent Audit Log.                                        |
| **Tool Usage & VFS**          | The agent uses a full suite of tools via function calling, including web search, a virtual file system (`ls`, `cat`, `write`, `python`), and memory recall to create and manage its work.                |
| **Source Control**            | A Git-like system tracks all changes to the agent's virtual file system. The agent can be directed to commit its work with descriptive messages, creating a versioned history of its output.               |
| **Advanced Metacognition**    | Trigger the agent to perform self-audits, integrate its psychological profile with its domain knowledge (`Integrate Psyche`), and even attempt conceptual breakthroughs (`Transcendence`).                   |
| **Configurable AI Models**    | Seamlessly switch between **Gemini 2.5 Flash** (for speed and efficiency) and **Gemini 2.5 Pro** (for complex reasoning) to power all agents within the system.                                                |
| **API & Audit Monitoring**    | A live API dashboard provides analytics on token usage, costs, and success rates. A persistent audit log tracks every system event, user interaction, and state change for full traceability.            |

---

## 🚀 How It Works

The application operates on a sophisticated, state-driven loop that enables complex and emergent behavior from the AI agent.

1.  **Initialization**: A user provides a persona description (e.g., "A cynical but brilliant detective...") and selects a base AI model.
2.  **Analysis & Generation**: The system spawns multiple analysis tasks, one for each psychological "department." It calls the Gemini API to analyze the persona from each angle, requesting a structured JSON output.
3.  **Mind Map Construction**: The structured results are used to build the initial nodes (e.g., `CORE_PERSONA`, `PSYCHOLOGY_ASPECT`, `STRENGTH`) and links of the persona's mind map. This knowledge graph now represents the agent's core identity.
4.  **Mission Assignment (Optional)**: The user, acting as the "Director," provides a high-level mission. A planning agent (`gemini-2.5-pro`) decomposes this into a series of concrete, dependent tasks, which are added to the mind map and the Mission Control dashboard.
5.  **Autonomous Loop**: The agent becomes "active." A high-level **Meta-Consciousness Director** analyzes the agent's complete state (mind map, file system, mission tasks, recent logs) and issues the next single, actionable directive (e.g., "Search the web for 'X', then write a summary to `/research/X.md`").
6.  **Execution & Tool Use**: The **Core Persona Agent** receives the directive and uses Gemini's function calling capabilities to execute it. It can:
    *   Read/write to its virtual file system (`run_terminal_command`).
    *   Search the web (`search_the_web`).
    *   Modify its own knowledge graph (`upsert_mind_map_node`, `create_mind_map_link`).
    *   Update its mission progress (`update_task_status`).
    *   Commit its work (`commit_changes`).
    *   Delegate deep analysis to specialized sub-agents (`delegate_to_psychology_sub_agent`).
7.  **State Update & Monitoring**: The results of the tool execution update the application's central state (the mind map, VFS, logs). The UI re-renders instantly to reflect the agent's "thought" and actions. The **System Monitor Agent** can be invoked to analyze the agent's progress and provide feedback, which is then fed back into the autonomous loop.

---

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI/LLM**: Google Gemini API (`@google/genai`) with Function Calling
*   **Editor**: Monaco Editor (The editor that powers VS Code)
*   **State Management**: React Hooks (`useState`, `useCallback`)

---

## 🏃‍♀️ Getting Started

This application is designed to run in a managed environment where the Google Gemini API key is securely provided via environment variables.

### Usage Guide

1.  **Define Persona**: In the control panel, write a detailed description of the persona you want to create in the "Persona Definition" text area.
2.  **Select Model**: In the "System Configuration" section, choose the desired base model. **Gemini 2.5 Flash** is recommended for starting due to its speed and cost-effectiveness.
3.  **Create Mind**: Click the **`Create Mind`** button.
4.  **Observe**: Watch the "Current Task" indicator as the AI agents analyze the persona and build the mind map. The `CHAT` tab will open, showing the agent's initial thoughts.
5.  **Assign a Mission**: Once the mind is created, open the `CHAT` panel. Click the **Mission Icon** to open the mission input. Define a mission and click **`Set Mission`**.
6.  **Interact & Monitor**: The agent is now autonomous.
    *   **Mission Control**: A new panel will appear on the right, showing the mission plan and the live status of each task.
    *   **Chat**: Converse with the agent to guide it or ask questions.
    *   **Knowledge**: Explore its evolving thought process in the `Knowledge` tab's tree view. Click on nodes to see details.
    *   **IDE**: View the files it creates in the `IDE`. You can also edit them directly.
    *   **Source Control**: See uncommitted changes and the agent's commit history.
    *   **Metacognition Tools**: Use the buttons in the control panel to guide the agent's self-development.
    *   **API Monitor / Audit Log**: Observe the raw model calls and system events in real-time for deep insight into the agent's operations.
