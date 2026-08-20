'use client';

import dynamic from 'next/dynamic';

const ApexChartClient = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default ApexChartClient;
