import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/app-shell";
import { LoginPage } from "./pages/login-page";
import { StockPage } from "./pages/stock-page";
import { RecipesPage } from "./pages/recipes-page";
import { ProductionPage } from "./pages/production-page";
import { LotSheetsPage } from "./pages/lot-sheets-page";
import { OrdersPage } from "./pages/orders-page";
import { DeliveryNotesPage } from "./pages/delivery-notes-page";
import { CreditNotesPage } from "./pages/credit-notes-page";
import { TraceabilityPage } from "./pages/traceability-page";
import { SettingsPage } from "./pages/settings-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/stock" replace />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/recettes" element={<RecipesPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/fiches-lot" element={<LotSheetsPage />} />
        <Route path="/commandes" element={<OrdersPage />} />
        <Route path="/bl" element={<DeliveryNotesPage />} />
        <Route path="/avoirs" element={<CreditNotesPage />} />
        <Route path="/traceabilite" element={<TraceabilityPage />} />
        <Route path="/reglages" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
