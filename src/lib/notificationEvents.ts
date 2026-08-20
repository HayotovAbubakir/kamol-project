export const NOTIFICATIONS_UPDATED_EVENT = 'notifications-updated';

export function notifyNotificationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}
