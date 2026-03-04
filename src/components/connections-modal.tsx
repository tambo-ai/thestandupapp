"use client";

import { useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { Pipes, WorkOsWidgets } from "@workos-inc/widgets";
import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionsModal({ isOpen, onClose }: ConnectionsModalProps) {
  const { getAccessToken } = useAccessToken();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full mx-4 border border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Connect your accounts
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#AAA]" />
          </button>
        </div>
        <div className="px-5 pt-4 pb-5">
          <WorkOsWidgets>
            <Pipes authToken={getAccessToken} />
          </WorkOsWidgets>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}
