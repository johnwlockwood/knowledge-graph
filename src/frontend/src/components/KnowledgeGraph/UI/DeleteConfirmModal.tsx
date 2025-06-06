"use client";
import { useModal } from '../../../hooks/useModal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  graphTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, graphTitle, onConfirm, onCancel }: DeleteConfirmModalProps) {
  const { modalRef, handleBackdropClick } = useModal({
    isOpen,
    onClose: onCancel,
    enableEscKey: true,
    enableBackdropClick: true,
    preventBodyScroll: false
  });

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Graph</h3>
        <p className="text-gray-600 mb-4">
          Are you sure you want to remove &ldquo;{graphTitle}&rdquo; from your workspace?
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
