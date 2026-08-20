'use client';

import type { AppNotification, NotificationEvent, NotificationType } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';
import { formatDateTime, cn } from '@/lib/utils';
import { inferNotificationEvent } from '@/lib/notificationHelpers';

interface NotificationsPanelProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  full?: boolean;
  embedded?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

function resolveEvent(n: AppNotification): NotificationEvent | undefined {
  return n.event ?? inferNotificationEvent(n.message);
}

function NotificationIcon({
  event,
  type,
  compact = false,
}: {
  event?: NotificationEvent;
  type: NotificationType;
  compact?: boolean;
}) {
  const sizeClass = compact ? 'h-7 w-7 text-base' : 'h-9 w-9 text-lg';

  if (event === 'project_completed') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-green-500/15 font-bold text-green-500 ring-1 ring-green-500/25',
          sizeClass,
        )}
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (event === 'project_returned') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-bold text-orange-400 ring-1 ring-orange-500/25',
          sizeClass,
        )}
        aria-hidden
      >
        ?
      </span>
    );
  }
  if (event === 'new_order') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-app-accent/15 font-bold leading-none text-app-accent ring-1 ring-app-accent/25',
          compact ? 'h-7 w-7 text-lg' : 'h-9 w-9 text-xl',
        )}
        aria-hidden
      >
        +
      </span>
    );
  }

  const fallback: Record<NotificationType, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨',
  };

  return <span className="text-lg">{fallback[type] ?? 'ℹ️'}</span>;
}

export function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  full = false,
  embedded = false,
  compact = false,
  emptyMessage,
}: NotificationsPanelProps) {
  const { t } = useAppSettings();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <section
      className={cn(
        full
          ? 'space-y-4'
          : 'ui-glass-card rounded-2xl border text-app-text shadow-sm dark:ring-1 dark:ring-metallic-green/15',
        !full && (embedded ? cn('flex h-full min-h-0 flex-col overflow-hidden', compact ? 'p-2.5' : 'p-3') : 'p-4'),
      )}
    >
      {(!full || unreadCount > 0) && (
        <div
          className={cn(
            'flex shrink-0 items-center justify-between',
            full ? 'border-b border-app-border pb-3' : embedded ? (compact ? 'mb-1.5' : 'mb-2') : 'mb-3',
          )}
        >
          {!full && (
            <h2 className={cn('font-semibold', embedded && (compact ? 'text-xs' : 'text-sm'))}>
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-deadline-red px-1.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </h2>
          )}
          {full && unreadCount > 0 && (
            <p className="text-sm text-app-muted">
              {unreadCount} {t('notifications.unreadCount')}
            </p>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className={cn('ui-link-btn', full && 'ml-auto')}
            >
              {t('notifications.markAll')}
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          full ? 'space-y-2' : 'space-y-1.5',
          embedded && 'min-h-0 flex-1 overflow-hidden',
        )}
      >
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-app-muted">
            {emptyMessage ?? t('notifications.empty')}
          </p>
        ) : (
          notifications.map((n) => {
            const event = resolveEvent(n);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && onMarkRead(n.id)}
                className={cn(
                  'ui-notification-item w-full text-left',
                  full && 'rounded-2xl border border-app-border bg-app-card shadow-sm dark:ring-1 dark:ring-metallic-green/10',
                  compact && 'p-2 text-xs',
                  !compact && full && 'p-4',
                  !n.read && 'ui-notification-unread',
                  event === 'project_completed' && !n.read && 'border-l-2 border-l-green-500',
                  event === 'project_returned' && !n.read && 'border-l-2 border-l-orange-400',
                  event === 'new_order' && !n.read && 'border-l-2 border-l-app-accent',
                )}
              >
                <div className={cn('flex items-start', compact ? 'gap-2' : 'gap-3')}>
                  <NotificationIcon event={event} type={n.type} compact={compact} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('leading-snug', compact && 'line-clamp-2', !n.read && 'font-medium')}>{n.message}</p>
                    {!compact && (
                      <p className="mt-1 text-xs text-app-muted">
                        {formatDateTime(n.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
