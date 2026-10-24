import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useMeta } from "./context/MetaContext";
import { Loading, ErrorState } from "./components/Status";
import Home from "./pages/Home";
import PriceBoard from "./pages/PriceBoard";
import ReportOffer from "./pages/ReportOffer";
import AreaMap from "./pages/AreaMap";
import ImpactDashboard from "./pages/ImpactDashboard";
import NgoView from "./pages/NgoView";
import Methodology from "./pages/Methodology";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

export default function App() {
  const { meta, error, reload } = useMeta();

  return (
    <Layout>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !meta ? (
        <Loading label="Loading cities and materials" />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prices" element={<PriceBoard />} />
          <Route path="/report" element={<ReportOffer />} />
          <Route path="/map" element={<AreaMap />} />
          <Route path="/impact" element={<ImpactDashboard />} />
          <Route
            path="/ngo"
            element={
              <ProtectedRoute role="ngo">
                <NgoView />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<Methodology />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </Layout>
  );
}
