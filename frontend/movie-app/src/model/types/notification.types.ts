export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}