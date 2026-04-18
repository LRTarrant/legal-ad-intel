"use client";

import { createContext, useContext } from "react";
import type { TenantBranding } from "@/lib/tenant-config";
import { DEFAULT_LMI_BRANDING } from "@/lib/tenant-config";

const TenantContext = createContext<TenantBranding>(DEFAULT_LMI_BRANDING);

export function TenantProvider({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={branding}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantBranding {
  return useContext(TenantContext);
}
