import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const Wallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await axios.get(`${API}/wallets`);
      setWallets(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      toast.error("Erreur lors du chargement des wallets");
      setLoading(false);
    }
  };

  const createWallet = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast.error("Veuillez entrer un nom d'utilisateur");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/wallets`, {
        user_name: userName,
      });
      toast.success(`Wallet créé avec succès! Solde initial: 1000 tokens`);
      setWallets([response.data, ...wallets]);
      setUserName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast.error("Erreur lors de la création du wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleWalletClick = (address) => {
    navigate(`/wallets/${address}`);
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Chargement...</h1>
      </div>
    );
  }

  return (
    <div data-testid="wallets-page">
      <div className="page-header">
        <div>
          <h1 className="page-title" data-testid="wallets-title">Wallets</h1>
          <p className="page-subtitle" data-testid="wallets-subtitle">Gérez vos portefeuilles crypto</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="create-wallet-button"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "0.625rem 1.5rem",
                borderRadius: "10px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              <Plus size={20} />
              Créer un Wallet
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="create-wallet-dialog">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">Créer un nouveau wallet</DialogTitle>
            </DialogHeader>
            <form onSubmit={createWallet} className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="userName" data-testid="username-label">
                  Nom d'utilisateur
                </label>
                <Input
                  id="userName"
                  data-testid="username-input"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Entrez votre nom"
                  disabled={creating}
                />
              </div>
              <Button
                type="submit"
                disabled={creating}
                data-testid="submit-wallet-button"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  padding: "0.625rem 1.5rem",
                  borderRadius: "10px",
                  fontWeight: "600",
                  border: "none",
                  cursor: creating ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                {creating ? "Création..." : "Créer le Wallet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {wallets.length > 0 ? (
        <div className="wallets-grid">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="wallet-card"
              onClick={() => handleWalletClick(wallet.address)}
              data-testid={`wallet-card-${wallet.address}`}
            >
              <div className="wallet-header">
                <div className="wallet-avatar" data-testid={`wallet-avatar-${wallet.address}`}>
                  {wallet.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="wallet-name" data-testid={`wallet-name-${wallet.address}`}>
                  {wallet.user_name}
                </div>
              </div>
              <div className="wallet-address" data-testid={`wallet-address-${wallet.address}`}>
                {wallet.address}
              </div>
              <div className="wallet-balance">
                <div className="balance-label">Solde</div>
                <div className="balance-value" data-testid={`wallet-balance-${wallet.address}`}>
                  {wallet.balance.toFixed(2)} tokens
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" data-testid="no-wallets">
          <div className="empty-icon">👛</div>
          <h3 className="empty-title">Aucun wallet</h3>
          <p className="empty-description">Créez votre premier wallet pour commencer</p>
        </div>
      )}
    </div>
  );
};

export default Wallets;