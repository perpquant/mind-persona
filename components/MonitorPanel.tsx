
import React from 'react';
import { MonitorAnalysis } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { BrainIcon } from './icons/BrainIcon';

interface MonitorPanelProps {
  analysis: MonitorAnalysis | null;
  isLoading: boolean;
  onRunAnalysis: () => void;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({ analysis, isLoading, onRunAnalysis }) => {
  
  const getPriorityClass = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High': return 'bg-red-500/20 text-red-300';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'Low': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="text-sm text-gray-300 space-y-4">
      <p className="text-xs text-gray-400">
        The Monitor Agent analyzes the Persona Agent's state and suggests improvements.
      </p>
      
      <button
        onClick={onRunAnalysis}
        disabled={isLoading}
        className="w-full flex items-center justify-center p-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <SpinnerIcon />
        ) : (
          <>
            <BrainIcon className="w-5 h-5 mr-2" />
            <span>Analyze Agent</span>
          </>
        )}
      </button>

      {analysis && (
        <div className="space-y-4 pt-4">
          <div>
            <h5 className="font-bold text-cyan-400 mb-1">Overall Assessment</h5>
            <p className="text-gray-400 text-xs bg-gray-900/50 p-2 rounded">{analysis.overallAssessment}</p>
          </div>
          <div>
            <h5 className="font-bold text-cyan-400 mb-2">Recommendations</h5>
            <ul className="space-y-2">
              {analysis.suggestions.map((s, i) => (
                <li key={i} className="bg-gray-900/50 p-2 rounded">
                  <div className="flex justify-between items-start">
                     <p className="font-semibold text-gray-200">{s.area}</p>
                     <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${getPriorityClass(s.priority)}`}>{s.priority}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{s.recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
