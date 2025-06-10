"use client";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type AvailableModel = 
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4.1-mini-2025-04-14" 
  | "o4-mini-2025-04-16" 
  | "o3-2025-04-16"
  | "gpt-4.1-2025-04-14"
  | "gpt-4o-2024-08-06";

interface ModelSelectorProps {
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  disabled?: boolean;
}

interface ModelInfo {
  value: AvailableModel;
  label: string;
  description: string;
}

// Model priority order (most powerful first)
const MODEL_PRIORITY: AvailableModel[] = [
  "gpt-4.1-2025-04-14",      // Flagship GPT model
  "o3-2025-04-16",           // Advanced reasoning
  "gpt-4o-2024-08-06",       // Fast, intelligent, flexible
  "o4-mini-2025-04-16",      // Latest with improved accuracy
  "gpt-4.1-mini-2025-04-14", // Enhanced reasoning mini
  "gpt-4o-mini-2024-07-18",  // Fast and efficient mini
];

// Static model information for display
const MODEL_INFO: Record<AvailableModel, { label: string; description: string }> = {
  "gpt-4o-mini-2024-07-18": {
    label: "GPT-4o Mini",
    description: "Fast and efficient for most knowledge graphs"
  },
  "gpt-4.1-mini-2025-04-14": {
    label: "GPT-4.1 Mini",
    description: "Enhanced reasoning capabilities"
  },
  "o4-mini-2025-04-16": {
    label: "O4 Mini",
    description: "Latest model with improved accuracy"
  },
  "o3-2025-04-16": {
    label: "O3",
    description: "Advanced reasoning and problem-solving model"
  },
  "gpt-4.1-2025-04-14": {
    label: "GPT-4.1",
    description: "Flagship GPT model for complex tasks"
  },
  "gpt-4o-2024-08-06": {
    label: "GPT-4o",
    description: "Fast, intelligent, flexible GPT model"
  }
};

export function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = availableModels.length > 0 ? {
    value: selectedModel,
    ...MODEL_INFO[selectedModel]
  } : null;

  // Fetch available models from backend
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch('/api/available-models');
        if (response.ok) {
          const data = await response.json();
          const models = data.models as AvailableModel[];
          setAvailableModels(models);
          
          // If current selected model is not available, switch to most powerful available
          if (models.length > 0 && !models.includes(selectedModel)) {
            // Find the most powerful model that's available
            const bestAvailableModel = MODEL_PRIORITY.find(model => models.includes(model));
            if (bestAvailableModel) {
              onModelChange(bestAvailableModel);
            }
          }
        } else {
          console.error('Failed to fetch available models');
          // Fallback to all models if API fails
          const allModels = Object.keys(MODEL_INFO) as AvailableModel[];
          setAvailableModels(allModels);
          // Switch to most powerful model if current isn't available
          if (!allModels.includes(selectedModel)) {
            const bestModel = MODEL_PRIORITY.find(model => allModels.includes(model));
            if (bestModel) onModelChange(bestModel);
          }
        }
      } catch (error) {
        console.error('Error fetching available models:', error);
        // Fallback to all models if API fails
        const allModels = Object.keys(MODEL_INFO) as AvailableModel[];
        setAvailableModels(allModels);
        // Switch to most powerful model if current isn't available
        if (!allModels.includes(selectedModel)) {
          const bestModel = MODEL_PRIORITY.find(model => allModels.includes(model));
          if (bestModel) onModelChange(bestModel);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableModels();
  }, []); // Run only on mount

  // Create model options from available models
  const modelOptions: ModelInfo[] = availableModels.map(model => ({
    value: model,
    ...MODEL_INFO[model]
  }));

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Dropdown content to be rendered via portal
  const dropdownContent = isOpen && !disabled && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 999998 }}
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dropdown - rendered via portal at document root */}
      <div 
        className="fixed bg-white border border-gray-300 rounded-lg shadow-lg"
        style={{
          zIndex: 999999,
          maxHeight: '300px',
          overflowY: 'auto',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width
        }}
      >
        <div className="py-1">
          {modelOptions.map((option) => (
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
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">
              {isLoading ? 'Loading...' : (selectedOption?.label || 'Select Model')}
            </div>
            <div className="text-sm text-gray-500">
              {isLoading ? 'Fetching available models...' : (selectedOption?.description || 'Choose an AI model')}
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

      {/* Render dropdown via portal to document.body */}
      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
