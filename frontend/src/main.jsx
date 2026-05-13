import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import ServicePage from './pages/ServicePage.jsx';
import LocalServicePage from './pages/LocalServicePage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import VendorLogin from './pages/VendorLogin.jsx';
import VendorChangePassword from './pages/VendorChangePassword.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/services/:slug/:city" element={<LocalServicePage />} />
        <Route path="/services/:slug" element={<ServicePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/change-password" element={<VendorChangePassword />} />
        <Route path="/vendor" element={<VendorDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
