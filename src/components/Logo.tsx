import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  tone?: 'dark' | 'light';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-36',
  md: 'max-w-44',
  lg: 'max-w-60 sm:max-w-64',
  xl: 'max-w-72 sm:max-w-80 lg:max-w-[22rem]',
  hero: 'max-w-[min(360px,88vw)] sm:max-w-[min(400px,80vw)]',
};

export function Logo({ size = 'md', tone = 'dark', className }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === 'light' ? '/logo-light.png' : '/logo.source.png'}
      alt="KAMOL PROJECT"
      draggable={false}
      className={cn('h-auto w-auto max-w-full object-contain object-center', sizeClasses[size], className)}
    />
  );
}

export function LogoAdaptive({ size = 'md', className }: Omit<LogoProps, 'tone'>) {
  return (
    <>
      <Logo size={size} tone="dark" className={cn(className, 'dark:hidden')} />
      <Logo size={size} tone="light" className={cn(className, 'hidden dark:block')} />
    </>
  );
}
