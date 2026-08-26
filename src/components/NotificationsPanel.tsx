'use client';

import type { AppNotification, NotificationEvent, NotificationType } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';
import { formatDateTime, cn } from '@/lib/utils';
import {
  inferNotificationEvent,
  parseNotificationMessage,
  parseWorkerReplyNotification,
} from '@/lib/notificationHelpers';
import { UserAvatar } from '@/components/UserAvatar';

interface NotificationsPanelProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
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
  if (event === 'unassigned_warning') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-bold text-orange-500 ring-1 ring-orange-500/25',
          sizeClass,
        )}
        aria-hidden
      >
        !
      </span>
    );
  }
  if (event === 'rating_changed') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-500 ring-1 ring-amber-500/25',
          sizeClass,
        )}
        aria-hidden
      >
        ★
      </span>
    );
  }
  if (event === 'monthly_winner') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-yellow-500/15 text-lg ring-1 ring-yellow-500/25',
          sizeClass,
        )}
        aria-hidden
      >
        🏆
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
      {!full && unreadCount > 0 && (
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-2',
            embedded ? (compact ? 'mb-1.5' : 'mb-2') : 'mb-3',
          )}
        >
          <h2 className={cn('font-semibold', embedded && (compact ? 'text-xs' : 'text-sm'))}>
            {t('notifications.title')}
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-deadline-red px-1.5 text-xs text-white">
              {unreadCount}
            </span>
          </h2>
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
            const workerReply = event === 'worker_reply' ? parseWorkerReplyNotification(n.message) : null;

            if (workerReply) {
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={cn(
                    'ui-notification-item ui-notification-worker-reply w-full text-left',
                    full && 'rounded-2xl border border-app-border bg-app-card p-4 shadow-sm dark:ring-1 dark:ring-metallic-green/10',
                    compact && 'p-2.5 text-xs',
                    !n.read && 'ui-notification-unread ui-notification-worker-reply-unread',
                  )}
                >
                  <div className={cn('flex items-start', compact ? 'gap-2' : 'gap-3')}>
                    <div className="ui-notification-worker ui-notification-worker-reply-badge shrink-0">
                      <UserAvatar name={workerReply.workerName} size={compact ? 'sm' : 'md'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className={cn('font-semibold text-app-text', !n.read && 'font-bold')}>
                          {workerReply.workerName}
                        </p>
                        {!n.read && (
                          <span className="ui-notification-unread-dot mt-1.5 shrink-0" aria-hidden />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-app-accent">
                        {t('notifications.workerReplyTitle')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-app-text">
                        {workerReply.address || workerReply.projectTitle}
                      </p>
                      {workerReply.returnReason && (
                        <p className="mt-1 text-xs leading-relaxed text-app-muted">
                          {t('project.returnedReason')}: {workerReply.returnReason}
                        </p>
                      )}
                      <blockquote className="ui-notification-reply-quote mt-3 text-sm leading-relaxed text-app-text">
                        {workerReply.reply}
                      </blockquote>
                      <p className="mt-2 text-xs tabular-nums text-app-muted">
                        {formatDateTime(workerReply.repliedAt || n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            }

            const parsed = parseNotificationMessage(n.message);
            const showWorker = Boolean(parsed.workerName);

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
                  {showWorker ? (
                    <div
                      className={cn(
                        'ui-notification-worker',
                        compact && 'ui-notification-worker-compact',
                        parsed.action === 'returned' && 'ui-notification-worker-returned',
                      )}
                    >
                      <UserAvatar name={parsed.workerName!} size={compact ? 'sm' : 'md'} />
                      <span className="ui-notification-worker-meta">
                        <span className="ui-notification-worker-label">{t('project.assignedWorker')}</span>
                        <span className="ui-notification-worker-name">{parsed.workerName}</span>
                      </span>
                    </div>
                  ) : (
                    <NotificationIcon event={event} type={n.type} compact={compact} />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className={cn('flex items-start gap-2', compact && 'gap-1.5')}>
                      {showWorker && (
                        <NotificationIcon event={event} type={n.type} compact />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn('leading-snug', compact && 'line-clamp-2', !n.read && 'font-medium')}>
                          {parsed.headline}
                        </p>
                        {parsed.notes && (
                          <p className={cn('mt-1 text-app-muted', compact ? 'line-clamp-1 text-[11px]' : 'text-xs')}>
                            {parsed.notes}
                          </p>
                        )}
                        <p className={cn('text-app-muted', compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs')}>
                          {formatDateTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
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
