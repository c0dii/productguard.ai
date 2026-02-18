import type { PlatformType, RiskLevel } from '@/types';

export const PLATFORM_COLORS: Record<PlatformType, string> = {
  telegram: '#229ED9',
  google: '#4285F4',
  cyberlocker: '#FF8C00',
  torrent: '#FF4757',
  discord: '#5865F2',
  forum: '#7B8CA8',
  social: '#E1306C',
};

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  telegram: 'Telegram',
  google: 'Google',
  cyberlocker: 'Cyberlocker',
  torrent: 'Torrent',
  discord: 'Discord',
  forum: 'Forum',
  social: 'Social Media',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  critical: '#FF4757',
  high: '#FF8C00',
  medium: '#FFB830',
  low: '#00D4AA',
};

export const RISK_BORDER_COLORS: Record<RiskLevel, string> = {
  critical: 'border-[#FF4757]',
  high: 'border-[#FF8C00]',
  medium: 'border-[#FFB830]',
  low: 'border-[#00D4AA]',
};
