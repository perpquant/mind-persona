
import React from 'react';

interface UploadModalProps {
  onMerge: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onMerge, onCreateNew, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-cyan-500/30 max-w-md w-full">
        <h2 className="text-xl font-bold font-orbitron text-cyan-400 mb-4">Mind Map Uploaded</h2>
        <p className="text-gray-300 mb-6">How would you like to use this mind map?</p>
        <div className="space-y-4">
          <button
            onClick={onMerge}
            className="w-full p-3 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-500 transition-all shadow-md"
          >
            Merge with Current Mind
          </button>
          <button
            onClick={onCreateNew}
            className="w-full p-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 transition-all shadow-md"
          >
            Create New Mind from Upload
          </button>
          <button
            onClick={onCancel}
            className="w-full p-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-all mt-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
