import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onExpire,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // If site key is not configured, do not render or block
  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.getElementById('cf-turnstile-script');
    if (existingScript) {
      if (window.turnstile) {
        setScriptLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setScriptLoaded(true));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': () => {
          console.warn('[Cloudflare Turnstile] Challenge encountered an error.');
        },
      });
    } catch (e) {
      console.error('[Cloudflare Turnstile] Failed to render widget:', e);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, onVerify, onExpire]);

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};
