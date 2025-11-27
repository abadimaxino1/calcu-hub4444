export const adsConfig = {
  enabled: false, // placeholder only; flip true when integrating a real ad network
  slots: [
    'hdr-1',
    'inline-1',
    'work-inline-1',
    'ft-1',
    'calculator-top',
    'calculator-bottom'
  ]
};

export function isAdSlotEnabled(slotId: string) {
  return adsConfig.enabled && adsConfig.slots.includes(slotId);
}

export default adsConfig;
