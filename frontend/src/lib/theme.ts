import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Chart colours for Recharts. SVG attributes do not always resolve CSS variables
 * reliably, so charts read concrete values keyed to the active mode.
 * Keep these in sync with the tokens in `index.css`.
 */
export interface ChartTheme {
  positive: string;
  negative: string;
  primary: string;
  lime: string;
  info: string;
  warning: string;
  grid: string;
  axis: string;
  ink: string;
  tooltipBg: string;
  tooltipBorder: string;
}

export const chartTheme: Record<'light' | 'dark', ChartTheme> = {
  light: {
    positive: '#0F9B6C',
    negative: '#DF4A62',
    primary: '#0F5C53',
    lime: '#8FBF1F',
    info: '#2B7BD1',
    warning: '#C98F00',
    grid: 'rgba(11, 25, 23, 0.08)',
    axis: '#8A9C96',
    ink: '#0B1917',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#D3DDD8',
  },
  dark: {
    positive: '#3DD68C',
    negative: '#FF6B81',
    primary: '#C6F13B',
    lime: '#C6F13B',
    info: '#5AA9F5',
    warning: '#F2C14E',
    grid: 'rgba(231, 240, 235, 0.07)',
    axis: '#5F776F',
    ink: '#E7F0EB',
    tooltipBg: '#0F1B18',
    tooltipBorder: '#1F3129',
  },
};

/** Categorical series that read well on both paper and night backgrounds. */
export const CHART_SERIES = [
  '#0F9B6C', '#2B7BD1', '#E0A800', '#7C6CF0',
  '#D9569B', '#14A38B', '#DF4A62', '#8FBF1F',
];

export function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** Re-renders when the `dark` class on <html> changes. */
export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(isDarkMode);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark ? chartTheme.dark : chartTheme.light;
}

export const tooltipStyle = (t: ChartTheme): CSSProperties => ({
  backgroundColor: t.tooltipBg,
  border: `1px solid ${t.tooltipBorder}`,
  borderRadius: 12,
  boxShadow: 'var(--elev-md)',
  fontSize: 12.5,
  fontFamily: 'var(--font-sans)',
  color: t.ink,
  padding: '8px 12px',
});
