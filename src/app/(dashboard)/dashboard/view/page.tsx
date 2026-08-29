"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Shield,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Settings,
  Eye,
} from "lucide-react";
import Can from "@/components/auth/Can";
import { toast } from "sonner";

// Types
type PaymentType = "M-Pesa" | "Flutterwave";

interface Param {
  id: number;
  param: string;
  value: string;
}

interface ParamGroup {
  name: string;
  type: PaymentType;
  params: Param[];
  verified: boolean;
  createdBy: string;
}

interface GetAllParamsResponse {
  success: boolean;
  code: string;
  description: string;
  data: ParamGroup[];
  totalPages: number;
  totalElements: number;
  size: number;
}

export default function SuperAdminParamsTable() {
  const { handleGetAllParams, handleVerifyParams } = useApi();

  const [paramGroups, setParamGroups] = useState<ParamGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal state
  const [selectedGroup, setSelectedGroup] = useState<ParamGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch params
  useEffect(() => {
    loadParams();
  }, [page, pageSize, debouncedSearch, sortField, sortOrder]);

  const loadParams = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: GetAllParamsResponse = await handleGetAllParams({
        page,
        size: pageSize,
        filter: debouncedSearch,
        sort: `${sortField},${sortOrder}`,
      });

      setParamGroups(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      setError(err.message || "Failed to load payment settings");
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(0);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  const handleToggleVerification = async (groupName: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await handleVerifyParams(groupName, newStatus);

      // Update local state immediately for better UX
      setParamGroups((prev) =>
        prev.map((group) =>
          group.name === groupName ? { ...group, verified: newStatus } : group
        )
      );

      toast.success(
        newStatus
          ? `${groupName} has been verified`
          : `${groupName} has been unverified`
      );
    } catch (error) {
      console.error("Error toggling verification:", error);
      toast.error("Failed to update verification status");
    }
  };

  const handleViewDetails = (group: ParamGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalElements);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <Settings className="w-6 h-6" style={{ color: "#EF4217" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Payment Settings Verification
            </h1>
            <p className="text-sm text-gray-500">
              Review and verify payment gateway configurations
            </p>
          </div>
        </div>

        {/* Search + Rows per page */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, type, user..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-[#EF4217]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF4217]"
              
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border rounded-lg shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center font-semibold hover:text-blue-600"
                  >
                    Name {getSortIcon("name")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("type")}
                    className="flex items-center font-semibold hover:text-blue-600"
                  >
                    Type {getSortIcon("type")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("createdBy")}
                    className="flex items-center font-semibold hover:text-blue-600"
                  >
                    Created By {getSortIcon("createdBy")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("verified")}
                    className="flex items-center font-semibold hover:text-blue-600"
                  >
                    Status {getSortIcon("verified")}
                  </button>
                </TableHead>
                <Can permissions={["verify_param"]}>
                <TableHead className="text-center">
                  <span className="font-semibold">Verification</span>
                </TableHead>
                </Can>
                <TableHead className="text-center">
                  <span className="font-semibold">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2
                      className="w-8 h-8 animate-spin mx-auto mb-2"
                      style={{ color: "#EF4217" }}
                    />
                    <p className="text-sm text-gray-500">Loading payment settings...</p>
                  </TableCell>
                </TableRow>
              ) : paramGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No payment settings found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {search
                        ? "Try adjusting your search criteria"
                        : "Payment settings will appear here once users configure them"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paramGroups.map((group, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {group.type === "M-Pesa" ? (
                          <Smartphone className="w-4 h-4 text-blue-600" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="font-medium" style={{ color: "#141130" }}>
                          {group.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          group.type === "M-Pesa"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {group.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">{group.createdBy}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {group.verified ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Verified
                            </span>
                            {/* <ShieldCheck className="w-4 h-4 text-[#EF4217]" />
                            <span className="text-sm font-medium text-[#EF4217]">
                              Verified
                            </span> */}
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">
                              Not Verified
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            handleToggleVerification(group.name, group.verified)
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            group.verified
                              ? "bg-green-600 focus:ring-green-600"
                              : "bg-gray-200 focus:ring-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              group.verified ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleViewDetails(group)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && paramGroups.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing <span className="font-medium">{startIndex + 1}</span>–
              <span className="font-medium">{endIndex}</span> of{" "}
              <span className="font-medium">{totalElements}</span> settings
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3">
                Page <span className="font-medium">{page + 1}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGroup?.type === "M-Pesa" ? (
                <Smartphone className="w-5 h-5 text-blue-600" />
              ) : (
                <CreditCard className="w-5 h-5 text-purple-600" />
              )}
              <span style={{ color: "#141130" }}>{selectedGroup?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Payment gateway configuration details
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6 py-4">
              {/* Overview Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment Type</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      selectedGroup.type === "M-Pesa"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {selectedGroup.type}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Created By</p>
                  <p className="text-sm font-medium" style={{ color: "#141130" }}>
                    {selectedGroup.createdBy}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Verification Status</p>
                  <div className="flex items-center gap-2">
                    {selectedGroup.verified ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">
                          Not Verified
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* <div>
                  <p className="text-sm text-gray-500 mb-1">Total Settings</p>
                  <p className="text-sm font-medium" style={{ color: "#141130" }}>
                    {selectedGroup.params.length} configured
                  </p>
                </div> */}
              </div>

              {/* Parameters Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3" style={{ color: "#141130" }}>
                  Configuration Parameters
                </h3>
                <div className="space-y-3">
                  {selectedGroup.params.map((param, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1" style={{ color: "#141130" }}>
                            {param.param}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {param.value === "*****" ? (
                              <span className="text-gray-400">••••••••••</span>
                            ) : (
                              param.value
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 ml-2">ID: {param.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}