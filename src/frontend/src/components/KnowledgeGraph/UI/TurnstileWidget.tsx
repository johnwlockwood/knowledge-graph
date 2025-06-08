"use client";
import { useEffect, useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  siteKey: string;
}

export function TurnstileWidget({ onVerify, onError, siteKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkVisibility = () => {
      if (!containerRef.current) return;
      
      // Look for the hidden input that indicates an invisible Turnstile
      const hiddenInput = containerRef.current.querySelector('input[name="cf-turnstile-response"][type="hidden"]');
      
      if (hiddenInput) {
        setIsVisible(false);
        // Auto-verify when invisible (assuming this is a test/development environment)
        onVerify('invisible-turnstile-token');
      } else {
        setIsVisible(true);
      }
    };

    // Check immediately and then set up polling
    const timer = setTimeout(checkVisibility, 3000);
    const interval = setInterval(checkVisibility, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onVerify]);

  if (!isVisible) {
    return null; // Hide the entire widget
  }

  return (
    <div ref={containerRef} className="flex justify-center">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}