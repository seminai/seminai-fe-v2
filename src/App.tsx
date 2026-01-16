import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./routes/Home";
import Auth from "./routes/Auth";
import Dashboard from "./routes/Dashboard";
import Settings from "./routes/Settings";
import ProtectedRoute from "@/components/ProtectedRoute";
import Label from "./routes/Label";
import LabelDetailPage from "./routes/Label/Detail";
import NewLabel from "./routes/Label/New";
import Fields from "./routes/Fields";
import Company from "./routes/Company";
import CompanyDetailPage from "./routes/Company/Detail";
import ProductionUnit from "./routes/ProductionUnit";
import NewProductionUnit from "./routes/ProductionUnit/NewProductionUnit";
import DosageManager from "./routes/DosageManager";
import Products from "./routes/Products";
import Job from "./routes/Job";
import Operations from "./routes/Operations";
import QuickCreate from "./routes/QuickCreate";
import TermsOfService from "./routes/TermsOfService";
import PrivacyPolicy from "./routes/PrivacyPolicy";
import NewWorkspace from "./routes/Workspace/NewWorkspace";
import WorkspaceSettings from "./routes/Workspace/WorkspaceSettings";
import NewRule from "./routes/Workspace/NewRule";
import EditRule from "./routes/Workspace/EditRule";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
        <Route path="/dosage-manager" element={<DosageManager />} />
        <Route path="/job" element={<Job />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/products" element={<Products />} />
        <Route path="/create-company-field-production" element={<QuickCreate />} />
        <Route path="/new-workspace" element={<NewWorkspace />} />
        <Route path="/workspace/settings/rules/:ruleId" element={<EditRule />} />
        <Route path="/workspace/settings/:section" element={<WorkspaceSettings />} />
        <Route path="/workspace/settings" element={<WorkspaceSettings />} />
        <Route path="/new-rule" element={<NewRule />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
