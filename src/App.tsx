import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./routes/Home";
import TermsOfService from "./routes/TermsOfService";
import PrivacyPolicy from "./routes/PrivacyPolicy";
import CookiePolicy from "./routes/CookiePolicy";

const Auth = lazy(() => import("./routes/Auth"));
const LoginRegister = lazy(() => import("./routes/Auth/LoginRegister"));
const ForgotPassword = lazy(() => import("./routes/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./routes/Auth/ResetPassword"));
const Dashboard = lazy(() => import("./routes/Dashboard"));
const Settings = lazy(() => import("./routes/Settings"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));
const Label = lazy(() => import("./routes/Label"));
const LabelDetailPage = lazy(() => import("./routes/Label/Detail"));
const NewLabel = lazy(() => import("./routes/Label/New"));
const Fields = lazy(() => import("./routes/Fields"));
const Company = lazy(() => import("./routes/Company"));
const CompanyDetailPage = lazy(() => import("./routes/Company/Detail"));
const ProductionUnit = lazy(() => import("./routes/ProductionUnit"));
const NewProductionUnit = lazy(
  () => import("./routes/ProductionUnit/NewProductionUnit"),
);
const Products = lazy(() => import("./routes/Products"));
const NewProduct = lazy(() => import("./routes/Products/NewProduct"));
const Job = lazy(() => import("./routes/Job"));
const NewOperation = lazy(() => import("./routes/NewOperation"));
const Operations = lazy(() => import("./routes/Operations"));
const FieldNotes = lazy(() => import("./routes/FieldNotes"));
const QuickCreate = lazy(() => import("./routes/QuickCreate"));
const NewWorkspace = lazy(() => import("./routes/Workspace/NewWorkspace"));
const WorkspaceSettings = lazy(
  () => import("./routes/Workspace/WorkspaceSettings"),
);
const NewRule = lazy(() => import("./routes/Workspace/NewRule"));
const EditRule = lazy(() => import("./routes/Workspace/EditRule"));
const AcceptInvitation = lazy(
  () => import("./routes/Workspace/AcceptInvitation"),
);
const BetaTesterAgreement = lazy(() => import("./routes/BetaTesterAgreement"));
const BetaTesterAgreementSuccess = lazy(
  () => import("./routes/BetaTesterAgreementSuccess"),
);
const DosageAgentChat = lazy(() => import("./routes/DosageAgentChat"));
const AdminDataTotalsPage = lazy(() => import("./routes/AdminDataTotals"));

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />}>
          <Route index element={<LoginRegister />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="/diventa-beta-tester" element={<BetaTesterAgreement />} />
        <Route
          path="/diventa-beta-tester/successo"
          element={<BetaTesterAgreementSuccess />}
        />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/label" element={<Label />} />
          <Route path="/new-label" element={<NewLabel />} />
          <Route path="/label/:id" element={<LabelDetailPage />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/company" element={<Company />} />
          <Route path="/company/:id" element={<CompanyDetailPage />} />
          <Route path="/production-unit" element={<ProductionUnit />} />
          <Route path="/new-production-unit" element={<NewProductionUnit />} />
          <Route path="/dosage-manager" element={<Navigate to="/job/new" replace />} />
          <Route path="/job" element={<Job />} />
          <Route path="/job/new" element={<NewOperation />} />
          <Route path="/job/new-job-manual" element={<Navigate to="/job/new" replace />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/field-notes" element={<FieldNotes />} />
          <Route path="/dosage-agent-chat" element={<DosageAgentChat />} />
          <Route path="/admin-data-totals" element={<AdminDataTotalsPage />} />
          <Route path="/products" element={<Products />} />
          <Route path="/new-product" element={<NewProduct />} />
          <Route
            path="/create-company-field-production"
            element={<QuickCreate />}
          />
          <Route path="/new-workspace" element={<NewWorkspace />} />
          <Route
            path="/workspace/accept-invitation"
            element={<AcceptInvitation />}
          />
          <Route
            path="/workspace/settings/rules/:ruleId"
            element={<EditRule />}
          />
          <Route
            path="/workspace/settings/:section"
            element={<WorkspaceSettings />}
          />
          <Route path="/workspace/settings" element={<WorkspaceSettings />} />
          <Route path="/new-rule" element={<NewRule />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
