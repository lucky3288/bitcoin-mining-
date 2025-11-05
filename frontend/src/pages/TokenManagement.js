import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { API } from "@/App";
import { useMetaMask } from "@/hooks/useMetaMask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Coins, Send, Flame, Loader2 } from "lucide-react";

const TokenManagement = () => {
  const { account, signer } = useMetaMask();
  const [contractAddress, setContractAddress] = useState("");
  const [contract, setContract] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mint state
  const [mintAddress, setMintAddress] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [minting, setMinting] = useState(false);

  // Transfer state
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Burn state
  const [burnAmount, setBurnAmount] = useState("");
  const [burning, setBurning] = useState(false);

  useEffect(() => {
    loadLatestDeployment();
  }, []);

  const loadLatestDeployment = async () => {
    try {
      const response = await axios.get(`${API}/deployments/latest`);
      setContractAddress(response.data.contract_address);
      await loadContract(response.data.contract_address);
    } catch (error) {
      console.log("Aucun déploiement trouvé");
    }
  };

  const loadContract = async (address) => {
    if (!signer || !address) return;

    setLoading(true);
    try {
      const abiResponse = await axios.get(`${API}/contract/abi`);
      const abi = abiResponse.data.abi;

      const tokenContract = new ethers.Contract(address, abi, signer);
      setContract(tokenContract);

      // Charger les infos du token
      const [name, symbol, decimals, totalSupply, maxSupply, owner] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.maxSupply(),
        tokenContract.owner()
      ]);

      const balance = await tokenContract.balanceOf(account);

      setTokenInfo({
        name,
        symbol,
        decimals,
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        maxSupply: ethers.utils.formatUnits(maxSupply, decimals),
        balance: ethers.utils.formatUnits(balance, decimals),
        owner,
        isOwner: owner.toLowerCase() === account.toLowerCase()
      });

      toast.success("Contrat chargé avec succès");
    } catch (error) {
      console.error("Erreur de chargement du contrat:", error);
      toast.error("Erreur lors du chargement du contrat");
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!contract || !tokenInfo.isOwner) {
      toast.error("Vous devez être le propriétaire pour mint");
      return;
    }

    if (!mintAddress || !mintAmount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setMinting(true);
    try {
      const amount = ethers.utils.parseUnits(mintAmount, tokenInfo.decimals);
      const tx = await contract.mint(mintAddress, amount);
      
      toast.info("Transaction envoyée, attente de confirmation...");
      await tx.wait();

      // Sauvegarder la transaction
      await axios.post(`${API}/transactions`, {
        tx_hash: tx.hash,
        from_address: account,
        to_address: mintAddress,
        amount: mintAmount,
        tx_type: "mint",
        contract_address: contractAddress
      });

      toast.success(`${mintAmount} ${tokenInfo.symbol} mintés avec succès!`);
      setMintAddress("");
      setMintAmount("");
      await loadContract(contractAddress);
    } catch (error) {
      console.error("Erreur de mint:", error);
      toast.error("Erreur lors du mint: " + error.message);
    } finally {
      setMinting(false);
    }
  };

  const handleTransfer = async () => {
    if (!contract) return;

    if (!transferAddress || !transferAmount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setTransferring(true);
    try {
      const amount = ethers.utils.parseUnits(transferAmount, tokenInfo.decimals);
      const tx = await contract.transfer(transferAddress, amount);
      
      toast.info("Transaction envoyée, attente de confirmation...");
      await tx.wait();

      await axios.post(`${API}/transactions`, {
        tx_hash: tx.hash,
        from_address: account,
        to_address: transferAddress,
        amount: transferAmount,
        tx_type: "transfer",
        contract_address: contractAddress
      });

      toast.success(`${transferAmount} ${tokenInfo.symbol} transférés avec succès!`);
      setTransferAddress("");
      setTransferAmount("");
      await loadContract(contractAddress);
    } catch (error) {
      console.error("Erreur de transfert:", error);
      toast.error("Erreur lors du transfert: " + error.message);
    } finally {
      setTransferring(false);
    }
  };

  const handleBurn = async () => {
    if (!contract) return;

    if (!burnAmount) {
      toast.error("Veuillez entrer un montant");
      return;
    }

    setBurning(true);
    try {
      const amount = ethers.utils.parseUnits(burnAmount, tokenInfo.decimals);
      const tx = await contract.burn(amount);
      
      toast.info("Transaction envoyée, attente de confirmation...");
      await tx.wait();

      await axios.post(`${API}/transactions`, {
        tx_hash: tx.hash,
        from_address: account,
        to_address: null,
        amount: burnAmount,
        tx_type: "burn",
        contract_address: contractAddress
      });

      toast.success(`${burnAmount} ${tokenInfo.symbol} brûlés avec succès!`);
      setBurnAmount("");
      await loadContract(contractAddress);
    } catch (error) {
      console.error("Erreur de burn:", error);
      toast.error("Erreur lors du burn: " + error.message);
    } finally {
      setBurning(false);
    }
  };

  if (!account) {
    return (
      <div className="page-header">
        <h1 className="page-title">Gestion du Token</h1>
        <p className="page-subtitle">⚠️ Veuillez connecter MetaMask</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Chargement...</h1>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div data-testid="manage-page">
        <div className="page-header">
          <h1 className="page-title" data-testid="manage-title">Gestion du Token</h1>
        </div>
        <Card className="load-contract-card">
          <div className="card-content">
            <h3>Charger un contrat</h3>
            <Input
              placeholder="Adresse du contrat"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              data-testid="contract-address-input"
            />
            <Button
              onClick={() => loadContract(contractAddress)}
              disabled={!contractAddress}
              data-testid="load-contract-button"
            >
              Charger le contrat
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="manage-page">
      <div className="page-header">
        <h1 className="page-title" data-testid="manage-title">Gestion du Token {tokenInfo.name}</h1>
        <p className="page-subtitle" data-testid="manage-subtitle">Mint, transférez et burn vos tokens</p>
      </div>

      <div className="token-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Votre Solde</div>
          <div className="stat-value" data-testid="user-balance">
            {parseFloat(tokenInfo.balance).toLocaleString()} {tokenInfo.symbol}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Supply Total</div>
          <div className="stat-value" data-testid="total-supply">
            {parseFloat(tokenInfo.totalSupply).toLocaleString()} {tokenInfo.symbol}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Supply Maximum</div>
          <div className="stat-value" data-testid="max-supply-value">
            {parseFloat(tokenInfo.maxSupply).toLocaleString()} {tokenInfo.symbol}
          </div>
        </div>
      </div>

      <Card className="management-card">
        <Tabs defaultValue="mint" className="management-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="mint" data-testid="mint-tab">
              <Coins size={18} style={{ marginRight: '0.5rem' }} />
              Mint
            </TabsTrigger>
            <TabsTrigger value="transfer" data-testid="transfer-tab">
              <Send size={18} style={{ marginRight: '0.5rem' }} />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="burn" data-testid="burn-tab">
              <Flame size={18} style={{ marginRight: '0.5rem' }} />
              Burn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mint" className="tab-content">
            <h3>Mint des Tokens</h3>
            {!tokenInfo.isOwner && (
              <div className="warning-box">
                ⚠️ Vous devez être le propriétaire du contrat pour mint
              </div>
            )}
            <div className="form-group">
              <label>Adresse du destinataire</label>
              <Input
                placeholder="0x..."
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                disabled={!tokenInfo.isOwner}
                data-testid="mint-address-input"
              />
            </div>
            <div className="form-group">
              <label>Montant</label>
              <Input
                type="number"
                placeholder="0"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                disabled={!tokenInfo.isOwner}
                data-testid="mint-amount-input"
              />
            </div>
            <Button
              onClick={handleMint}
              disabled={!tokenInfo.isOwner || minting}
              data-testid="mint-button"
              className="action-button"
            >
              {minting ? (
                <>
                  <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                  Mint en cours...
                </>
              ) : (
                "Mint"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="transfer" className="tab-content">
            <h3>Transférer des Tokens</h3>
            <div className="form-group">
              <label>Adresse du destinataire</label>
              <Input
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                data-testid="transfer-address-input"
              />
            </div>
            <div className="form-group">
              <label>Montant</label>
              <Input
                type="number"
                placeholder="0"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                data-testid="transfer-amount-input"
              />
            </div>
            <Button
              onClick={handleTransfer}
              disabled={transferring}
              data-testid="transfer-button"
              className="action-button"
            >
              {transferring ? (
                <>
                  <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                  Transfert en cours...
                </>
              ) : (
                "Transférer"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="burn" className="tab-content">
            <h3>Burn des Tokens</h3>
            <div className="form-group">
              <label>Montant à brûler</label>
              <Input
                type="number"
                placeholder="0"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                data-testid="burn-amount-input"
              />
            </div>
            <div className="warning-box">
              ⚠️ Cette action est irréversible. Les tokens seront détruits définitivement.
            </div>
            <Button
              onClick={handleBurn}
              disabled={burning}
              data-testid="burn-button"
              className="action-button burn-button"
            >
              {burning ? (
                <>
                  <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                  Burn en cours...
                </>
              ) : (
                "Burn"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default TokenManagement;