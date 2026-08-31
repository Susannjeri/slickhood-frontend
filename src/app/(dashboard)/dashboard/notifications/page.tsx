"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  MessageSquare,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { MyNotifications } from "@/components/notifications/MyNotifications";

interface Notification {
  notificationId: number;
  channel: string;
  currency: string | null;
  description: string | null;
  createdOn: string;
  retry: boolean;
  status: string | null;
  recipient: string;
  delivered: boolean;
  network: string | null;
  cost: number;
  notificationType: string;
  retryCount: number;
  callbackIP: string | null;
  lastUpdateOn: string;
}

function AdminNotificationsPage() {
  const { getNotificationList } = useApi();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState("notificationId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, [page, pageSize, debouncedSearch, sortField, sortOrder]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getNotificationList({
        page,
        size: pageSize,
        sort: `${sortField},${sortOrder}`,
        filter: debouncedSearch,
      });

      setNotifications(response.data || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (value: string) => {
    const [field, order] = value.split("-");
    setSortField(field);
    setSortOrder(order as "asc" | "desc");
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch (error) {
      return dateString;
    }
  };

  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatCost = (cost: number, currency?: string | null) => {
    // if (cost === 0) return "—";
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cost);
    return currency ? `${currency} ${formatted}` : formatted;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toUpperCase()) {
      case "EMAIL":
        return <Mail className="w-4 h-4" />;
      case "SMS":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getChannelBadgeColor = (channel: string) => {
    switch (channel.toUpperCase()) {
      case "EMAIL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "SMS":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const viewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
            <Bell className="w-6 h-6" style={{ color: "#EF4217" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Notifications
            </h1>
            <p className="text-sm text-gray-500">
              {totalElements} {totalElements === 1 ? "notification" : "notifications"} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter by recipient or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={`${sortField}-${sortOrder}`} onValueChange={handleSort}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notificationId-desc">Newest First</SelectItem>
              <SelectItem value="notificationId-asc">Oldest First</SelectItem>
              <SelectItem value="createdOn-desc">Created (Recent)</SelectItem>
              <SelectItem value="createdOn-asc">Created (Oldest)</SelectItem>
              <SelectItem value="lastUpdateOn-desc">Updated (Recent)</SelectItem>
              <SelectItem value="lastUpdateOn-asc">Updated (Oldest)</SelectItem>
              <SelectItem value="notificationType-asc">Type (A-Z)</SelectItem>
              <SelectItem value="notificationType-desc">Type (Z-A)</SelectItem>
              <SelectItem value="recipient-asc">Recipient (A-Z)</SelectItem>
              <SelectItem value="recipient-desc">Recipient (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
            <Loader2
              className="w-12 h-12 animate-spin mb-4"
              style={{ color: "#EF4217" }}
            />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Bell className="w-10 h-10" style={{ color: "#EF4217" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "#141130" }}>
              No notifications found
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {search
                ? "No notifications match your search. Try different keywords."
                : "No notifications have been sent yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Channel</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Recipient</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Retries</TableHead>
                      <TableHead className="font-semibold">Cost</TableHead>
                      <TableHead className="font-semibold text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow key={notification.notificationId} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm text-gray-600">
                          #{notification.notificationId}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {formatDate(notification.createdOn)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium flex items-center gap-1 w-fit ${getChannelBadgeColor(notification.channel)}`}
                          >
                            {getChannelIcon(notification.channel)}
                            {notification.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatNotificationType(notification.notificationType)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{notification.recipient}</span>
                          {notification.network && (
                            <span className="block text-xs text-gray-500">{notification.network}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notification.delivered ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Delivered</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Failed</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {notification.retryCount > 0 ? (
                            <div className="flex items-center gap-1 text-orange-600">
                              <RefreshCw className="w-3 h-3" />
                              <span className="text-sm font-medium">{notification.retryCount}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatCost(notification.cost, notification.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(notification)}
                            className="hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-medium">{page * pageSize + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min((page + 1) * pageSize, totalElements)}
                </span>{" "}
                of <span className="font-medium">{totalElements}</span> notifications
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="hover:bg-gray-100 transition"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="hover:bg-gray-100 transition"
                >
                  Previous
                </Button>

                <span className="px-3 py-1 text-sm">
                  Page <span className="font-medium">{page + 1}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="hover:bg-gray-100 transition"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="hover:bg-gray-100 transition"
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Details Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: "#141130" }}>
                Notification Details
              </DialogTitle>
              <DialogDescription className="text-base">
                ID: <span className="font-mono font-semibold">#{selectedNotification?.notificationId}</span>
              </DialogDescription>
            </DialogHeader>

            {selectedNotification && (
              <div className="mt-6 space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border-2 ${
                  selectedNotification.delivered 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedNotification.delivered ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">Successfully Delivered</p>
                          <p className="text-sm text-green-700">
                            Last updated: {formatDate(selectedNotification.lastUpdateOn)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-600" />
                        <div>
                          <p className="font-semibold text-red-900">Delivery Failed</p>
                          <p className="text-sm text-red-700">
                            {selectedNotification.retry 
                              ? `Retries: ${selectedNotification.retryCount}` 
                              : 'Retry disabled'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard label="Channel" value={selectedNotification.channel} icon={getChannelIcon(selectedNotification.channel)} />
                  <DetailCard label="Notification Type" value={formatNotificationType(selectedNotification.notificationType)} />
                  <DetailCard label="Recipient" value={selectedNotification.recipient} />
                  <DetailCard label="Network" value={selectedNotification.network || "—"} />
                  <DetailCard label="Created On" value={formatDate(selectedNotification.createdOn)} />
                  <DetailCard label="Last Updated" value={formatDate(selectedNotification.lastUpdateOn)} />
                  <DetailCard 
                    label="Cost" 
                    value={formatCost(selectedNotification.cost, selectedNotification.currency)}
                    icon={selectedNotification.cost > 0 ? <DollarSign className="w-4 h-4" /> : undefined}
                  />
                  <DetailCard label="Retry Count" value={selectedNotification.retryCount.toString()} />
                  <DetailCard label="Retry Enabled" value={selectedNotification.retry ? "Yes" : "No"} />
                  <DetailCard label="Status" value={selectedNotification.status || "—"} />
                  <DetailCard label="Callback IP" value={selectedNotification.callbackIP || "—"} className="md:col-span-2" />
                  {selectedNotification.description && (
                    <DetailCard label="Description" value={selectedNotification.description} className="md:col-span-2" />
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function DetailCard({ 
  label, 
  value, 
  icon, 
  className = "" 
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex flex-col space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-orange-600 transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-600">{icon}</span>}
          <span className="text-lg leading-relaxed break-words break-all text-gray-900 font-medium">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const permissions = useAuthStore(state => state.permissions);
  return permissions.includes("view_notifications") ? <AdminNotificationsPage /> : <MyNotifications />;
}
