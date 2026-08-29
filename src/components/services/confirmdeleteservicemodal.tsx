

// components/ConfirmDeleteServiceModal.tsx
"use client";

import { deleteService } from "@/services/serviceProvider";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";
import { useState } from "react";

interface Props {
  serviceId: number;
  categoryName: string;
  onClose: () => void;
  onDeleted: (serviceId: number) => void;
}

export default function ConfirmDeleteServiceModal({
  serviceId,
  categoryName,
  onClose,
  onDeleted,
}: Props) {
  const { token } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      const response = await deleteService(token, serviceId);
      if (!response.data.success) {
        setError(response.data.description || "Failed to remove service.");
        return;
      }
      onDeleted(serviceId);
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.description ||
            "Failed to remove service. Please try again."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-[#020B2D]">
          Remove {categoryName}?
        </h2>
        <p className="mt-2 text-xs leading-5 text-gray-500">
          This will remove the service from your listings. If it was already
          listed, it will no longer be visible or bookable. This action
          cannot be undone by you — you'd need to contact an admin to restore it.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-[#020B2D]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Removing..." : "Remove Service"}
          </button>
        </div>
      </div>
    </div>
  );
}