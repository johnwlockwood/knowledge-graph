"use client";
import { useState } from 'react';

export type AvailableModel = 
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4.1-mini-2025-04-14" 
  | "o4-mini-2025-04-16";

interface ModelSelectorProps {
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  disabled?: boolean;
}

const MODEL_OPTIONS: { value: AvailableModel; label: string; description: string }[] = [
  {
    value: "gpt-4o-mini-2024-07-18",
    label: "GPT-4o Mini",
    description: "Fast and efficient for most knowledge graphs"
  },
  {
    value: "gpt-4.1-mini-2025-04-14",
    label: "GPT-4.1 Mini",
    description: "Enhanced reasoning capabilities"
  },
  {
    value: "o4-mini-2025-04-16",
    label: "O4 Mini",
    description: "Latest model with improved accuracy"
  }
];

export function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = MODEL_OPTIONS.find(option => option.value === selectedModel);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">
              {selectedOption?.label || 'Select Model'}
            </div>
            <div className="text-sm text-gray-500">
              {selectedOption?.description || 'Choose an AI model'}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="py-1">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onModelChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 focus:outline-none focus:bg-indigo-50 transition-colors duration-150 ${
                    selectedModel === option.value
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                  {selectedModel === option.value && (
                    <div className="mt-1">
                      <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
