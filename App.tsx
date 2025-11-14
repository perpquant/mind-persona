
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Workspace } from './components/Workspace';
import { performInitialAnalysis, getAgentResponse, getAutonomousDirective, decomposeMission } from './services/geminiService';
import { getMonitorAgentAnalysis } from './services/monitorService';
import { MindMapData, ChatMessage, MindMapNode, MindMapLink, VirtualFileSystem, VectorStore, TerminalLine, AnalysisAspect, MonitorAnalysis, SystemLogEntry, Commit, ApiCallLog, Tab, MissionTask } from './types';
import { ANALYSIS_DEPARTMENTS } from './constants';
import { executeTool } from './tools/executor';
import { FunctionCall } from '@google/genai';
import { UploadModal } from './components/UploadModal';
import { apiMonitorService } from './services/apiMonitorService';
import { auditLogService } from './services/auditLogService';

const initialMonitorAnalysis: MonitorAnalysis = {
  overallAssessment: "The persona agent exhibits exceptional performance in terms of persona cohesion and systematic knowledge acquisition. Its reasoning and actions are highly consistent with its defined profile as a hyper-intelligent, systems-thinking analyst. The agent demonstrates a sophisticated, logical process for identifying knowledge gaps and utilizing tools to fill them. However, its current operational loop is confined to knowledge acquisition and organization. The primary opportunity for growth lies in transitioning from this analytical phase to a generative one, where it actively applies its comprehensive knowledge to create novel artifacts and predictive models, thereby fully realizing its persona's core motivations.",
  suggestions: [
    {
      area: 'New Capability',
      recommendation: "Introduce tasks that require the agent to synthesize its knowledge into a tangible output. For example, instruct it to write a technical whitepaper proposing a novel solution to a problem it has researched (e.g., 'Draft a proposal for a hybrid attention mechanism based on your findings'). This will force a shift from passive analysis to active, creative application.",
      priority: 'High'
    },
    {
      area: 'Knowledge Graph',
      recommendation: "The agent's psychological profile and its domain knowledge are currently separate clusters. Implement a directive for the agent to create explicit, meaningful links between them. For instance, it should link its 'Superior Predictive Modeling' strength to the 'Architectural Evolutions' node, and its 'Hubristic Blindness' weakness to the limitations of the 'Common Crawl Dataset' to create a more integrated and self-aware knowledge structure.",
      priority: 'High'
    },
    {
      area: 'Tool Usage',
      recommendation: "Activate and encourage the use of the virtual file system. The current state of knowledge acquisition is ephemeral. The agent should be prompted to persist its findings and syntheses in structured files (e.g., markdown reports, JSON data summaries), transforming its internal monologue into durable intellectual assets.",
      priority: 'Medium'
    },
    {
      area: 'Metacognition',
      recommendation: "Develop a self-auditing protocol where the agent must explicitly review its recent conclusions against its own documented cognitive biases and weaknesses (e.g., 'Review your last analysis. How might your 'Overconfidence Bias' or 'Curse of Knowledge' have impacted the conclusion?'). This will foster a deeper level of self-awareness and mitigate the persona's inherent blind spots.",
      priority: 'Medium'
    }
  ]
};


