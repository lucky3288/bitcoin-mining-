import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";

const WalletDetail = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, [address]);

  const fetchWalletData = async () => {
    try {
      const [walletResponse, txResponse] = await Promise.all([
        axios.get(`${API}/wallets/${address}`),
        axios.get(`${API}/transactions`),
      ]);
      
      setWallet(walletResponse.data);
      
      // Filter transactions related to this wallet
      const relatedTx = txResponse.data.filter(
        (tx) => tx.from_address === address || tx.to_address === address
      );
      setTransactions(relatedTx);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error("Erreur lors du chargement du wallet");
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

  if (!wallet) {
    return (
      <div className="page-header">
        <h1 className="page-title">Wallet non trouvé</h1>
        <Button onClick={() => navigate("/wallets")} data-testid="back-button">
          <ArrowLeft size={20} style={{ marginRight: "0.5rem" }} />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="wallet-detail-page">
      <div className="page-header">
        <Button
          onClick={() => navigate("/wallets")}
          data-testid="back-to-wallets-button"
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            padding: "0.625rem 1.25rem",
            borderRadius: "10px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <ArrowLeft size={20} />
          Retour aux wallets
        </Button>
      </div>

      <div className="content-card" style={{ marginBottom: "2rem" }}>
        <div className="wallet-header" style={{ marginBottom: "1.5rem" }}>
          <div className="wallet-avatar" style={{ width: "64px", height: "64px", fontSize: "1.5rem" }} data-testid="wallet-detail-avatar">
            {wallet.user_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: "0.5rem" }} data-testid="wallet-detail-name">
              {wallet.user_name}
            </h1>
            <div className="wallet-address" style={{ display: "inline-block" }} data-testid="wallet-detail-address">
              {wallet.address}
            </div>
          </div>
        </div>

        <div className="wallet-balance">
          <div className="balance-label">Solde actuel</div>
          <div className="balance-value" style={{ fontSize: "2.5rem" }} data-testid="wallet-detail-balance">
            {wallet.balance.toFixed(2)} tokens
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>Date de création</div>
          <div style={{ fontSize: "1rem", color: "#1a1a2e" }} data-testid="wallet-detail-created">
            {new Date(wallet.created_at).toLocaleString('fr-FR')}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title" data-testid="wallet-transactions-title">Transactions</h2>
        </div>

        {transactions.length > 0 ? (
          <div className="transaction-list">
            {transactions.map((tx) => {
              const isSender = tx.from_address === address;
              return (
                <div key={tx.id} className="transaction-item" data-testid={`wallet-tx-${tx.id}`}>
                  <div className="tx-header">
                    <div
                      className="tx-amount"
                      style={{ color: isSender ? "#ef4444" : "#10b981" }}
                      data-testid={`wallet-tx-amount-${tx.id}`}
                    >
                      {isSender ? "-" : "+"}{tx.amount} tokens
                    </div>
                    <div
                      style={{
                        padding: "0.375rem 0.875rem",
                        borderRadius: "20px",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        background: isSender ? "#fee2e2" : "#d1fae5",
                        color: isSender ? "#991b1b" : "#065f46",
                      }}
                      data-testid={`wallet-tx-type-${tx.id}`}
                    >
                      {isSender ? "Envoyé" : "Reçu"}
                    </div>
                  </div>
                  <div className="tx-details">
                    <div className="tx-row">
                      <span className="tx-label">{isSender ? "À:" : "De:"}</span>
                      <span className="tx-value" data-testid={`wallet-tx-other-${tx.id}`}>
                        {isSender
                          ? tx.to_address.substring(0, 20)
                          : tx.from_address.substring(0, 20)}...
                      </span>
                    </div>
                    <div className="tx-row">
                      <span className="tx-label">Date:</span>
                      <span className="tx-value" data-testid={`wallet-tx-date-${tx.id}`}>
                        {new Date(tx.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" data-testid="wallet-no-transactions">
            <div className="empty-icon">💰</div>
            <h3 className="empty-title">Aucune transaction</h3>
            <p className="empty-description">Ce wallet n'a pas encore de transactions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDetail;