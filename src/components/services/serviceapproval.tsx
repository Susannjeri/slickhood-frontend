"use client";

import { useEffect, useState } from "react";
import { Check, X, Eye } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPendingServices } from "@/services/serviceProvider";
import { PendingService } from "@/types/service"; // Adjust path as needed
import ServiceReviewModal from "./servicereviewmodal";

interface ServiceApprovalProps {
  onCountChange?: (count: number) => void;
}

export default function ServiceApproval({ onCountChange }: ServiceApprovalProps) {
  const { token } = useAuthStore();

  const [services, setServices] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page] = useState<number>(0);
  const [pageSize] = useState<number>(20);

  // State to control the Review Modal
  const [selectedService, setSelectedService] = useState<PendingService | null>(null);

  const fetchPendingServices = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getPendingServices(token, {
        page,
        size: pageSize,
        sort: "createdOn,asc",
      });

      if (response.data?.success) {
        const fetchedServices = response.data.data || [];
        setServices(fetchedServices);
        onCountChange?.(fetchedServices.length);
      } else {
        setError(response.data?.description || "Failed to retrieve pending services.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.description || "An error occurred while fetching pending services."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingServices();
  }, [token, page]);

  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading pending services...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchPendingServices}
          className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[720px] w-full text-left text-xs text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold uppercase tracking-wider text-[#020B2D]">
            <tr>
              <th scope="col" className="px-4 py-3">Provider</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Pricing</th>
              <th scope="col" className="px-4 py-3">Submitted On</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Risk Assessment</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((service) => (
              <tr key={service.id} className="transition-colors hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-[#020B2D]">
                  {service.serviceProviderName}
                </td>
                <td className="px-4 py-3">{service.categoryName}</td>
                <td className="px-4 py-3 font-medium">
                  {service.currency} {service.amount.toFixed(2)}{" "}
                  <span className="text-[10px] font-normal text-gray-400">
                    / {service.pricingUnit.replace("_", " ").toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(service.createdOn).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200/60">
                    {service.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200/60">
                    {service.riskLabel.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Wire Review Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedService(service)}
                      title="View Details"
                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                      <Eye size={12} className="text-gray-500" />
                      Review
                    </button>

                    {/* Inline Approve/Reject buttons can either open the modal OR trigger API directly. Here they open the modal for safety. */}
                    <button
                      type="button"
                      onClick={() => setSelectedService(service)}
                      title="Approve Service"
                      className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedService(service)}
                      title="Reject Service"
                      className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {services.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-gray-400">
                  No pending services waiting for approval.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Render the Review Modal when a service is selected */}
      {selectedService && (
        <ServiceReviewModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSuccess={fetchPendingServices} // Refresh table data after action
        />
      )}
    </>
  );
}
