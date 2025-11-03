import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Wallet, ArrowLeftRight, Coins } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title" data-testid="dashboard-title">Chargement...</h1>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <div className="page-header">
        <h1 className="page-title" data-testid="dashboard-title">Dashboard</h1>
        <p className="page-subtitle" data-testid="dashboard-subtitle">Vue d'ensemble de votre écosystème crypto</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" data-testid="stat-total-tokens">
          <div className="stat-header">
            <div className="stat-icon purple">
              <Coins size={24} />
            </div>
            <div>
              <div className="stat-label">Total Tokens</div>
            </div>
          </div>
          <div className="stat-value" data-testid="total-tokens-value">
            {stats?.total_tokens?.toFixed(2) || "0"}
          </div>
        </div>

        <div className="stat-card" data-testid="stat-total-wallets">
          <div className="stat-header">
            <div className="stat-icon blue">
              <Wallet size={24} />
            </div>
            <div>
              <div className="stat-label">Total Wallets</div>
            </div>
          </div>
          <div className="stat-value" data-testid="total-wallets-value">
            {stats?.total_wallets || "0"}
          </div>
        </div>

        <div className="stat-card" data-testid="stat-total-transactions">
          <div className="stat-header">
            <div className="stat-icon green">
              <ArrowLeftRight size={24} />
            </div>
            <div>
              <div className="stat-label">Transactions</div>
            </div>
          </div>
          <div className="stat-value" data-testid="total-transactions-value">
            {stats?.total_transactions || "0"}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title" data-testid="recent-transactions-title">Transactions Récentes</h2>
        </div>

        {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
          <div className="transaction-list">
            {stats.recent_transactions.map((tx) => (
              <div key={tx.id} className="transaction-item" data-testid={`transaction-${tx.id}`}>
                <div className="tx-header">
                  <div className="tx-amount" data-testid={`transaction-amount-${tx.id}`}>
                    {tx.amount} tokens
                  </div>
                  <div className="tx-status" data-testid={`transaction-status-${tx.id}`}>
                    {tx.status}
                  </div>
                </div>
                <div className="tx-details">
                  <div className="tx-row">
                    <span className="tx-label">De:</span>
                    <span className="tx-value" data-testid={`transaction-from-${tx.id}`}>
                      {tx.from_address.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-label">À:</span>
                    <span className="tx-value" data-testid={`transaction-to-${tx.id}`}>
                      {tx.to_address.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-label">Date:</span>
                    <span className="tx-value" data-testid={`transaction-date-${tx.id}`}>
                      {new Date(tx.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" data-testid="no-transactions">
            <div className="empty-icon">💳</div>
            <h3 className="empty-title">Aucune transaction</h3>
            <p className="empty-description">Les transactions apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;