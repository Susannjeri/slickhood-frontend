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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  createdOn: string;
  entityName: string;
  entityId: number | null;
  action: string;
  description: string | null;
  value: string;
  username: string;
  success: boolean;
}

export default function AuditLogsPage() {
  const { fetchAuditLogs } = useApi();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load logs
  useEffect(() => {
    loadLogs();
  }, [page, pageSize, debouncedSearch, sortField, sortOrder]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await fetchAuditLogs({
        page,
        size: pageSize,
        sort: `${sortField},${sortOrder}`,
        filter: debouncedSearch,
      });

      setLogs(response.data || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error: any) {
      console.error("Error loading audit logs:", error);
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

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const formatValue = (value: string) => {
    try {
      // The value might be double-encoded JSON (string containing escaped JSON)
      // First, try to parse it once
      let cleaned = value
      // Remove double backslashes
      // .replace(/\\\\/g, '\\')
      //  // Remove extra escaped quotes before the end of key strings
      //  .replace(/\\""/g, '"');
      cleaned = cleaned.replace(/"imagePathMask":"(.*?)""/g, '"imagePathMask":"$1"');
       
      let parsed = JSON.parse(cleaned);
      
      // If the result is still a string (double-encoded), parse again
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      
      // If parsed is not an object, return as raw
      if (typeof parsed !== 'object' || parsed === null) {
        return [{ key: "Value", value: String(parsed), valueClass: "text-gray-900" }];
      }
      
      const entries = Object.entries(parsed);
      
      return entries.map(([key, val]) => {
        // Format the key to be more readable - convert camelCase to Title Case
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .trim();
        
        // Format the value elegantly
        let formattedValue: string;
        let valueClass = "text-gray-900";
        
        if (val === null || val === "null" || val === "") {
          formattedValue = "—";
          valueClass = "text-gray-400 italic";
        } else if (typeof val === "boolean") {
          formattedValue = val ? "Yes" : "No";
          valueClass = val ? "text-green-600 font-medium" : "text-gray-600";
        } else if (key.toLowerCase().includes("price") || key.toLowerCase().includes("amount")) {
          const numVal = Number(val);
          if (!isNaN(numVal)) {
            formattedValue = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(numVal);
            valueClass = "text-gray-900 font-semibold";
          } else {
            formattedValue = String(val);
          }
        } else if (key.toLowerCase().includes("date") || key.toLowerCase().includes("time") || key.toLowerCase().includes("createdon")) {
          try {
            const dateStr = String(val);
            if (dateStr.length > 10 && dateStr !== "null") {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                formattedValue = format(date, "PPpp");
                valueClass = "text-gray-700";
              } else {
                formattedValue = dateStr;
              }
            } else {
              formattedValue = dateStr === "null" ? "—" : dateStr;
              valueClass = dateStr === "null" ? "text-gray-400 italic" : "text-gray-900";
            }
          } catch {
            formattedValue = String(val);
          }
        } else if (typeof val === "object" && val !== null) {
          formattedValue = JSON.stringify(val);
          valueClass = "text-gray-600 text-xs font-mono";
        } else {
          formattedValue = String(val);
        }
        
        return { key: formattedKey, value: formattedValue, valueClass };
      });
    } catch (error) {
      console.error("Error parsing value:", error);
      console.log("Raw value:", value);
      
      // Try cleaning the value by removing extra backslashes and quotes
      try {
        // Remove escaped quotes and parse
        const cleanedValue = value.replace(/\\"/g, '"').replace(/"\s*"$/, '"');
        const parsed = JSON.parse(cleanedValue);
        
        if (typeof parsed === 'object' && parsed !== null) {
          const entries = Object.entries(parsed);
          return entries.map(([key, val]) => {
            const formattedKey = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
              .trim();
            
            return { 
              key: formattedKey, 
              value: String(val === null || val === "null" ? "—" : val), 
              valueClass: "text-gray-900" 
            };
          });
        }
      } catch (cleanError) {
        console.error("Error after cleaning:", cleanError);
      }
      
      // If all parsing fails, show raw value
      return [{ key: "Raw Value", value: value, valueClass: "text-gray-600 text-sm font-mono break-all" }];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
            <FileText className="w-6 h-6" style={{ color: "#EF4217" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Audit Logs
            </h1>
            <p className="text-sm text-gray-500">
              {totalElements} {totalElements === 1 ? "entry" : "entries"} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter by entity (Property, Unit, etc.)"
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
              <SelectItem value="id-desc">Newest First</SelectItem>
              <SelectItem value="id-asc">Oldest First</SelectItem>
              <SelectItem value="createdOn-desc">Date (Recent)</SelectItem>
              <SelectItem value="createdOn-asc">Date (Oldest)</SelectItem>
              <SelectItem value="entityName-asc">Entity (A-Z)</SelectItem>
              <SelectItem value="entityName-desc">Entity (Z-A)</SelectItem>
              <SelectItem value="username-asc">User (A-Z)</SelectItem>
              <SelectItem value="username-desc">User (Z-A)</SelectItem>
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
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
            <Loader2
              className="w-12 h-12 animate-spin mb-4"
              style={{ color: "#EF4217" }}
            />
            <p className="text-gray-500">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <FileText className="w-10 h-10" style={{ color: "#EF4217" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "#141130" }}>
              No audit logs found
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {search
                ? "No logs match your search. Try different keywords."
                : "No audit logs have been recorded yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date & Time</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Entity ID</TableHead>
                      <TableHead className="font-semibold">Entity</TableHead>
                      <TableHead className="font-semibold">Action</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {formatDate(log.createdOn)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{log.username}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-gray-600">
                            {log.entityId || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-medium"
                            style={{
                              borderColor: "#EF4217",
                              color: "#EF4217",
                            }}
                          >
                            {log.entityName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatAction(log.action)}</span>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Failed</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(log)}
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
                of <span className="font-medium">{totalElements}</span> entries
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
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: "#141130" }}>
                Audit Log Details
              </DialogTitle>
              <DialogDescription className="text-base">
                Log ID: <span className="font-mono font-semibold">#{selectedLog?.id}</span>
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formatValue(selectedLog.value).map((item, index) => (
                    <div 
                      key={index} 
                      className="group p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-orange-600 transition-colors">
                          {item.key}
                        </span>
                        <span className={`text-lg leading-relaxed break-words ${item.valueClass}`}>
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}