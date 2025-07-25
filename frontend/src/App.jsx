import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainDashboard from "./pages/MainDashboard";

function App() {
  const isAuthenticated = !!localStorage.getItem("access_token");
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <MainDashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}
export default App;