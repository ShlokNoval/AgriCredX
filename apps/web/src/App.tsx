import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SupplierDashboard from './pages/SupplierDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import FinancierDashboard from './pages/FinancierDashboard';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="supplier" element={<SupplierDashboard />} />
            <Route path="buyer" element={<BuyerDashboard />} />
            <Route path="financier" element={<FinancierDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
