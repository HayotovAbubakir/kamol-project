'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnalyticsChartStageProps {
  className?: string;
  minHeight?: number;
  children: (height: number) => React.ReactNode;
}

export function AnalyticsChartStage({
  className,
  minHeight = 128,
  children,
}: AnalyticsChartStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const next = Math.floor(node.getBoundingClientRect().height);
      if (next > 0) setHeight(Math.max(minHeight, next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [minHeight]);

  return (
    <div ref={ref} className={cn('ui-analytics-chart-stage', className)}>
      {children(height)}
    </div>
  );
}
