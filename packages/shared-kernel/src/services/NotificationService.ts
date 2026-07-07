export interface NotificationRequest {
  recipientId: string;
  templateId: string;
  data: Record<string, any>;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  allowedChannels?: ('Email' | 'SMS' | 'Push' | 'WhatsApp')[]; 
}

export interface NotificationReceipt {
  notificationId: string;
  deliveredChannel: 'Email' | 'SMS' | 'Push' | 'WhatsApp';
  timestamp: Date;
}

/**
 * Strict Notification Contract.
 * Capabilities submit requests; the service resolves user preferences, limits, and delivery.
 */
export interface NotificationService {
  dispatch(request: NotificationRequest): Promise<string>; // Returns JobId
  checkReceipt(notificationId: string): Promise<NotificationReceipt | null>;
}
