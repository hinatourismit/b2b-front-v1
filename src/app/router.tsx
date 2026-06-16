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
const WalletPage = lazy(() => import("@/features/wallet/pages/WalletPage"));
const ModulePlaceholderPage = lazy(() => import("@/features/dashboard/pages/ModulePlaceholderPage"));

// Payment return targets (paths are CCAvenue contract — do not change)
const PaymentDeclinedPage = lazy(() => import("@/features/payments/pages/PaymentDeclinedPage"));
const DepositSuccessPage = lazy(() => import("@/features/payments/pages/DepositSuccessPage"));
const PaymentApprovalPage = lazy(() => import("@/features/payments/pages/PaymentApprovalPage"));

// Attractions (Phase B2)
const AttractionHomePage = lazy(() => import("@/features/attractions/pages/AttractionHomePage"));
const AttractionListingPage = lazy(() => import("@/features/attractions/pages/AttractionListingPage"));
const AttractionDetailsPage = lazy(() => import("@/features/attractions/pages/AttractionDetailsPage"));
const AttractionCheckoutPage = lazy(() => import("@/features/attractions/pages/AttractionCheckoutPage"));
const AttractionOrdersPage = lazy(() => import("@/features/attractions/pages/AttractionOrdersPage"));
const AttractionInvoicePage = lazy(() => import("@/features/attractions/pages/AttractionInvoicePage"));
const AttractionPaymentErrorPage = lazy(
  () => import("@/features/attractions/pages/AttractionPaymentErrorPage"),
);

// Hotels (Phase B1)
const HotelHomePage = lazy(() => import("@/features/hotels/pages/HotelHomePage"));
const HotelResultsPage = lazy(() => import("@/features/hotels/pages/HotelResultsPage"));
const HotelDetailPage = lazy(() => import("@/features/hotels/pages/HotelDetailPage"));
const HotelCheckoutPage = lazy(() => import("@/features/hotels/pages/HotelCheckoutPage"));
const HotelOrdersPage = lazy(() => import("@/features/hotels/pages/HotelOrdersPage"));
const HotelOrderDetailPage = lazy(() => import("@/features/hotels/pages/HotelOrderDetailPage"));
const HotelErrorPage = lazy(() => import("@/features/hotels/pages/HotelErrorPage"));

const NotFoundPage = lazy(() => import("@/components/common/NotFoundPage"));
const RouteError = lazy(() => import("@/components/common/RouteError"));

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
    errorElement: suspense(<RouteError />),
    children: [
      // Attractions is the landing page (user decision 2026-06-12); hotels
      // moves to /hotel until Phase B1 lands.
      { index: true, element: suspense(<AttractionHomePage />) },
      { path: "hotel", element: suspense(<HotelHomePage />) },
      { path: "hotel/avail", element: suspense(<HotelResultsPage />) },
      { path: "hotel/details/:id", element: suspense(<HotelDetailPage />) },
      { path: "hotel/:id/apply/:roomtypeid", element: suspense(<HotelCheckoutPage />) },
      { path: "hotel/order", element: suspense(<HotelOrdersPage />) },
      { path: "hotel/order/:id/details", element: suspense(<HotelOrderDetailPage />) },
      { path: "hotel/invoice/error", element: suspense(<HotelErrorPage />) },
      { path: "hotel/invoice/:id", element: suspense(<HotelOrderDetailPage success />) },

      // Attractions (Phase B2) — paths mirror the old portal exactly
      { path: "attraction", element: suspense(<AttractionHomePage />) },
      { path: "attractions/:slug", element: suspense(<AttractionListingPage />) },
      { path: "attractions/details/:id", element: suspense(<AttractionDetailsPage />) },
      { path: "attractions/payment", element: suspense(<AttractionCheckoutPage />) },
      { path: "attraction/order", element: suspense(<AttractionOrdersPage />) },
      { path: "attractions/invoice/error", element: suspense(<AttractionPaymentErrorPage />) },
      { path: "attractions/invoice/:id", element: suspense(<AttractionInvoicePage />) },
      { path: "payment/approval", element: suspense(<PaymentApprovalPage />) },

      { path: "visa", element: suspense(<ModulePlaceholderPage module="visas" />) },
      { path: "a2a", element: suspense(<ModulePlaceholderPage module="a2a" />) },
      { path: "quotation", element: suspense(<ModulePlaceholderPage module="quotations" />) },
      { path: "insurance", element: suspense(<ModulePlaceholderPage module="insurance" />) },

      { path: "dashboard", element: suspense(<DashboardPage />) },
      { path: "wallet", element: suspense(<WalletPage />) },

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
