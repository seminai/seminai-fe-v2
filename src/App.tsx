import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./routes/Home";
import Auth from "./routes/Auth";
import Dashboard from "./routes/Dashboard";
import Settings from "./routes/Settings";
import ProtectedRoute from "@/components/ProtectedRoute";
import Label from "./routes/Label";
import LabelDetailPage from "./routes/Label/Detail";
import NewLabel from "./routes/Label/New";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/label" element={<Label />} />
        <Route path="/new-label" element={<NewLabel />} />
        <Route path="/label/:id" element={<LabelDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
