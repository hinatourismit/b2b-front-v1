import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./guards";
import { MainLayout } from "./layouts/MainLayout";
import { FullPageLoader } from "@/components/common/FullPageLoader";

// Auth & public pages
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const VerificationPage = lazy(() => import("@/features/auth/pages/VerificationPage"));
const EntryDeniedPage = lazy(() => import("@/features/auth/pages/EntryDeniedPage"));

// Dashboard & placeholders
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ModulePlaceholderPage = lazy(() => import("@/features/dashboard/pages/ModulePlaceholderPage"));

// Payment return targets (paths are CCAvenue contract — do not change)
const PaymentDeclinedPage = lazy(() => import("@/features/payments/pages/PaymentDeclinedPage"));
const DepositSuccessPage = lazy(() => import("@/features/payments/pages/DepositSuccessPage"));

const NotFoundPage = lazy(() => import("@/components/common/NotFoundPage"));

const suspense = (node: React.ReactNode) => (
  <Suspense fallback={<FullPageLoader />}>{node}</Suspense>
);

/**
 * URL paths mirror the old app exactly (gateway return URLs and emailed links
 * depend on them). New additions: /dashboard.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      // Module home placeholders — replaced as Phase B/C land.
      { index: true, element: suspense(<ModulePlaceholderPage module="hotels" />) },
      { path: "attraction", element: suspense(<ModulePlaceholderPage module="attractions" />) },
      { path: "visa", element: suspense(<ModulePlaceholderPage module="visas" />) },
      { path: "a2a", element: suspense(<ModulePlaceholderPage module="a2a" />) },
      { path: "quotation", element: suspense(<ModulePlaceholderPage module="quotations" />) },
      { path: "insurance", element: suspense(<ModulePlaceholderPage module="insurance" />) },

      { path: "dashboard", element: suspense(<DashboardPage />) },

      { path: "*", element: suspense(<NotFoundPage />) },
    ],
  },

  { path: "/login", element: suspense(<LoginPage />) },
  { path: "/register", element: suspense(<RegisterPage />) },
  { path: "/verification/:agentCode/:randomString", element: suspense(<VerificationPage />) },
  { path: "/entrydenied", element: suspense(<EntryDeniedPage />) },

  // CCAvenue / gateway return targets
  { path: "/payment-decline", element: suspense(<PaymentDeclinedPage />) },
  { path: "/b2b/wallet/deposit/:id/cancelled", element: suspense(<PaymentDeclinedPage />) },
  { path: "/b2b/wallet/deposit/:id/success", element: suspense(<DepositSuccessPage />) },

  { path: "*", element: suspense(<NotFoundPage />) },
]);
