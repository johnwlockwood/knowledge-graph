"use client";
import { useEffect, useRef } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose: () => void;
  enableEscKey?: boolean;
  enableBackdropClick?: boolean;
  preventBodyScroll?: boolean;
}

interface UseModalReturn {
  modalRef: React.RefObject<HTMLDivElement | null>;
  handleBackdropClick: (event: React.MouseEvent) => void;
}

export function useModal({
  isOpen,
  onClose,
  enableEscKey = true,
  enableBackdropClick = true,
  preventBodyScroll = false
}: UseModalOptions): UseModalReturn {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && enableEscKey) {
        onClose();
      }
    };

    if (isOpen && enableEscKey) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, enableEscKey]);

  // Handle body scroll prevention
  useEffect(() => {
    if (isOpen && preventBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (preventBodyScroll) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen, preventBodyScroll]);

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (enableBackdropClick && event.target === modalRef.current) {
      onClose();
    }
  };

  return {
    modalRef,
    handleBackdropClick
  };
}
