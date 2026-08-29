"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Loader2, Briefcase, CheckCircle2, Clock, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";

interface UnitJob {
  id: number;
  createdOn: string;
  active: boolean;
  createdBy: number;
  lastModifiedDate: string;
  unitId: number;
  count: number;
  completed: boolean;
  description: string;
  email: string;
}

interface JobsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobsUpdate?: () => void;
}

export default function JobsDrawer({ open, onOpenChange, onJobsUpdate }: JobsDrawerProps) {
  const { handleGetCreateUnitJobs } = useApi();

  const [jobs, setJobs] = useState<UnitJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pendingCount, setPendingCount] = useState(0);

  // Load jobs when drawer opens or pagination changes
  useEffect(() => {
    if (open) {
      loadJobs();
    }
  }, [open, page, pageSize, sortField, sortOrder]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await handleGetCreateUnitJobs({
        page,
        size: pageSize,
        sort: `${sortField},${sortOrder}`,
      });

      const jobsData = response.data || [];
      setJobs(jobsData);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);

      // Calculate pending jobs count
      const pending = jobsData.filter((job: UnitJob) => !job.completed).length;
      setPendingCount(pending);

      // Notify parent to update pending count
      if (onJobsUpdate) {
        onJobsUpdate();
      }
    } catch (error: any) {
      console.error("Error loading jobs:", error);
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

  const handleRefresh = () => {
    setPage(0);
    loadJobs();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-6xl">
          <DrawerHeader className="px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#FEE2E2" }}
                >
                  <Briefcase className="w-5 h-5" style={{ color: "#EF4217" }} />
                </div>
                <div>
                  <DrawerTitle className="text-2xl font-bold" style={{ color: "#141130" }}>
                    Unit Creation Jobs
                  </DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2">
                    <span>
                      {totalElements} {totalElements === 1 ? "job" : "jobs"} total
                    </span>
                    {pendingCount > 0 && (
                      <>
                        <span>•</span>
                        <Badge
                          className="text-white"
                          style={{ backgroundColor: "#EF4217" }}
                        >
                          {pendingCount} Pending
                        </Badge>
                      </>
                    )}
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-4">
              {/* Filters and Actions */}
              <div className="flex items-center gap-3">
                <Select value={`${sortField}-${sortOrder}`} onValueChange={handleSort}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id-desc">Newest First</SelectItem>
                    <SelectItem value="id-asc">Oldest First</SelectItem>
                    <SelectItem value="createdOn-desc">Date (Recent)</SelectItem>
                    <SelectItem value="createdOn-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="completed-asc">Pending First</SelectItem>
                    <SelectItem value="completed-desc">Completed First</SelectItem>
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Table */}
              {loading && jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
                  <Loader2
                    className="w-12 h-12 animate-spin mb-4"
                    style={{ color: "#EF4217" }}
                  />
                  <p className="text-gray-500">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: "#FEE2E2" }}
                  >
                    <Briefcase className="w-10 h-10" style={{ color: "#EF4217" }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: "#141130" }}>
                    No jobs found
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    No unit creation jobs have been recorded yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Job ID</TableHead>
                            <TableHead className="font-semibold">Created On</TableHead>
                            <TableHead className="font-semibold">Unit ID</TableHead>
                            <TableHead className="font-semibold">Count</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Email</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobs.map((job) => (
                            <TableRow key={job.id} className="hover:bg-gray-50">
                              <TableCell>
                                <span className="font-mono text-sm font-medium">
                                  #{job.id}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(job.createdOn)}
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
                                  Unit #{job.unitId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold" style={{ color: "#141130" }}>
                                  {job.count}
                                </span>
                              </TableCell>
                              <TableCell>
                                {job.completed ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Completed</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">Pending</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {job.email}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                                {job.description || "—"}
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
                      of <span className="font-medium">{totalElements}</span> jobs
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(0)}
                        disabled={page === 0 || loading}
                        className="hover:bg-gray-100 transition"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 0 || loading}
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
                        disabled={page >= totalPages - 1 || loading}
                        className="hover:bg-gray-100 transition"
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(totalPages - 1)}
                        disabled={page >= totalPages - 1 || loading}
                        className="hover:bg-gray-100 transition"
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}