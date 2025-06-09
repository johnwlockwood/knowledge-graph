"use client";
import { useEffect } from 'react';

interface KeyboardShortcuts {
  onPrevious?: () => void;
  onNext?: () => void;
  onDelete?: () => void;
}

export function useKeyboardShortcuts({ onPrevious, onNext, onDelete }: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Only capture plain arrow keys (no modifiers) for graph navigation
      // Let Cmd+Left/Right (or Ctrl+Left/Right) pass through for browser history
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && onPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && onNext) {
        e.preventDefault();
        onNext();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        e.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevious, onNext, onDelete]);
}
