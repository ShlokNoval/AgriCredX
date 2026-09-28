import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SupplierDashboard from './pages/SupplierDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import TamperDemo from './pages/TamperDemo';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import DeliveryScanner from './pages/DeliveryScanner';

import CertificateViewer from './pages/CertificateViewer';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="auth" element={<Auth />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="supplier" element={<SupplierDashboard />} />
            <Route path="buyer" element={<BuyerDashboard />} />
            <Route path="tamper" element={<TamperDemo />} />
            <Route path="delivery/:id" element={<DeliveryScanner />} />
            <Route path="certificate/:id" element={<CertificateViewer />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
