"use client";
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  includeCloseButton: boolean;
}

export function FullscreenModal({ isOpen, onClose, children, includeCloseButton}: FullscreenModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-gray-100 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-none max-h-none">
        {/* Close button */}
        {includeCloseButton && (<button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-50 rounded-full p-2 text-gray-700 shadow-lg border border-gray-200 transition-all duration-200 hover:scale-110"
          title="Exit fullscreen (ESC)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>)}
        
        {/* Content */}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
