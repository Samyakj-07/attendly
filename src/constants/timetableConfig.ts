export interface TimePreset {
  label: string;
  start: string;
  end: string;
}

export const TIME_PRESETS: TimePreset[] = [
  { label: '08:30 – 09:30', start: '08:30', end: '09:30' },
  { label: '09:30 – 10:30', start: '09:30', end: '10:30' },
  { label: '10:30 – 11:30', start: '10:30', end: '11:30' },
  { label: '11:30 – 12:30', start: '11:30', end: '12:30' },
  { label: '12:30 – 01:30', start: '12:30', end: '01:30' },
  { label: '01:30 – 02:30', start: '01:30', end: '02:30' },
  { label: '02:30 – 03:30', start: '02:30', end: '03:30' },
  { label: '03:30 – 04:30', start: '03:30', end: '04:30' },
  { label: '04:30 – 05:30', start: '04:30', end: '05:30' },
  { label: '05:30 – 06:30 (Eve)', start: '05:30 PM', end: '06:30 PM' },
  { label: '06:30 – 07:30 (Eve)', start: '06:30 PM', end: '07:30 PM' },
  { label: '09:30 – 11:30 (Lab)', start: '09:30', end: '11:30' },
  { label: '11:30 – 01:30 (Lab)', start: '11:30', end: '01:30' },
  { label: '01:30 – 03:30 (Lab)', start: '01:30', end: '03:30' },
  { label: '03:30 – 05:30 (Lab)', start: '03:30', end: '05:30' },
];

