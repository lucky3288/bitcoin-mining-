import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txResponse, walletsResponse] = await Promise.all([
        axios.get(`${API}/transactions`),
        axios.get(`${API}/wallets`),
      ]);
      setTransactions(txResponse.data);
      setWallets(walletsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
      setLoading(false);
    }
  };

  const sendTransaction = async (e) => {
    e.preventDefault();
    
    if (!fromAddress || !toAddress || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (fromAddress === toAddress) {
      toast.error("Les adresses d'envoi et de réception doivent être différentes");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Le montant doit être un nombre positif");
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(`${API}/transactions`, {
        from_address: fromAddress,
        to_address: toAddress,
        amount: amountNum,
      });
      
      toast.success(`Transaction réussie! ${amountNum} tokens envoyés`);
      setTransactions([response.data, ...transactions]);
      setFromAddress("");
      setToAddress("");
      setAmount("");
      
      // Refresh wallets to update balances
      const walletsResponse = await axios.get(`${API}/wallets`);
      setWallets(walletsResponse.data);
    } catch (error) {
      console.error("Error sending transaction:", error);
      const errorMsg = error.response?.data?.detail || "Erreur lors de l'envoi de la transaction";
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Chargement...</h1>
      </div>
    );
  }

  return (
    <div data-testid="transactions-page">
      <div className="page-header">
        <h1 className="page-title" data-testid="transactions-title">Transactions</h1>
        <p className="page-subtitle" data-testid="transactions-subtitle">Envoyez des tokens entre wallets</p>
      </div>

      <div className="transaction-form">
        <h2 className="card-title" style={{ marginBottom: "1.5rem" }} data-testid="send-tokens-title">
          Envoyer des Tokens
        </h2>
        <form onSubmit={sendTransaction} className="form-grid">
          <div className="form-group">
            <label className="form-label" data-testid="from-wallet-label">Depuis le wallet</label>
            <Select value={fromAddress} onValueChange={setFromAddress} data-testid="from-wallet-select">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.address} value={wallet.address} data-testid={`from-wallet-${wallet.address}`}>
                    {wallet.user_name} - {wallet.balance.toFixed(2)} tokens
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" data-testid="to-wallet-label">Vers le wallet</label>
            <Select value={toAddress} onValueChange={setToAddress} data-testid="to-wallet-select">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets
                  .filter((w) => w.address !== fromAddress)
                  .map((wallet) => (
                    <SelectItem key={wallet.address} value={wallet.address} data-testid={`to-wallet-${wallet.address}`}>
                      {wallet.user_name} - {wallet.address.substring(0, 20)}...
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount" data-testid="amount-label">
              Montant (tokens)
            </label>
            <Input
              id="amount"
              data-testid="amount-input"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={sending}
            />
          </div>

          <Button
            type="submit"
            disabled={sending}
            data-testid="send-transaction-button"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "0.625rem 1.5rem",
              borderRadius: "10px",
              fontWeight: "600",
              border: "none",
              cursor: sending ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {sending ? "Envoi en cours..." : "Envoyer"}
          </Button>
        </form>
      </div>

      <div className="content-card" style={{ marginTop: "2rem" }}>
        <div className="card-header">
          <h2 className="card-title" data-testid="all-transactions-title">Historique des Transactions</h2>
        </div>

        {transactions.length > 0 ? (
          <div className="transaction-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-item" data-testid={`transaction-item-${tx.id}`}>
                <div className="tx-header">
                  <div className="tx-amount" data-testid={`tx-amount-${tx.id}`}>
                    {tx.amount} tokens
                  </div>
                  <div className="tx-status" data-testid={`tx-status-${tx.id}`}>
                    {tx.status}
                  </div>
                </div>
                <div className="tx-details">
                  <div className="tx-row">
                    <span className="tx-label">De:</span>
                    <span className="tx-value" data-testid={`tx-from-${tx.id}`}>
                      {tx.from_address.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-label">À:</span>
                    <span className="tx-value" data-testid={`tx-to-${tx.id}`}>
                      {tx.to_address.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-label">Date:</span>
                    <span className="tx-value" data-testid={`tx-date-${tx.id}`}>
                      {new Date(tx.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" data-testid="no-transactions-history">
            <div className="empty-icon">💸</div>
            <h3 className="empty-title">Aucune transaction</h3>
            <p className="empty-description">Effectuez votre première transaction</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;