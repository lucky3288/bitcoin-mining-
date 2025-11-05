import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Deploy from "@/pages/Deploy";
import TokenManagement from "@/pages/TokenManagement";
import Dashboard from "@/pages/TokenDashboard";
import { Toaster } from "@/components/ui/sonner";
import { Coins, Upload, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetaMask } from "@/hooks/useMetaMask";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const Navigation = () => {
  const location = useLocation();
  const { account, connectWallet, disconnectWallet, chainId } = useMetaMask();
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getNetworkName = (id) => {
    const networks = {
      1: "Ethereum",
      5: "Goerli",
      11155111: "Sepolia",
      56: "BSC",
      137: "Polygon",
      1337: "Localhost"
    };
    return networks[id] || `Chain ${id}`;
  };
  
  return (
    <nav className="nav-container">
      <div className="nav-content">
        <div className="nav-brand">
          <div className="brand-icon" data-testid="brand-icon">
            <Coins size={28} />
          </div>
          <h1 className="brand-title" data-testid="brand-title">Zyno Token</h1>
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
            to="/deploy" 
            className={`nav-link ${isActive('/deploy') ? 'active' : ''}`}
            data-testid="nav-deploy-link"
          >
            <Upload size={20} />
            <span>Deploy</span>
          </Link>
          <Link 
            to="/manage" 
            className={`nav-link ${isActive('/manage') ? 'active' : ''}`}
            data-testid="nav-manage-link"
          >
            <Coins size={20} />
            <span>Manage</span>
          </Link>
        </div>

        <div className="wallet-section">
          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="network-badge" data-testid="network-badge">
                {getNetworkName(chainId)}
              </div>
              <div className="wallet-badge" data-testid="wallet-address">
                {formatAddress(account)}
              </div>
              <Button 
                onClick={disconnectWallet}
                data-testid="disconnect-button"
                variant="outline"
                size="sm"
                className="disconnect-btn"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={connectWallet}
              data-testid="connect-wallet-button"
              className="connect-button"
            >
              🦊 Connect MetaMask
            </Button>
          )}
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
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/manage" element={<TokenManagement />} />
          </Routes>
        </main>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
