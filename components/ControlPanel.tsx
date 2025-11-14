
import React from 'react';
import { BrainIcon } from './icons/BrainIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { MonitorAnalysis } from '../types';
import { MonitorPanel } from './MonitorPanel';
import { LinkIcon } from './icons/LinkIcon';
import { AuditIcon } from './icons/AuditIcon';
import { TeamIcon } from './icons/TeamIcon';
import { ModelSelectionPanel } from './ModelSelectionPanel';
import { TranscendIcon } from './icons/TranscendIcon';

interface ControlPanelProps {
  personaDescription: string;
  setPersonaDescription: (value: string) => void;
  onCreateMind: () => void;
  onReset: () => void;
  isLoading: boolean;
  currentTask: string;
  isMindCreated: boolean;
  isAutonomous: boolean;
  onDownloadMindMap: () => void;
  onUploadClick: () => void;
  monitorAnalysis: MonitorAnalysis | null;
  isMonitorLoading: boolean;
  onRunMonitorAnalysis: () => void;
  onIntegratePsyche: () => void;
  onSelfAudit: () => void;
  onTranscendence: () => void;
  selectedGlobalModel: string;
  setSelectedGlobalModel: (model: string) => void;
  auditLogChunkSize: number;
  onAuditLogChunkSizeChange: (kb: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  personaDescription,
  setPersonaDescription,
  onCreateMind,
  onReset,
  isLoading,
  currentTask,
  isMindCreated,
  isAutonomous,
  onDownloadMindMap,
  onUploadClick,
  monitorAnalysis,
  isMonitorLoading,
  onRunMonitorAnalysis,
  onIntegratePsyche,
  onSelfAudit,
  onTranscendence,
  selectedGlobalModel,
  setSelectedGlobalModel,
  auditLogChunkSize,
  onAuditLogChunkSizeChange,
}) => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-orbitron font-bold text-cyan-400">Persona</h1>
        <h2 className="text-xl font-orbitron text-cyan-600">Mind Creator</h2>
        <h3 className="text-md font-orbitron text-cyan-700 mt-1">Human-AI Fusion Dept.</h3>
        <div className="w-24 h-1 bg-cyan-500 mx-auto mt-2 rounded-full"></div>
      </header>

      {isAutonomous && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-gray-800 rounded-lg">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="text-green-400 font-semibold text-sm">Status: Actively Evolving</span>
        </div>
      )}
      
      {!isMindCreated && (
        <>
        <p className="text-sm text-gray-400 text-center">
            Define a persona. Our AI agents will construct a mind map, which you can then explore and chat with.
        </p>
        <div className="flex-grow flex flex-col">
            <label htmlFor="persona-description" className="text-cyan-400 mb-2 font-semibold">
            Persona Definition
            </label>
            <textarea
            id="persona-description"
            value={personaDescription}
            onChange={(e) => setPersonaDescription(e.target.value)}
            placeholder="e.g., A cynical but brilliant detective haunted by a past failure. Wears a trench coat and lives on black coffee and old jazz records..."
            className="w-full flex-grow p-3 bg-gray-800 border-2 border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-gray-300 resize-none"
            rows={10}
            disabled={isLoading || isMindCreated}
            />
        </div>
        </>
      )}


      <div className="space-y-4">
          <button
            onClick={onCreateMind}
            disabled={isLoading || !personaDescription.trim() || isMindCreated}
            className="w-full flex items-center justify-center p-4 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/50"
          >
            {isLoading ? (
              <SpinnerIcon />
            ) : (
              <>
                <BrainIcon className="w-6 h-6 mr-2" />
                <span>Create Mind</span>
              </>
            )}
          </button>
           <button
            onClick={onReset}
            disabled={isLoading}
            className="w-full p-4 bg-red-700 text-white font-bold rounded-md hover:bg-red-600 disabled:bg-gray-600 transition-all"
          >
            Reset
          </button>

        {isMindCreated && (
          <>
            <div className="space-y-2 pt-4 border-t border-cyan-500/10">
              <h4 className="text-center text-xs text-gray-400 font-semibold uppercase tracking-wider">Metacognition Tools</h4>
               <button
                  onClick={onTranscendence}
                  disabled={isLoading}
                  className="w-full p-3 flex items-center justify-center bg-pink-600 text-white font-bold rounded-md hover:bg-pink-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                  title="Attempt Conceptual Transcendence"
                >
                  <TranscendIcon className="w-5 h-5 mr-2" />
                  <span className="text-sm">Attempt Transcendence</span>
                </button>
              <div className="flex space-x-2">
                <button
                  onClick={onIntegratePsyche}
                  disabled={isLoading}
                  className="w-full p-3 flex items-center justify-center bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                  title="Integrate Psyche & Knowledge"
                >
                  <LinkIcon className="w-5 h-5 mr-2" />
                  <span className="text-sm">Integrate Psyche</span>
                </button>
                <button
                  onClick={onSelfAudit}
                  disabled={isLoading}
                  className="w-full p-3 flex items-center justify-center bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                  title="Run a metacognitive self-audit"
                >
                  <AuditIcon className="w-5 h-5 mr-2" />
                  <span className="text-sm">Self-Audit</span>
                </button>
              </div>
            </div>
             <div className="space-y-2 pt-4 border-t border-cyan-500/10">
              <h4 className="text-center text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center justify-center"><TeamIcon className="w-4 h-4 mr-2" />Specialized Agents</h4>
              <div className="text-center text-xs text-gray-500 bg-gray-800/50 p-2 rounded-md">
                Cognitive Bias Agent, Emotional Regulation Agent, Social Tactics Agent
              </div>
            </div>
          </>
        )}

        <div className="flex space-x-2 pt-4 border-t border-cyan-500/10">
           <button
            onClick={onUploadClick}
            disabled={isLoading}
            className="w-full p-3 flex items-center justify-center bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
            title="Upload Mind Map"
          >
            <UploadIcon className="w-5 h-5 mr-2" />
            <span className="text-sm">Upload</span>
          </button>
           <button
            onClick={onDownloadMindMap}
            disabled={!isMindCreated || isLoading}
            className="w-full p-3 flex items-center justify-center bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
            title="Download Mind Map"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            <span className="text-sm">Download</span>
          </button>
        </div>
        {isLoading && (
          <div className="text-center text-cyan-300 animate-pulse text-sm h-5">
            {currentTask}
          </div>
        )}
         {currentTask && !isLoading && (
          <div className="text-center text-green-400 text-sm h-5">
            {currentTask}
          </div>
        )}
      </div>
      
      <div className="mt-auto space-y-4">
        <details className="bg-gray-800/50 rounded-lg" open>
            <summary className="p-4 cursor-pointer font-semibold text-gray-300 flex items-center justify-between">
                System Configuration
                <span className="text-xs text-gray-500">expand</span>
            </summary>
            <div className="p-4 border-t border-cyan-500/20 space-y-4">
                <ModelSelectionPanel
                    selectedGlobalModel={selectedGlobalModel}
                    setSelectedGlobalModel={setSelectedGlobalModel}
                    isLoading={isLoading}
                />
                <div className="pt-4 border-t border-cyan-500/10">
                      <label htmlFor="audit-chunk-size" className="text-gray-300 text-sm font-semibold mb-2 block">
                        Audit Log Auto-Download (KB)
                    </label>
                    <input
                        id="audit-chunk-size"
                        type="number"
                        value={auditLogChunkSize}
                        onChange={(e) => onAuditLogChunkSizeChange(parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                      <p className="text-xs text-gray-500 mt-1">
                        Set to 0 to disable auto-download.
                    </p>
                </div>
            </div>
        </details>

        {isMindCreated && (
          <details className="bg-gray-800/50 rounded-lg" open>
              <summary className="p-4 cursor-pointer font-semibold text-gray-300 flex items-center justify-between">
                  System Monitor
                  <span className="text-xs text-gray-500">expand</span>
              </summary>
              <div className="p-4 border-t border-cyan-500/20">
                  <MonitorPanel 
                      analysis={monitorAnalysis}
                      isLoading={isMonitorLoading}
                      onRunAnalysis={onRunMonitorAnalysis}
                  />
              </div>
          </details>
        )}
      </div>
    </div>
  );
};
