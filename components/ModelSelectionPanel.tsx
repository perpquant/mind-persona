import React from 'react';

interface ModelSelectionPanelProps {
  selectedGlobalModel: string;
  setSelectedGlobalModel: (model: string) => void;
  isLoading: boolean;
}

export const ModelSelectionPanel: React.FC<ModelSelectionPanelProps> = ({
  selectedGlobalModel,
  setSelectedGlobalModel,
  isLoading,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGlobalModel(event.target.value);
  };

  return (
    <div className="space-y-3">
      <h5 className="font-bold text-cyan-400">AI Model Configuration</h5>
      <p className="text-gray-400 text-xs">Select the foundational AI model for all agents. Flash is faster and cost-effective; Pro offers more complex reasoning.</p>

      <div className="flex flex-col space-y-2">
        <label htmlFor="model-select" className="text-gray-300 text-sm">
          Select Base Model:
        </label>
        <select
          id="model-select"
          value={selectedGlobalModel}
          onChange={handleChange}
          disabled={isLoading}
          className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</option>
          <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Reasoning)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Current Model: <span className="font-mono text-cyan-300">{selectedGlobalModel}</span>
        </p>
      </div>
    </div>
  );
};