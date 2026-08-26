import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { DealerLayout } from "@/components/layout/DealerLayout";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";

import Login from "@/pages/Login";
import DealerDashboard from "@/pages/DealerDashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Employees from "@/pages/Employees";
import EmployeeDetail from "@/pages/EmployeeDetail";
import Collections from "@/pages/Collections";
import CollectionDetail from "@/pages/CollectionDetail";
import History from "@/pages/History";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import EmployeeCollectionDetail from "@/pages/EmployeeCollectionDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allow={["DEALER"]} />}>
        <Route element={<DealerLayout />}>
          <Route path="/dashboard" element={<DealerDashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["EMPLOYEE"]} />}>
        <Route element={<EmployeeLayout />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/collections/:id" element={<EmployeeCollectionDetail />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
