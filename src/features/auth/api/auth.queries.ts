import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "./auth.api";
import { useAuthStore } from "../store/auth.store";

/**
 * Bootstraps the session on app load: if a token exists in storage, fetch the
 * agent. 401s are handled by the api-client interceptor (logout).
 */
export function useSessionBootstrap() {
  const { token, isLoggedIn, setAgent, setBootstrapped, isBootstrapping } = useAuthStore();

  const query = useQuery({
    queryKey: ["auth", "getReseller"],
    queryFn: authApi.getReseller,
    enabled: token !== null && !isLoggedIn,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) setAgent(query.data);
    else if (query.isError) setBootstrapped();
  }, [query.data, query.isError, setAgent, setBootstrapped]);

  return { isBootstrapping };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (data.status === "ok") setSession(data.reseller, data.jwtToken);
    },
  });
}

export function useSignup() {
  return useMutation({ mutationFn: authApi.signup });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useForgotPasswordConfirm() {
  return useMutation({ mutationFn: authApi.forgotPasswordConfirm });
}

export function useCertificateDetails(agentCode: string | undefined, randomString: string | undefined) {
  return useQuery({
    queryKey: ["auth", "certificate", agentCode, randomString],
    queryFn: () => authApi.getCertificateDetails(agentCode!, randomString!),
    enabled: Boolean(agentCode && randomString),
  });
}

/** Convenience selectors used across the app. */
export function useAgent() {
  const agent = useAuthStore((s) => s.agent);
  return {
    agent,
    flags: agent?.configuration ?? null,
    isReseller: agent?.role === "reseller",
    isSubAgent: agent?.role === "sub-agent",
  };
}
