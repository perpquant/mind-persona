import React from 'react';
import { MissionTask, MissionTaskStatus } from '../types';
import { MissionIcon } from './icons/MissionIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface MissionControlPanelProps {
  missionStatement: string;
  tasks: MissionTask[];
  onConcludeMission: () => void;
}

const TaskStatusIcon: React.FC<{ status: MissionTaskStatus }> = ({ status }) => {
  switch (status) {
    case 'complete':
      return (
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'in_progress':
      return <SpinnerIcon className="w-5 h-5 text-blue-400" />;
    case 'pending':
      return <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />;
    default:
      return null;
  }
};


export const MissionControlPanel: React.FC<MissionControlPanelProps> = (props) => {
  const { missionStatement, tasks, onConcludeMission } = props;
 
  const completedTasks = tasks.filter(t => t.status === 'complete').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="bg-gray-800/50 h-full flex flex-col p-4">
      <header className="flex-shrink-0 mb-4 pb-2 border-b border-cyan-500/20 flex justify-between items-center">
        <h3 className="text-lg font-bold font-orbitron text-gray-200 flex items-center">
          <MissionIcon className="w-5 h-5 mr-2" />
          Mission Control
        </h3>
        <button 
            onClick={onConcludeMission} 
            className="px-3 py-1 text-xs bg-red-800 hover:bg-red-700 text-white rounded"
        >
            Conclude Mission
        </button>
      </header>

      {/* Mission Status Section */}
      <div className="flex-shrink-0 space-y-4">
        <div>
          <h4 className="font-semibold text-cyan-400 mb-1 text-sm">Active Mission</h4>
          <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md text-sm">{missionStatement}</p>
        </div>
        <div>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-cyan-400 text-sm">Task Progress</h4>
                <span className="font-mono text-sm text-gray-300">{completedTasks} / {tasks.length}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>
      
       {/* Tasks List */}
       <div className="flex-grow overflow-y-auto mt-4 custom-scrollbar pr-2">
            <h4 className="font-semibold text-cyan-400 mb-2 text-sm">Mission Tasks</h4>
            <ul className="space-y-2">
            {tasks.map(task => (
                <li key={task.id} className="bg-gray-900/50 p-2 rounded-lg flex items-start space-x-3 text-sm">
                <div className="flex-shrink-0 pt-0.5">
                    <TaskStatusIcon status={task.status} />
                </div>
                <div>
                    <p className="text-gray-300">{task.description}</p>
                    {task.dependencies.length > 0 && <p className="text-xs text-gray-500 mt-1">Depends on: {task.dependencies.join(', ')}</p>}
                </div>
                </li>
            ))}
            </ul>
        </div>
    </div>
  );
};