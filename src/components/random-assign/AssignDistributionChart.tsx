'use client';

import { useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useAppSettings } from '@/context/AppSettingsContext';
import ApexChartClient from '@/components/charts/ApexChartClient';

export interface DistributionPoint {
  label: string;
  value: number;
}

interface AssignDistributionChartProps {
  data: DistributionPoint[];
  height?: number;
  highlightMax?: boolean;
}

export function AssignDistributionChart({
  data,
  height = 220,
  highlightMax = false,
}: AssignDistributionChartProps) {
  const { theme, t } = useAppSettings();
  const isDark = theme === 'dark';
  const unitLabel = t('randomAssign.projectUnit');
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const accent = isDark ? '#6f9d82' : '#4d6b57';
  const muted = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(29,39,32,0.16)';
  const axis = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(29,39,32,0.45)';
  const grid = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(29,39,32,0.08)';

  const series = useMemo(() => [{ name: unitLabel, data: data.map((point) => point.value) }], [data, unitLabel]);

  const colors = useMemo(
    () =>
      data.map((point) =>
        highlightMax && point.value === maxValue && point.value > 0 ? accent : point.value > 0 ? accent : muted,
      ),
    [accent, data, highlightMax, maxValue, muted],
  );

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        background: 'transparent',
        fontFamily: 'inherit',
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        animations: { enabled: true, speed: 420 },
      },
      colors,
      plotOptions: {
        bar: {
          columnWidth: data.length > 8 ? '52%' : '40%',
          borderRadius: 3,
          borderRadiusApplication: 'end',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      grid: {
        borderColor: grid,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        padding: { top: 8, right: 8, bottom: 0, left: 4 },
      },
      xaxis: {
        categories: data.map((point) => point.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          rotate: data.length > 6 ? -28 : 0,
          hideOverlappingLabels: true,
          style: { colors: axis, fontSize: '11px', fontWeight: 500 },
          formatter: (value) => {
            const label = String(value);
            return label.length > 12 ? `${label.slice(0, 11)}…` : label;
          },
        },
      },
      yaxis: {
        min: 0,
        max: Math.max(maxValue, 1),
        tickAmount: 4,
        labels: {
          style: { colors: axis, fontSize: '10px' },
          formatter: (value) => String(Math.round(value)),
        },
      },
      legend: { show: false },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: { formatter: (value) => `${value} ${unitLabel}` },
      },
      states: {
        hover: { filter: { type: 'darken', value: 0.08 } },
        active: { filter: { type: 'none' } },
      },
    }),
    [axis, colors, data, grid, isDark, maxValue, unitLabel],
  );

  return (
    <div className="ui-apex-chart" style={{ height }}>
      <ApexChartClient
        key={`${theme}-${data.length}`}
        type="bar"
        height={height}
        width="100%"
        series={series}
        options={options}
      />
    </div>
  );
}
