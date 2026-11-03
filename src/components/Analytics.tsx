import React, { useEffect } from 'react';

export const Analytics: React.FC = () => {
  useEffect(() => {
    // Only load if VITE_PLAUSIBLE_DOMAIN is explicitly set and non-empty
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      return;
    }

    const trimmedDomain = domain.trim();
    const existingScript = document.querySelector('script[data-plausible="true"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-plausible', 'true');
    script.setAttribute('data-domain', trimmedDomain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);

    console.log(`[Analytics] Plausible loaded for domain: ${trimmedDomain}`);
  }, []);

  return null;
};
