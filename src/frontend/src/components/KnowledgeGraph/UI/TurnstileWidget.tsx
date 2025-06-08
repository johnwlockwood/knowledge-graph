"use client";
import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  siteKey: string;
}

export const TurnstileWidget = forwardRef<{ resetWidget?: () => void }, TurnstileWidgetProps>(
  ({ onVerify, onError, siteKey }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const turnstileRef = useRef<TurnstileInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSuccess = useCallback((token: string) => {
      onVerify(token);
      // Hide widget after successful verification
      setIsVisible(false);
    }, [onVerify]);

    const handleError = useCallback(() => {
      setIsVisible(true); // Show widget on error
      onError?.();
    }, [onError]);

    const reset = useCallback(() => {
      if (turnstileRef.current?.reset) {
        turnstileRef.current.reset();
        setIsVisible(true);
      }
    }, []);

    // Expose resetWidget method using useImperativeHandle
    useImperativeHandle(ref, () => ({
      resetWidget: reset
    }), [reset]);

    // Set turnstile ref callback
    const setTurnstileRef = useCallback((instance: TurnstileInstance | null) => {
      turnstileRef.current = instance;
    }, []);

    return (
      <div ref={containerRef} className={`flex justify-center overflow-hidden transition-all duration-300 ${!isVisible ? 'h-0' : ''}`}>
        <Turnstile
          ref={setTurnstileRef}
          siteKey={siteKey}
          onSuccess={handleSuccess}
          onError={handleError}
          options={{
            theme: 'light',
            size: 'normal',
            execution: 'render' // Load resources only when actually rendering
          }}
        />
      </div>
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';