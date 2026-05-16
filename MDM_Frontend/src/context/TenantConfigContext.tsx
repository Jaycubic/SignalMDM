/**
 * src/context/TenantConfigContext.tsx
 * ---------------------------------------
 * Global React context that holds the active tenant scope for the current
 * platform admin session.
 *
 * All data screens consume `useTenantConfig()` to get `activeTenantId`.
 * If null → fetch ALL tenants. If set → scope to that tenant.
 *
 * The context is loaded once on mount (after auth) and updated by the
 * TenantScopeBar component in MainLayout.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { tenantConfigService, type TenantConfig, type TenantConfigMode } from '../services/tenantConfigService';
import { useAuth } from './AuthContext';

// ─── Shape ────────────────────────────────────────────────────

interface TenantConfigValue {
  /** 'ALL' or 'SPECIFIC' */
  mode:          TenantConfigMode;
  /** null when mode='ALL', UUID string when mode='SPECIFIC' */
  activeTenantId:   string | null;
  /** Human-readable name of the active tenant, or null */
  activeTenantName: string | null;
  /** true while the initial load is in progress */
  isLoading: boolean;
  /** Set scope to ALL tenants */
  setAll: () => Promise<void>;
  /** Scope to a specific tenant */
  setSpecific: (id: string, name: string) => Promise<void>;
}

const TenantConfigContext = createContext<TenantConfigValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, admin } = useAuth();
  const [cfg, setCfg]           = useState<TenantConfig>({ mode: 'ALL', tenant_id: null, tenant_name: null });
  const [isLoading, setIsLoading] = useState(true);

  // Only platform admins use multi-tenant scope; others are implicitly scoped
  const isPlatform = admin?.tenant_id === 'platform';

  const reload = useCallback(async () => {
    if (!isAuthenticated || !isPlatform) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await tenantConfigService.get();
      setCfg(result);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isPlatform]);

  useEffect(() => { reload(); }, [reload]);

  const setAll = useCallback(async () => {
    const result = await tenantConfigService.setAll();
    setCfg(result);
  }, []);

  const setSpecific = useCallback(async (id: string, name: string) => {
    const result = await tenantConfigService.setSpecific(id, name);
    setCfg(result);
  }, []);

  return (
    <TenantConfigContext.Provider
      value={{
        mode:             cfg.mode,
        activeTenantId:   cfg.tenant_id,
        activeTenantName: cfg.tenant_name,
        isLoading,
        setAll,
        setSpecific,
      }}
    >
      {children}
    </TenantConfigContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────

export function useTenantConfig(): TenantConfigValue {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error('useTenantConfig must be used inside <TenantConfigProvider>.');
  return ctx;
}
