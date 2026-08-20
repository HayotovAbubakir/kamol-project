'use client';

import { usePathname } from 'next/navigation';
import { BlueprintGrid } from '@/components/atmosphere/BlueprintGrid';
import { WaterSurface } from '@/components/atmosphere/WaterSurface';
import { GearField } from '@/components/atmosphere/GearField';

export function PageAtmosphere() {
  const pathname = usePathname();

  if (pathname === '/admin' || pathname === '/worker') return <BlueprintGrid />;
  if (pathname.includes('/projects')) return <WaterSurface />;
  if (pathname.includes('/workers')) return <WaterSurface />;
  if (pathname.includes('/notifications')) return <WaterSurface />;
  if (pathname.includes('/settings')) return <GearField />;
  if (pathname.includes('/completed')) return <WaterSurface />;
  if (pathname.includes('/returned')) return <WaterSurface />;
  return <BlueprintGrid />;
}
