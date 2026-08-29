"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  MapPin,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Can, { usePermissions } from "@/components/auth/Can";
import PropertyRoleBadges from "@/components/property/PropertyRoleBadges";
import ProfileGateModal, { ProfileGateFields } from "@/components/auth/ProfileGateModal";
import { usePropertyMetadata } from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface Property {
  id: number;
  name: string;
  type: string;
  category: string;
  address: string;
  mapLocation: string;
  currency: string;
  thumbNail: string;
  userRoleInProperty?: string;
}

const ROLE_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-orange-400",
  "bg-purple-500", "bg-pink-500", "bg-teal-500",
];

export default function PropertiesPage() {
  const router = useRouter();
  const { getProperties } = useApi();
  const { hasPermission } = usePermissions();

  const roles = useAuthStore((s) => s.roles);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);
  const activeRole = useAuthStore((s) => s.activeRole);
  const propertyIds = useAuthStore((s) => s.propertyIds);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { getPropertyTypeName, isLoadingTypes } = usePropertyMetadata();

  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [profileGate, setProfileGate] = useState<ProfileGateFields | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setProperties([]);
    setPage(0);
  }, [activeRole?.title]);

  useEffect(() => {
    const initAndLoad = async () => {
      setLoading(true);
      if (!isLoadingTypes) {
        try {
          await loadProperties(propertyIds);
        } finally {
          setLoading(false);
        }
      }
    };
    initAndLoad();
  }, [page, pageSize, debouncedSearch, sortField, sortOrder, isLoadingTypes, activeRole?.title, propertyIds]);

  const loadProperties = async (currentPropertyIds: number[]) => {
    try {
      setError(null);
      const response: any = await getProperties({
        page,
        size: pageSize,
        search: debouncedSearch,
        sort: `${sortField},${sortOrder}`,
      });

      if (response?.profileGate) {
        setProfileGate(response.fields);
        return;
      }

      const filtered = activeRole
        ? response.data.filter((p: Property) => currentPropertyIds.includes(p.id))
        : response.data;

      setProperties(filtered);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);

      response.data.forEach((property: any) => {
        if (property.thumbNail && !imageCache[property.thumbNail]) {
          loadPropertyImage(property.thumbNail);
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to load properties");
      console.error("Error loading properties:", err);
    }
  };

  const loadPropertyImage = async (imagePath: string) => {
    try {
      setImageCache((prev) => ({ ...prev, [imagePath]: imagePath }));
    } catch (err) {
      console.error("Error loading image:", err);
    }
  };

  const handleViewProperty = (propertyId: number) => {
    router.push(`/dashboard/property/properties/details/${propertyId}`);
  };

  const handleSort = (value: string) => {
    const [field, order] = value.split("-");
    setSortField(field);
    setSortOrder(order as "asc" | "desc");
    setPage(0);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="space-y-1.5">
        <Breadcrumb items={[{ label: "Properties" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141130]">Properties</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and view all your properties</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Can permissions={["create_unit"]}>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/unit/create")}
                className="transition-all duration-200 hover:border-[#EF4217] hover:text-[#EF4217] active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Unit
              </Button>
            </Can>
            <Can permissions={["create_property"]}>
              <Button
                onClick={() => router.push("/dashboard/property/create")}
                className="group relative flex items-center px-5 py-2.5 text-white font-medium rounded-lg transition-all duration-300 ease-out hover:bg-[#d93712] hover:shadow-[0_0_20px_rgba(239,66,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]"
                style={{ backgroundColor: "#EF4217" }}
              >
                <Plus className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                <span>Create Property</span>
                <span className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <Select value={`${sortField}-${sortOrder}`} onValueChange={handleSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id-desc">Newest First</SelectItem>
              <SelectItem value="id-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="type-asc">Type (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => { setPageSize(Number(value)); setPage(0); }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: "#EF4217" }} />
          <p className="text-gray-500">Loading properties...</p>
        </div>

      ) : properties.length === 0 ? (
        /* ── Empty States ── */
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <MapPin className="w-10 h-10" style={{ color: "#EF4217" }} />
          </div>

          {search ? (
            <>
              <h3 className="text-xl font-semibold mb-2 text-[#141130]">No properties found</h3>
              <p className="text-gray-500 text-center max-w-md">
                No properties match your search. Try different keywords.
              </p>
            </>
          ) : hasPermission(["create_property"]) ? (
            <>
              <h3 className="text-xl font-semibold mb-2 text-[#141130]">No properties yet</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Get started by creating your first property.
              </p>
              <Button
                onClick={() => router.push("/dashboard/property/create")}
                className="text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Property
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2 text-[#141130]">No properties for this role</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Your <span className="font-medium text-gray-700">{activeRole?.title}</span> role
                doesn&apos;t have any properties assigned to it yet.
                {roles.length > 1 && " Switch to a different role to see your properties."}
              </p>
              {roles.length > 1 && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs text-muted-foreground">Switch to:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {roles
                      .filter(r => r.title !== activeRole?.title && (r.properties?.length || 0) > 0)
                      .map((r) => (
                        <button
                          key={r.title}
                          onClick={() => { setActiveRole(r); router.push("/dashboard"); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all hover:border-[#EF4217] hover:bg-[#EF4217]/5 text-[#141130]"
                          style={{ borderColor: "#e5e7eb" }}
                        >
                          <span className={cn(
                            "size-2 rounded-full",
                            ROLE_COLORS[roles.findIndex(ro => ro.title === r.title) % ROLE_COLORS.length]
                          )} />
                          {r.title}
                          <span className="text-xs text-muted-foreground">
                            ({r.properties?.length} {r.properties?.length === 1 ? "property" : "properties"})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      ) : (
        /* ── Table ── */
        <>
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50 border-b">
                    <TableHead className="w-16 pl-4" />
                    <TableHead className="font-semibold text-[#141130] min-w-[160px]">Property</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Type</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Category</TableHead>
                    <TableHead className="font-semibold text-[#141130] min-w-[200px]">Location</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Role</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Currency</TableHead>
                    <TableHead className="font-semibold text-[#141130] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow
                      key={property.id}
                      onClick={() => handleViewProperty(property.id)}
                      className="cursor-pointer hover:bg-[#EF4217]/5 border-b last:border-0 group transition-colors"
                    >
                      {/* Thumbnail */}
                      <TableCell className="pl-4 py-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {imageCache[property.thumbNail] ? (
                            <img
                              src={imageCache[property.thumbNail]}
                              alt={property.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="py-3">
                        <span className="font-bold text-[#141130] group-hover:text-[#EF4217] transition-colors">
                          {property.name}
                        </span>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                          style={{ backgroundColor: "#EF4217" }}
                        >
                          {getPropertyTypeName(property.type)}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-3">
                        {property.category && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                            {property.category}
                          </span>
                        )}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-3">
                        <div className="flex items-start gap-1.5 text-sm text-gray-600 max-w-[220px]">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                          <span className="line-clamp-2">{property.address}</span>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell className="py-3">
                        <PropertyRoleBadges propertyId={property.id} />
                      </TableCell>

                      {/* Currency */}
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">{property.currency}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sm font-medium transition-all duration-150 hover:bg-[#EF4217]/10 active:scale-95"
                            style={{ color: "#EF4217" }}
                            onClick={() => handleViewProperty(property.id)}
                          >
                            View
                          </Button>
                          <Can permissions={["edit_property"]}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-sm font-medium text-gray-600 transition-all duration-150 hover:text-[#141130] hover:bg-gray-100 active:scale-95"
                              onClick={() => router.push(`/dashboard/property/properties/edit/${property.id}`)}
                            >
                              Edit
                            </Button>
                          </Can>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">{page * pageSize + 1}</span>
              {" "}to{" "}
              <span className="font-medium">{Math.min((page + 1) * pageSize, totalElements)}</span>
              {" "}of{" "}
              <span className="font-medium">{totalElements}</span> properties
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>Previous</Button>
              <span className="px-3 py-1 text-sm">
                Page <span className="font-medium">{page + 1}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Next</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</Button>
            </div>
          </div>
        </>
      )}

      <ProfileGateModal
        open={!!profileGate}
        fields={profileGate ?? {}}
        onClose={() => {}}
      />
    </div>
  );
}
