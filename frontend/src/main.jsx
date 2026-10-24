import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App";
import { MetaProvider } from "./context/MetaContext";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MetaProvider>
          <App />
        </MetaProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
