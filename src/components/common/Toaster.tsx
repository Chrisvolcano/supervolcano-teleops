"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        className: "rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lg",
        duration: 3500,
      }}
    />
  );
}
