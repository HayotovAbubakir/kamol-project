'use client';

import { useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';
import ApexChartClient from '@/components/charts/ApexChartClient';

export interface AnalyticsChartPoint {
  label: string;
  value: number;
}

interface AnalyticsBarChartProps {
  data: AnalyticsChartPoint[];
  height: number;
  isDark: boolean;
  formatValue: (value: number) => string;
  compact?: boolean;
  variant?: 'emerald' | 'gold';
}

function formatAxisTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

function getChartScale(height: number) {
  return Math.min(1.35, Math.max(0.95, height / 150));
}

export function AnalyticsBarChart({
  data,
  height,
  isDark,
  formatValue,
  compact = false,
  variant = 'emerald',
}: AnalyticsBarChartProps) {
  const isGold = variant === 'gold';
  const chartType = isGold ? 'area' : 'bar';
  const accent = isGold ? (isDark ? '#c4b08a' : '#7a6844') : isDark ? '#6f9d82' : '#4d6b57';
  const muted = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(29,39,32,0.2)';
  const axis = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(29,39,32,0.62)';
  const grid = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(29,39,32,0.1)';
  const tooltipTheme = isDark ? 'dark' : 'light';
  const scale = getChartScale(height);
  const labelSize = `${Math.round((compact ? 11 : 12) * scale)}px`;
  const axisSize = `${Math.round((compact ? 10 : 11) * scale)}px`;
  const dataLabelSize = `${Math.round(11 * scale)}px`;
  const columnWidth = data.length <= 2 ? `${Math.round(46 * scale)}%` : `${Math.round(38 * scale)}%`;

  const series = useMemo(
    () => [{ name: isGold ? 'Summa' : 'Loyiha', data: data.map((point) => point.value) }],
    [data, isGold],
  );

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: chartType,
        background: 'transparent',
        fontFamily: 'inherit',
        toolbar: { show: false },
        zoom: { enabled: false },
        selection: { enabled: false },
        parentHeightOffset: 0,
        animations: { enabled: true, speed: 420 },
      },
      colors: isGold ? [accent] : [muted, accent],
      plotOptions: {
        bar: {
          columnWidth,
          borderRadius: 4,
          borderRadiusApplication: 'end',
          distributed: !isGold,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num <= 0) return '';
          return isGold ? formatAxisTick(num) : formatValue(num);
        },
        offsetY: isGold ? -8 : -6,
        style: {
          fontSize: dataLabelSize,
          fontWeight: 600,
          colors: isGold ? [accent] : [axis, accent],
        },
        background: { enabled: false },
      },
      stroke: isGold
        ? { curve: 'smooth', width: 3, colors: [accent] }
        : { width: 0 },
      fill: isGold
        ? {
            type: 'gradient',
            gradient: {
              shadeIntensity: 0,
              opacityFrom: isDark ? 0.42 : 0.32,
              opacityTo: 0.04,
              stops: [0, 100],
            },
          }
        : { type: 'solid', opacity: 1 },
      markers: isGold
        ? {
            size: Math.round(5 * scale),
            strokeWidth: 2,
            strokeColors: isDark ? '#141414' : '#ffffff',
            colors: [accent],
            hover: { size: Math.round(6 * scale) },
          }
        : { size: 0 },
      grid: {
        borderColor: grid,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: {
          top: 12,
          right: 10,
          bottom: 0,
          left: 8,
        },
      },
      xaxis: {
        categories: data.map((point) => point.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: axis,
            fontSize: labelSize,
            fontWeight: 600,
          },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        tickAmount: height >= 170 ? 4 : 3,
        labels: {
          style: {
            colors: axis,
            fontSize: axisSize,
            fontWeight: 500,
          },
          formatter: (value) => formatAxisTick(value),
        },
      },
      legend: { show: false },
      tooltip: {
        theme: tooltipTheme,
        y: { formatter: (value) => formatValue(value) },
      },
      states: {
        hover: { filter: { type: 'darken', value: 0.08 } },
        active: { filter: { type: 'none' } },
      },
    }),
    [
      accent,
      axis,
      axisSize,
      chartType,
      columnWidth,
      data,
      dataLabelSize,
      formatValue,
      grid,
      height,
      isDark,
      isGold,
      labelSize,
      muted,
      scale,
      tooltipTheme,
    ],
  );

  return (
    <div className="ui-apex-chart" style={{ height: '100%', minHeight: height }}>
      <ApexChartClient
        key={`${chartType}-${isDark ? 'dark' : 'light'}-${Math.round(height / 10)}`}
        type={chartType}
        height={height}
        width="100%"
        series={series}
        options={options}
      />
    </div>
  );
}
