"use client";

interface ModalCloseButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export function ModalCloseButton({ 
  onClick, 
  title = "Close modal (ESC)",
  className = "absolute top-4 right-4 z-10"
}: ModalCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${className} bg-white hover:bg-gray-50 rounded-full p-2 text-gray-700 shadow-lg border border-gray-200 transition-all duration-200 hover:scale-110`}
      title={title}
      aria-label={title}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