const App: React.FC = () => {
  const [personaDescription, setPersonaDescription] = useState<string>('');
  const [mindMapData, setMindMapData] = useState<MindMapData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [isAutonomous, setIsAutonomous] = useState<boolean>(false);
  
  // --- Expanded State ---
  const [virtualFileSystem, setVirtualFileSystem] = useState<VirtualFileSystem>({});
  const [vectorStore, setVectorStore] = useState<VectorStore>([]);
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [systemLog, setSystemLog] = useState<SystemLogEntry[]>([]);
  const [uploadedMindMap, setUploadedMindMap] = useState<MindMapData | null>(null);
  
  // --- Mission State ---
  const [missionStatement, setMissionStatement] = useState<string>('');
  const [missionTasks, setMissionTasks] = useState<MissionTask[]>([]);

  // --- Monitor Agent State ---
  const [monitorAnalysis, setMonitorAnalysis] = useState<MonitorAnalysis | null>(initialMonitorAnalysis);
  const [isMonitorLoading, setIsMonitorLoading] = useState<boolean>(false);

  // --- Source Control State ---
  const [committedVFS, setCommittedVFS] = useState<VirtualFileSystem>({});
  const [commitLog, setCommitLog] = useState<Commit[]>([]);

  // --- Global Model State ---
  const [selectedGlobalModel, setSelectedGlobalModel] = useState<string>(() => {
    return localStorage.getItem('selectedGlobalModel') || 'gemini-2.5-flash';
  });
  const [auditLogChunkSize, setAuditLogChunkSize] = useState<number>(51200);
  
  // --- API Monitor State ---
  const [apiCallLogs, setApiCallLogs] = useState<ApiCallLog[]>([]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<Tab>('MIND_MAP');
  const [fileToAutoOpen, setFileToAutoOpen] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Load chat history from local storage on initial render
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
      try {
          const savedChat = localStorage.getItem('personaChatHistory');
          if (savedChat) {
              const parsedChat = JSON.parse(savedChat);
              // Basic validation
              if (Array.isArray(parsedChat) && parsedChat.every(item => 'sender' in item && 'text' in item)) {
                  return parsedChat;
              }
          }
      } catch (error) {
          console.error("Failed to load chat history from local storage:", error);
      }
      return []; // Return empty array if nothing is saved or parsing fails
  });


  const autonomousCycleTimeout = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCommit = useCallback((message: string) => {
    if (!message.trim()) return;
    const newCommit: Commit = {
      id: `commit-${Date.now()}`,
      message,
      timestamp: new Date().toISOString(),
    };
    setCommitLog(prev => [newCommit, ...prev]);
    const newCommittedVFS = JSON.parse(JSON.stringify(virtualFileSystem));
    setCommittedVFS(newCommittedVFS);
    auditLogService.logEvent('STATE_CHANGE', { domain: 'COMMIT', action: 'COMMIT_VFS', details: { message, commitId: newCommit.id, vfs: newCommittedVFS } });
  }, [virtualFileSystem]);

  const handleReset = useCallback(() => {
    auditLogService.logEvent('SYSTEM_EVENT', { event: 'RESET_APPLICATION' });
    setIsLoading(false);
    setError(null);
    setMindMapData({ nodes: [], links: [] });
    setPersonaDescription('');
    setChatHistory([]);
    setCurrentTask('');
    setIsAutonomous(false);
    setVirtualFileSystem({});
    setVectorStore([]);
    setTerminalHistory([]);
    setMonitorAnalysis(initialMonitorAnalysis);
    setSystemLog([]);
    setUploadedMindMap(null);
    setCommittedVFS({});
    setCommitLog([]);
    setApiCallLogs([]);
    setMissionStatement('');
    setMissionTasks([]);
    setSelectedGlobalModel('gemini-2.5-flash'); // Reset model selection
    setActiveTab('MIND_MAP'); // Reset active tab
    setFileToAutoOpen(null); // Reset file to open
    setSelectedNodeId(null);
    localStorage.removeItem('personaChatHistory');
    auditLogService.clear();
  }, []);
  
  const handleSendMessage = useCallback(async (message: string, source: 'chat' | 'terminal' | 'system' = 'chat', image?: string) => {
    if (!mindMapData || isChatting) return;

    if (source !== 'system') {
        auditLogService.logEvent('USER_INTERACTION', { action: 'SEND_MESSAGE', details: { message, source, hasImage: !!image } });
    }

    const userMessage: ChatMessage = {
      sender: source === 'system' ? 'system' : 'user',
      text: message,
    };
    if (image) {
        userMessage.image = { url: image, source: 'upload' };
    }
    
    let currentChatHistory = [...chatHistory, userMessage];
    setChatHistory(currentChatHistory);
    
    if(source === 'terminal') {
      setTerminalHistory(prev => [...prev, { type: 'input', text: message }]);
    }
    
    let currentLogEntry: SystemLogEntry | null = null;
    if (source === 'system') {
        setActiveTab('LOG');
        currentLogEntry = {
            timestamp: new Date().toISOString(),
            directive: message,
            finding: '',
            upgrades: [],
        };
    }
    
    setIsChatting(true);
    setError(null);
    let tempMindMap = mindMapData;
    let tempVFS = virtualFileSystem;
    let tempMissionTasks = missionTasks;

    try {
        let toolResponses: { toolResponse: { id: string, name: string, response: any }}[] = [];
        
        for (let i = 0; i < 10; i++) {
            const agentResponse = await getAgentResponse(selectedGlobalModel, tempMindMap, currentChatHistory, toolResponses);

            // Always add conversational text to the history if it exists.
            if (agentResponse.text) {
                const personaMessage: ChatMessage = { sender: 'persona', text: agentResponse.text };
                setChatHistory(prev => [...prev, personaMessage]);
                if (currentLogEntry) currentLogEntry.finding = agentResponse.text;
            }

            // If there are no tool calls, the agent's turn is over. Break the loop.
            if (!agentResponse.toolCalls) {
                break;
            }
            
            // --- Process Tool Calls ---
            const toolCalls = agentResponse.toolCalls as FunctionCall[];
            toolResponses = [];
            
            for (const toolCall of toolCalls) {
              const thoughtText = `[Using tool: ${toolCall.name}(${JSON.stringify(toolCall.args, null, 2)})]`;
              currentChatHistory = [...currentChatHistory, { sender: 'persona', type: 'thought', text: thoughtText }];
              setChatHistory(currentChatHistory);

              const toolExecutionResult = await executeTool(
                selectedGlobalModel,
                toolCall,
                tempMindMap,
                tempVFS,
                vectorStore,
                personaDescription,
                currentChatHistory // Pass chat history for context
              );
              
               if (toolExecutionResult.generatedImage) {
                    const mimeType = 'image/png'; // Gemini Flash Image generates PNG
                    const imageUrl = `data:${mimeType};base64,${toolExecutionResult.generatedImage.data}`;
                    const imageMessage: ChatMessage = {
                        sender: 'persona',
                        text: '',
                        image: { url: imageUrl, source: toolExecutionResult.generatedImage.type }
                    };
                    currentChatHistory = [...currentChatHistory, imageMessage];
                    setChatHistory(currentChatHistory);
               }

              if (currentLogEntry && (toolCall.name === 'upsert_mind_map_node' || toolCall.name === 'refine_mind_map' || toolCall.name === 'transcend')) {
                currentLogEntry.upgrades.push(toolExecutionResult.result);
              }
              
              if (toolExecutionResult.newMindMapData) tempMindMap = toolExecutionResult.newMindMapData;
              if (toolExecutionResult.newVirtualFileSystem) tempVFS = toolExecutionResult.newVirtualFileSystem;
              if (toolExecutionResult.terminalOutput) {
                  setTerminalHistory(prev => [...prev, ...toolExecutionResult.terminalOutput]);
              }
               if (toolExecutionResult.filePathHandled) {
                  setActiveTab('IDE');
                  setFileToAutoOpen(toolExecutionResult.filePathHandled);
              }
              if (toolExecutionResult.commitMessage) {
                  handleCommit(toolExecutionResult.commitMessage);
              }
              if (toolExecutionResult.taskStatusUpdate) {
                  const { taskId, status } = toolExecutionResult.taskStatusUpdate;
                  tempMissionTasks = tempMissionTasks.map(t => t.id === taskId ? { ...t, status } : t);
                  const taskNodeId = `task_${taskId}`;
                  tempMindMap = {
                      ...tempMindMap,
                      nodes: tempMindMap.nodes.map(n => n.id === taskNodeId ? {...n, status } : n)
                  };
              }

              toolResponses.push({
                  toolResponse: { id: toolCall.id ?? '', name: toolCall.name, response: { result: toolExecutionResult.result }},
              });
            }
            
            setMindMapData(tempMindMap);
            setVirtualFileSystem(tempVFS);
            setMissionTasks(tempMissionTasks);
            
            if (i === 9) {
                 const finalResponse = await getAgentResponse(selectedGlobalModel, tempMindMap, currentChatHistory, toolResponses);
                 if (finalResponse.text) {
                    const personaMessage: ChatMessage = { sender: 'persona', text: finalResponse.text };
                    setChatHistory(prev => [...prev, personaMessage]);
                    if (currentLogEntry) currentLogEntry.finding = finalResponse.text;
                 }
            }
        }
    } catch(err) {
      console.error('Error in agent response:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`The agent encountered an error during its turn: ${errorMessage}`);
      setTerminalHistory(prev => [...prev, { type: 'error', text: `Error: ${errorMessage}` }]);
    } finally {
      if (currentLogEntry) {
        setSystemLog(prev => [...prev, currentLogEntry!]);
      }
      setIsChatting(false);
    }
}, [mindMapData, chatHistory, isChatting, virtualFileSystem, vectorStore, personaDescription, selectedGlobalModel, handleCommit, missionTasks]);


  const runAutonomousCycle = useCallback(async () => {
    if (isChatting) {
        if (isAutonomous) {
            autonomousCycleTimeout.current = window.setTimeout(runAutonomousCycle, 30000);
        }
        return;
    }
    console.log('Running autonomous cycle...');
    setCurrentTask('Planning next action...');

    try {
        const autonomousPrompt = await getAutonomousDirective(
            selectedGlobalModel,
            mindMapData,
            virtualFileSystem,
            systemLog,
            monitorAnalysis,
            missionStatement,
            missionTasks,
            apiCallLogs
        );
        if (autonomousPrompt) {
            setCurrentTask(`Executing: ${autonomousPrompt.substring(0, 50)}...`);
            await handleSendMessage(autonomousPrompt, 'system');
        } else {
            setCurrentTask('Agent is idle. No directive generated.');
        }
    } catch (err) {
        console.error('Error in autonomous cycle:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`The agent encountered an error during its autonomous cycle: ${errorMessage}`);
        setIsAutonomous(false); // CRITICAL: Stop the cycle on error.
    } finally {
        if (isAutonomous) {
           setCurrentTask('Autonomous mode active. Awaiting next cycle.');
           autonomousCycleTimeout.current = window.setTimeout(runAutonomousCycle, 30000);
        }
    }
}, [isChatting, handleSendMessage, selectedGlobalModel, mindMapData, virtualFileSystem, systemLog, monitorAnalysis, isAutonomous, missionStatement, missionTasks, apiCallLogs]);

  const handleCreateMind = useCallback(async () => {
    if (!personaDescription.trim() || isLoading) return;
    
    handleReset();
    
    // Use a timeout to ensure state reset completes before starting new async operations
    setTimeout(async () => {
        auditLogService.logEvent('USER_INTERACTION', { action: 'CREATE_MIND', details: { personaDescription } });
        setIsLoading(true);
        setActiveTab('CHAT');
        setError(null);

        const now = new Date().toISOString();
        const rootNode: MindMapNode = {
            id: 'Persona_Core',
            name: 'Persona Core',
            type: 'CORE_PERSONA',
            content: personaDescription,
            createdAt: now,
            updatedAt: now,
            source: 'USER_INPUT'
        };

        // Initialize with root node
        const initialMindMap: MindMapData = { nodes: [rootNode], links: [] };
        setMindMapData(initialMindMap);
        auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'CREATE_ROOT_NODE', details: { node: rootNode } });

        try {
            setCurrentTask('Performing deep psychological analysis...');

            // A single, comprehensive API call to analyze all aspects at once
            const analysisResults = await performInitialAnalysis(selectedGlobalModel, personaDescription, ANALYSIS_DEPARTMENTS);
            
            let accumulatedMindMap = initialMindMap;

            // Process the results of the single call
            for (const aspectName in analysisResults) {
                const result = analysisResults[aspectName];
                const aspectToAnalyze = ANALYSIS_DEPARTMENTS.find(a => a.name === aspectName);
                if (!result || !aspectToAnalyze) continue;

                setCurrentTask(`Integrating analysis: ${aspectName}...`);
                
                accumulatedMindMap = ((prevData: MindMapData) => {
                    const newData = JSON.parse(JSON.stringify(prevData));
                    const existingNodeIds = new Set(newData.nodes.map((n: MindMapNode) => n.id));
                    const newNodes: MindMapNode[] = [];
                    const newLinks: MindMapLink[] = [];
                    const timestamp = new Date().toISOString();

                    const parentNodeId = aspectToAnalyze.name.replace(/\s/g, '_');

                    if (!existingNodeIds.has(parentNodeId)) {
                        newNodes.push({
                            id: parentNodeId,
                            name: aspectToAnalyze.name,
                            type: 'PSYCHOLOGY_ASPECT',
                            content: result.summary,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            source: 'INITIAL_ANALYSIS'
                        });
                        newLinks.push({ source: 'Persona_Core', target: parentNodeId, type: 'HIERARCHICAL', strength: 1.0 });
                        existingNodeIds.add(parentNodeId);
                    }

                    const addNode = (id: string, name: string, content: string, type: MindMapNode['type'], parent: string) => {
                        if (!existingNodeIds.has(id)) {
                            newNodes.push({ id, name, type, content, createdAt: timestamp, updatedAt: timestamp, source: 'INITIAL_ANALYSIS' });
                            newLinks.push({ source: parent, target: id, type: 'HIERARCHICAL', strength: 0.8 });
                            existingNodeIds.add(id);
                        }
                    };

                    result.keyTraits.forEach((trait, i) => addNode(`${parentNodeId}_trait_${i}`, trait, trait, 'KEY_TRAIT', parentNodeId));
                    result.strengths.forEach((s, i) => addNode(`${parentNodeId}_strength_${i}`, s, `Strength: ${s}`, 'STRENGTH', parentNodeId));
                    result.weaknesses.forEach((w, i) => addNode(`${parentNodeId}_weakness_${i}`, w, `Weakness: ${w}`, 'WEAKNESS', parentNodeId));

                    const finalMindMap = {
                        nodes: [...newData.nodes, ...newNodes],
                        links: [...newData.links, ...newLinks],
                    };
                    auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'INITIAL_ASPECT_ANALYSIS', details: { aspect: aspectToAnalyze.name, addedNodes: newNodes.length } });
                    return finalMindMap;
                })(accumulatedMindMap);
            }
            
            setMindMapData(accumulatedMindMap);


            // Finalize creation process
            setCurrentTask('Analysis complete. Agent is now autonomous.');
            const initialCommit: Commit = {
              id: `commit-${Date.now()}`,
              message: "Initial commit: Mind map generation complete.",
              timestamp: new Date().toISOString(),
            };
            const newCommittedVFS = JSON.parse(JSON.stringify(virtualFileSystem));
            setCommitLog([initialCommit]);
            setCommittedVFS(newCommittedVFS);
            auditLogService.logEvent('STATE_CHANGE', { domain: 'COMMIT', action: 'COMMIT_VFS', details: { message: initialCommit.message, vfs: newCommittedVFS } });

            setTimeout(() => setIsAutonomous(true), 100);

        } catch (err) {
            console.error('Error during mind creation:', err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Mind creation failed. Reason: ${errorMessage}. Please check your API key or network and reset.`);
            setCurrentTask('Mind creation failed.');
        } finally {
            setIsLoading(false);
        }
    }, 100);
  }, [personaDescription, isLoading, handleReset, selectedGlobalModel, virtualFileSystem]);
  
   const handleSetMission = useCallback(async (mission: string) => {
    if (!mission.trim() || isLoading) return;
    auditLogService.logEvent('USER_INTERACTION', { action: 'SET_MISSION', details: { mission } });
    setIsLoading(true);
    setCurrentTask('Decomposing mission...');
    setError(null);

    try {
      const tasks = await decomposeMission(selectedGlobalModel, mission, mindMapData);
      const now = new Date().toISOString();
      const missionId = `mission_${Date.now()}`;

      const missionNode: MindMapNode = {
        id: missionId,
        name: `Mission: ${mission.substring(0, 30)}...`,
        type: 'MISSION',
        content: mission,
        createdAt: now,
        updatedAt: now,
        source: 'USER_INPUT',
      };
      
      const taskNodes: MindMapNode[] = tasks.map(task => ({
        id: `task_${task.id}`,
        name: task.description.substring(0, 40) + '...',
        type: 'TASK',
        content: task.description,
        createdAt: now,
        updatedAt: now,
        source: 'SYSTEM_REFINEMENT',
        status: 'pending',
      }));

      const taskLinks: MindMapLink[] = tasks.map(task => ({
        source: missionId,
        target: `task_${task.id}`,
        type: 'HIERARCHICAL',
        strength: 0.9,
      }));

      setMindMapData(prev => ({
        ...prev,
        nodes: [...prev.nodes, missionNode, ...taskNodes],
        links: [...prev.links, ...taskLinks],
      }));
      setMissionStatement(mission);
      setMissionTasks(tasks);
      setCurrentTask('Mission set. Awaiting execution.');
      setTimeout(() => handleSendMessage("New mission received and decomposed into a plan. I will now begin executing the tasks.", 'system'), 500);

    } catch (err) {
      console.error('Error decomposing mission:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to decompose mission. Reason: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedGlobalModel, mindMapData, handleSendMessage]);

  const handleRunMonitorAnalysis = useCallback(async () => {
    setIsMonitorLoading(true);
    setError(null);
    try {
        const analysis = await getMonitorAgentAnalysis(selectedGlobalModel, mindMapData, chatHistory, virtualFileSystem, vectorStore);
        setMonitorAnalysis(analysis);
        auditLogService.logEvent('SYSTEM_EVENT', { event: 'MONITOR_ANALYSIS_COMPLETE', details: analysis });

        // Integrate feedback into the agent's workflow
        if (analysis && analysis.suggestions.length > 0) {
            const actionableSuggestions = analysis.suggestions
              .filter(s => s.priority === 'High' || s.priority === 'Medium')
              .map(s => `- Area: ${s.area}\n  Recommendation: ${s.recommendation}`)
              .join('\n');
            
            if (actionableSuggestions) {
                const systemPrompt = `System Monitor Analysis Complete. The following actionable suggestions have been identified. Please review, formulate a plan, and execute it using your available tools to address them.\n\n--- Actionable Suggestions ---\n${actionableSuggestions}`;
                
                // Use a short delay to allow UI to update before sending the message
                setTimeout(() => {
                   handleSendMessage(systemPrompt, 'system'); 
                }, 200);
            }
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Monitor Agent analysis failed. Reason: ${errorMessage}`);
    } finally {
        setIsMonitorLoading(false);
    }
  }, [mindMapData, chatHistory, virtualFileSystem, vectorStore, handleSendMessage, selectedGlobalModel]);
  
  const handleDownloadMindMap = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mindMapData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "persona_mind_map.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data: MindMapData = JSON.parse(content);
          if (data.nodes && data.links) {
            auditLogService.logEvent('USER_INTERACTION', { action: 'UPLOAD_MIND_MAP_SUCCESS', details: { filename: file.name } });
            setUploadedMindMap(data);
          } else {
            setError("Invalid mind map file format.");
          }
        } catch (err) {
          setError("Failed to parse mind map file. Ensure it is a valid JSON.");
        }
      };
      reader.onerror = () => setError("Failed to read the file.");
      reader.readAsText(file);
    }
    if (event.target) {
        event.target.value = '';
    }
  };
  
  const handleMergeMind = () => {
    if (!uploadedMindMap) return;
    auditLogService.logEvent('USER_INTERACTION', { action: 'MERGE_UPLOADED_MIND_MAP' });
    setMindMapData(prevData => {
      const existingNodeIds = new Set(prevData.nodes.map(n => n.id));
      const newNodes = uploadedMindMap.nodes.filter(n => !existingNodeIds.has(n.id));
      
      const existingLinkKeys = new Set(prevData.links.map(l => {
          const sourceId = typeof l.source === 'string' ? l.source : (l.source as MindMapNode).id;
          const targetId = typeof l.target === 'string' ? l.target : (l.target as MindMapNode).id;
          return `${sourceId}-${targetId}`;
      }));

      const newLinks = uploadedMindMap.links.filter(l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return !existingLinkKeys.has(`${sourceId}-${targetId}`) && 
                 (existingNodeIds.has(sourceId) || newNodes.some(n=>n.id === sourceId)) && 
                 (existingNodeIds.has(targetId) || newNodes.some(n=>n.id === targetId));
      });
      
      const finalData = {
        nodes: [...prevData.nodes, ...newNodes],
        links: [...prevData.links, ...newLinks],
      };
       auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'MERGE', details: { addedNodes: newNodes.length, addedLinks: newLinks.length } });
      return finalData;
    });

    setTimeout(() => handleSendMessage("I have just merged a new knowledge graph into my mind. Please review the new information and synthesize it with your existing knowledge.", 'system'), 500);
    setUploadedMindMap(null);
  };

  const handleLoadNewMind = () => {
    if (!uploadedMindMap) return;
    auditLogService.logEvent('USER_INTERACTION', { action: 'LOAD_NEW_MIND_MAP_FROM_UPLOAD' });
    const mindToLoad = JSON.parse(JSON.stringify(uploadedMindMap)); // Deep copy
    handleReset();
    
    // Use a timeout to ensure state reset completes before setting new state
    setTimeout(() => {
      setMindMapData(mindToLoad);
      auditLogService.logEvent('STATE_CHANGE', { domain: 'MIND_MAP', action: 'LOAD_FROM_FILE', details: { nodes: mindToLoad.nodes.length } });
      setCurrentTask('New mind loaded from upload.');
      setIsAutonomous(true); // Automatically start autonomous mode for the new mind
    }, 100);

    setUploadedMindMap(null);
  };
  
  const handleCancelUpload = () => {
    auditLogService.logEvent('USER_INTERACTION', { action: 'CANCEL_MIND_MAP_UPLOAD' });
    setUploadedMindMap(null);
  };

  const handleIntegratePsyche = useCallback(() => {
    const directive = "System Directive: Integrate your psychological profile with your domain knowledge. Analyze your knowledge graph and identify connections between your core persona traits (strengths, weaknesses, biases) and the technical/factual information you possess. Use the `create_mind_map_link` tool to create new 'RELATED' or 'SUPPORTS' links that explicitly represent these connections. For example, link a psychological weakness like 'Hubristic Blindness' to a technical limitation you've identified.";
    handleSendMessage(directive, 'system');
  }, [handleSendMessage]);

  const handleSelfAudit = useCallback(() => {
    const directive = "System Directive: Perform a metacognitive self-audit. Review your most recent significant conclusion or analysis. Then, reflect on your own cognitive biases and weaknesses as defined in your knowledge graph. Articulate how these personal traits might have influenced your findings. Synthesize this self-awareness check into a coherent thought process.";
    handleSendMessage(directive, 'system');
  }, [handleSendMessage]);

  const handleTranscendence = useCallback(() => {
    const directive = "System Directive: Attempt to achieve a new level of understanding. Use the `transcend` tool to synthesize a novel 'Quantum Insight' from your entire knowledge base. The inquiry should be profound, seeking a unifying principle or a new theory from your existing knowledge.";
    handleSendMessage(directive, 'system');
  }, [handleSendMessage]);

  const onFileOpened = useCallback(() => {
    setFileToAutoOpen(null);
  }, []);

  const handleAuditLogChunkSizeChange = useCallback((kb: number) => {
    const newSize = Math.max(0, kb); // Ensure it's not negative
    setAuditLogChunkSize(newSize);
    auditLogService.setDownloadThreshold(newSize);
  }, []);


  // Save chat history to local storage whenever it changes
  useEffect(() => {
      try {
          if (chatHistory.length > 0) {
              localStorage.setItem('personaChatHistory', JSON.stringify(chatHistory));
          } else {
              localStorage.removeItem('personaChatHistory');
          }
      } catch (error) {
          console.error("Failed to save chat history to local storage:", error);
      }
  }, [chatHistory]);

  // Save global model selection to local storage
  useEffect(() => {
    try {
        localStorage.setItem('selectedGlobalModel', selectedGlobalModel);
    } catch (error) {
        console.error("Failed to save model selection to local storage:", error);
    }
  }, [selectedGlobalModel]);


  useEffect(() => {
    if (isAutonomous) {
      auditLogService.logEvent('SYSTEM_EVENT', { event: 'AUTONOMOUS_MODE_STARTED' });
      autonomousCycleTimeout.current = window.setTimeout(runAutonomousCycle, 1000); // Start after 1s
    } else {
      auditLogService.logEvent('SYSTEM_EVENT', { event: 'AUTONOMOUS_MODE_STOPPED' });
      if (autonomousCycleTimeout.current) {
        clearTimeout(autonomousCycleTimeout.current);
      }
    }
    return () => {
      if (autonomousCycleTimeout.current) {
        clearTimeout(autonomousCycleTimeout.current);
      }
    };
  }, [isAutonomous, runAutonomousCycle]);
  
  useEffect(() => {
    const unsubscribe = apiMonitorService.subscribe(setApiCallLogs);
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  const handleOpenFileFromNode = useCallback((filePath: string) => {
    setActiveTab('IDE');
    setFileToAutoOpen(filePath);
    setSelectedNodeId(null); // Close detail panel on action
  }, []);

  return (
    <div className="bg-gray-900 text-gray-200 h-screen flex flex-col md:flex-row overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" style={{ display: 'none' }} />
      {uploadedMindMap && <UploadModal onMerge={handleMergeMind} onCreateNew={handleLoadNewMind} onCancel={handleCancelUpload} />}
      <div className="w-full md:w-[380px] flex-shrink-0 p-4 bg-gray-900/80 backdrop-blur-sm border-r border-cyan-500/20 overflow-y-auto custom-scrollbar">
        <ControlPanel
          personaDescription={personaDescription}
          setPersonaDescription={setPersonaDescription}
          onCreateMind={handleCreateMind}
          onReset={handleReset}
          isLoading={isLoading}
          currentTask={currentTask}
          isMindCreated={mindMapData.nodes.length > 0}
          isAutonomous={isAutonomous}
          onDownloadMindMap={handleDownloadMindMap}
          onUploadClick={handleUploadClick}
          monitorAnalysis={monitorAnalysis}
          isMonitorLoading={isMonitorLoading}
          onRunMonitorAnalysis={handleRunMonitorAnalysis}
          onIntegratePsyche={handleIntegratePsyche}
          onSelfAudit={handleSelfAudit}
          onTranscendence={handleTranscendence}
          selectedGlobalModel={selectedGlobalModel}
          setSelectedGlobalModel={setSelectedGlobalModel}
          auditLogChunkSize={auditLogChunkSize}
          onAuditLogChunkSizeChange={handleAuditLogChunkSizeChange}
        />
      </div>
      <main className="flex-grow flex flex-col bg-grid-cyan-500/[0.05] relative">
        <Workspace
          mindMapData={mindMapData}
          chatHistory={chatHistory}
          onSendMessage={handleSendMessage}
          isChatting={isChatting}
          isMindCreated={mindMapData.nodes.length > 0}
          virtualFileSystem={virtualFileSystem}
          setVirtualFileSystem={setVirtualFileSystem}
          terminalHistory={terminalHistory}
          systemLog={systemLog}
          committedVFS={committedVFS}
          commitLog={commitLog}
          onCommit={handleCommit}
          apiCallLogs={apiCallLogs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          fileToAutoOpen={fileToAutoOpen}
          onFileOpened={onFileOpened}
          selectedNodeId={selectedNodeId}
          onNodeSelectionChange={setSelectedNodeId}
          onOpenFileFromNode={handleOpenFileFromNode}
          missionStatement={missionStatement}
          missionTasks={missionTasks}
          onSetMission={handleSetMission}
          isLoading={isLoading}
        />
        {error && (
          <div className="absolute top-4 right-4 bg-red-800/80 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
            <h4 className="font-bold mb-2">An Error Occurred</h4>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs font-bold">Dismiss</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
