import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card } from "@/components/ui/card";
import { Coins, TrendingUp, Users, Activity } from "lucide-react";

const TokenDashboard = () => {
  const [deployments, setDeployments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deploymentsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/deployments`),
        axios.get(`${API}/transactions`)
      ]);
      setDeployments(deploymentsRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Chargement...</h1>
      </div>
    );
  }

  const latestDeployment = deployments[0];

  return (
    <div data-testid="dashboard-page">
      <div className="page-header">
        <h1 className="page-title" data-testid="dashboard-title">
          🚀 Dashboard Zyno Token
        </h1>
        <p className="page-subtitle" data-testid="dashboard-subtitle">
          Vue d'ensemble de votre token ERC-20
        </p>
      </div>

      {latestDeployment ? (
        <>
          <div className="stats-grid">
            <div className="stat-card" data-testid="stat-deployments">
              <div className="stat-header">
                <div className="stat-icon purple">
                  <Coins size={24} />
                </div>
                <div>
                  <div className="stat-label">Token Déployé</div>
                </div>
              </div>
              <div className="stat-value" data-testid="token-name-value">
                {latestDeployment.token_name}
              </div>
              <div className="stat-detail" data-testid="token-symbol-value">
                {latestDeployment.token_symbol}
              </div>
            </div>

            <div className="stat-card" data-testid="stat-supply">
              <div className="stat-header">
                <div className="stat-icon blue">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="stat-label">Supply Maximum</div>
                </div>
              </div>
              <div className="stat-value" data-testid="max-supply-dashboard">
                {parseInt(latestDeployment.max_supply).toLocaleString()}
              </div>
            </div>

            <div className="stat-card" data-testid="stat-transactions">
              <div className="stat-header">
                <div className="stat-icon green">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="stat-label">Transactions</div>
                </div>
              </div>
              <div className="stat-value" data-testid="transactions-count">
                {transactions.length}
              </div>
            </div>
          </div>

          <Card className="content-card">
            <div className="card-header">
              <h2 className="card-title" data-testid="contract-info-title">Informations du Contrat</h2>
            </div>
            <div className="contract-info-grid">
              <div className="info-item">
                <div className="info-label">Adresse du Contrat</div>
                <div className="info-value contract-address" data-testid="contract-address-display">
                  {latestDeployment.contract_address}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Réseau</div>
                <div className="info-value" data-testid="network-display">
                  {latestDeployment.network}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Date de Déploiement</div>
                <div className="info-value" data-testid="deployment-date">
                  {new Date(latestDeployment.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Déployeur</div>
                <div className="info-value" data-testid="deployer-address">
                  {latestDeployment.deployer_address.substring(0, 10)}...
                  {latestDeployment.deployer_address.substring(latestDeployment.deployer_address.length - 8)}
                </div>
              </div>
            </div>
          </Card>

          {transactions.length > 0 && (
            <Card className="content-card">
              <div className="card-header">
                <h2 className="card-title" data-testid="recent-transactions-title">
                  Transactions Récentes
                </h2>
              </div>
              <div className="transaction-list">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="transaction-item" data-testid={`transaction-${tx.id}`}>
                    <div className="tx-type-badge" data-testid={`tx-type-${tx.id}`}>
                      {tx.tx_type}
                    </div>
                    <div className="tx-details">
                      <div className="tx-row">
                        <span className="tx-label">Montant:</span>
                        <span className="tx-value" data-testid={`tx-amount-${tx.id}`}>
                          {tx.amount} tokens
                        </span>
                      </div>
                      <div className="tx-row">
                        <span className="tx-label">Hash:</span>
                        <span className="tx-value tx-hash" data-testid={`tx-hash-${tx.id}`}>
                          {tx.tx_hash.substring(0, 20)}...
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="empty-state-card">
          <div className="empty-state" data-testid="no-deployments">
            <div className="empty-icon">🚀</div>
            <h3 className="empty-title">Aucun Token Déployé</h3>
            <p className="empty-description">
              Commencez par déployer votre token Zyno sur la page Deploy
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TokenDashboard;