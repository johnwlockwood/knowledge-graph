"use client";
import { createPortal } from 'react-dom';
import { useModal } from '../../../hooks/useModal';
import { ModalCloseButton } from './ModalCloseButton';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  includeCloseButton: boolean;
}

export function FullscreenModal({ isOpen, onClose, children, includeCloseButton}: FullscreenModalProps) {
  const { modalRef, handleBackdropClick } = useModal({
    isOpen,
    onClose,
    enableEscKey: true,
    enableBackdropClick: true,
    preventBodyScroll: true
  });

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-gray-100 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-none max-h-none">
        {/* Close button */}
        {includeCloseButton && (
          <ModalCloseButton 
            onClick={onClose}
            title="Exit fullscreen (ESC)"
          />
        )}
        
        {/* Content */}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
