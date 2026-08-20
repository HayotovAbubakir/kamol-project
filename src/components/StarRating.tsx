'use client';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ rating, maxStars = 5, showValue = true, size = 'md' }: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const valueSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    } else if (i === Math.ceil(rating) && rating % 1 >= 0.3) {
      stars.push(
        <span key={i} className="relative inline-block">
          <span className="text-gray-300 dark:text-gray-600">★</span>
          <span
            className="absolute inset-0 overflow-hidden text-yellow-400"
            style={{ width: `${(rating % 1) * 100}%` }}
          >
            ★
          </span>
        </span>,
      );
    } else {
      stars.push(<span key={i} className="text-gray-300 dark:text-gray-600">★</span>);
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClass}`}>
      <span className="inline-flex">{stars}</span>
      {showValue && (
        <span className={`font-medium text-app-muted ${valueSizeClass}`}>
          {Number(rating).toFixed(1)}/{maxStars}
        </span>
      )}
    </span>
  );
}
