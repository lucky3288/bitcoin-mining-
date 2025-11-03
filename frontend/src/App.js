import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import Dashboard from "@/pages/Dashboard";
import Wallets from "@/pages/Wallets";
import Transactions from "@/pages/Transactions";
import WalletDetail from "@/pages/WalletDetail";
import { Toaster } from "@/components/ui/sonner";
import { Wallet, ArrowLeftRight, LayoutDashboard } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="nav-container">
      <div className="nav-content">
        <div className="nav-brand">
          <div className="brand-icon" data-testid="brand-icon">
            <Wallet size={28} />
          </div>
          <h1 className="brand-title" data-testid="brand-title">CryptoToken</h1>
        </div>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            data-testid="nav-dashboard-link"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/wallets" 
            className={`nav-link ${isActive('/wallets') ? 'active' : ''}`}
            data-testid="nav-wallets-link"
          >
            <Wallet size={20} />
            <span>Wallets</span>
          </Link>
          <Link 
            to="/transactions" 
            className={`nav-link ${isActive('/transactions') ? 'active' : ''}`}
            data-testid="nav-transactions-link"
          >
            <ArrowLeftRight size={20} />
            <span>Transactions</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/wallets/:address" element={<WalletDetail />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </main>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;