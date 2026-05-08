// src/config/machineConfig.ts

export const STATUS_COLORS = {
  0: '#94a3b8', // Idle - Slate 400
  1: '#10b981', // Running - Emerald 500
  2: '#ef4444', // Fault - Red 500
};

export const STATUS_LABELS: Record<number, string> = {
  0: 'Idle',
  1: 'Running',
  2: 'Fault',
};

export const FAILURE_TYPE_COLORS: Record<string, string> = {
  'Normal': '#10b981',
  'Overheating': '#f59e0b',
  'Vibration Issue': '#ec4899',
  'Pressure Drop': '#3b82f6',
  'Electrical Fault': '#8b5cf6',
  'Anomaly Detected': '#ef4444',
};

export const METRIC_THRESHOLDS = {
  temperature: { warning: 70, critical: 90, unit: '°C' },
  vibration: { warning: 60, critical: 80, unit: 'mm/s' },
  pressure: { warning: 1.2, critical: 1.0, unit: 'bar' }, // Pressure is warning/critical if BELOW
  energy_consumption: { warning: 4.0, critical: 4.5, unit: 'kWh' },
  downtime_risk: { warning: 0.7, critical: 0.9, unit: '%' },
};

export const MACHINE_STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Running', value: '1' },
  { label: 'Idle', value: '0' },
  { label: 'Fault', value: '2' },
];
