"use client";
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  siteKey: string;
}

export function TurnstileWidget({ onVerify, onError, siteKey }: TurnstileWidgetProps) {
  return (
    <div className="flex justify-center py-2">
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