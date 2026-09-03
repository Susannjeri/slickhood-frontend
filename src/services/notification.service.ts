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
}

export const notificationService = {
  mine: (page = 0, size = 10) =>
    API.get("/notification/mine", { params: { page, size, sort: "createdOn,desc" } }),
  markRead: (id: number) => API.patch(`/notification/mine/${id}/read`),
};
