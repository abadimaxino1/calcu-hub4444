import React, { useEffect, useState } from 'react';

interface AdSlotProps {
  placement: string;
}

interface AdSlotConfig {
  id: string;
  adClient: string;
  adSlot: string;
  format?: string;
  styleJson?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement }) => {
  const [config, setConfig] = useState<AdSlotConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/ads/slots');
        if (res.ok) {
          const data = await res.json();
          const slot = data.slots.find((s: any) => s.positionKey === placement);
          if (slot) {
            setConfig(slot);
          }
        }
      } catch (e) {
        console.error('Failed to fetch ad config', e);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [placement]);

  useEffect(() => {
    if (config && !import.meta.env.DEV) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error', e);
      }
    }
  }, [config]);

  if (loading) return null;

  if (import.meta.env.DEV) {
    return (
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-4 text-center text-gray-500 my-4">
        <p className="font-bold">Ad Slot: {placement}</p>
        <p className="text-xs">{config ? `Configured: ${config.adSlot}` : 'Not configured'}</p>
      </div>
    );
  }

  if (!config || !config.adClient || !config.adSlot) return null;

  const style = config.styleJson ? JSON.parse(config.styleJson) : { display: 'block' };

  return (
    <div className="ad-container my-4">
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={config.adClient}
        data-ad-slot={config.adSlot}
        data-ad-format={config.format || 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSlot;
