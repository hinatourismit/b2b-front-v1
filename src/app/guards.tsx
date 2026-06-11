import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useAgent } from "@/features/auth/api/auth.queries";
import { MODULES, enabledModules, fallbackHome, type ModuleKey } from "@/config/modules";
import { FullPageLoader } from "@/components/common/FullPageLoader";

/**
 * Replicates the old app's B2BPrivateRoute: must be logged in, must have a
 * configuration, and at least one module enabled — else /entrydenied.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isBootstrapping, agent } = useAuthStore();

  if (isBootstrapping) return <FullPageLoader />;
  if (!isLoggedIn) return <Navigate replace to="/login" />;

  if (!agent?.configuration) return <Navigate replace to="/entrydenied" />;
  if (enabledModules(agent.configuration).length === 0) {
    return <Navigate replace to="/entrydenied" />;
  }

  return children;
}

/**
 * Replicates the seven B2BNot<X>PrivateRoute guards: if this module's flag is
 * off for the agent, redirect to the highest-priority enabled module.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { flags } = useAgent();
  const config = MODULES[module];

  if (!config.enabled || flags?.[config.flag] !== true) {
    return <Navigate replace to={fallbackHome(flags)} />;
  }

  return children;
}

/** Agent-management/markup screens are reseller-role only. */
export function ResellerOnly({ children }: { children: ReactNode }) {
  const { isReseller } = useAgent();
  if (!isReseller) return <Navigate replace to="/" />;
  return children;
}
