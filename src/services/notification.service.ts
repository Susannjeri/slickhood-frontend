import { API } from "@/lib/api";

export interface MyNotification {
  id: number;
  channel: string;
  notificationType: string;
  message: string;
  delivered: boolean;
  read: boolean;
  createdOn: string;
  lastUpdatedOn?: string;
  actionPath?: string;
  actionStatus?: string;
}

export const NOTIFICATIONS_CHANGED_EVENT = "slickhood:notifications-changed";

export type NotificationCategory = "BILLING" | "PROPERTY" | "MARKETPLACE_DELIVERY" | "SECURITY" | "MARKETING";
export interface NotificationCategoryPreference {
  category: NotificationCategory;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  smsAvailable: boolean;
  whatsappAvailable: boolean;
  version: number;
}
export interface NotificationPreferences {
  inAppRequired: boolean;
  phoneVerified: boolean;
  maskedPhone?: string;
  whatsappConsented: boolean;
  consentVersion: string;
  categories: NotificationCategoryPreference[];
}
export interface NotificationPreferenceUpdate {
  whatsappConsent: boolean;
  categories: Pick<NotificationCategoryPreference, "category" | "emailEnabled" | "smsEnabled" | "whatsappEnabled" | "version">[];
}

export const notificationService = {
  mine: (page = 0, size = 10) =>
    API.get("/notification/mine", { params: { page, size, sort: "createdOn,desc" } }),
  unreadCount: () => API.get("/notification/mine/unread-count"),
  markRead: (id: number) => API.patch(`/notification/mine/${id}/read`),
  preferences: () => API.get("/notification/preferences"),
  updatePreferences: (value: NotificationPreferenceUpdate) => API.put("/notification/preferences", value),
};
