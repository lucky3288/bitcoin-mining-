import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { API } from "@/App";
import { useMetaMask } from "@/hooks/useMetaMask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Rocket } from "lucide-react";

const Deploy = () => {
  const { account, signer, chainId } = useMetaMask();
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  
  // Paramètres prédéfinis pour Zyno
  const [tokenName] = useState("Zyno");
  const [tokenSymbol] = useState("ZYN");
  const [initialSupply] = useState("100000000"); // 100M
  const [maxSupply] = useState("500000000"); // 500M

  const deployToken = async () => {
    if (!account) {
      toast.error("Veuillez connecter MetaMask");
      return;
    }

    if (!signer) {
      toast.error("Impossible d'obtenir le signer");
      return;
    }

    setDeploying(true);
    try {
      // Récupérer ABI et Bytecode
      const abiResponse = await axios.get(`${API}/contract/abi`);
      const bytecodeResponse = await axios.get(`${API}/contract/bytecode`);
      
      const abi = abiResponse.data.abi;
      const bytecode = bytecodeResponse.data.bytecode;

      toast.info("Préparation du contrat...");

      // Créer la factory du contrat
      const factory = new ethers.ContractFactory(abi, bytecode, signer);

      toast.info("Déploiement en cours... Confirmez la transaction dans MetaMask");

      // Déployer le contrat
      const contract = await factory.deploy(
        tokenName,
        tokenSymbol,
        initialSupply,
        maxSupply
      );

      toast.info("Attente de confirmation de la transaction...");

      // Attendre que le contrat soit déployé
      await contract.deployTransaction.wait();

      const address = contract.address;
      setContractAddress(address);
      setDeployed(true);

      // Sauvegarder dans la base de données
      await axios.post(`${API}/deployments`, {
        contract_address: address,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        initial_supply: initialSupply,
        max_supply: maxSupply,
        deployer_address: account,
        network: chainId === 1 ? "mainnet" : chainId === 5 ? "goerli" : chainId === 11155111 ? "sepolia" : "other",
        chain_id: chainId
      });

      toast.success(`Token ${tokenName} déployé avec succès !`);
    } catch (error) {
      console.error("Erreur de déploiement:", error);
      if (error.code === 4001) {
        toast.error("Transaction rejetée par l'utilisateur");
      } else if (error.message.includes("insufficient funds")) {
        toast.error("Solde insuffisant pour déployer le contrat");
      } else {
        toast.error("Erreur lors du déploiement: " + error.message);
      }
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div data-testid="deploy-page" className="deploy-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="deploy-title">
          <Rocket size={32} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Déployer le Token Zyno
        </h1>
        <p className="page-subtitle" data-testid="deploy-subtitle">
          Déployez votre token ERC-20 sur la blockchain Ethereum
        </p>
      </div>

      {!deployed ? (
        <Card className="deploy-card">
          <div className="deploy-card-content">
            <h2 className="deploy-card-title">Configuration du Token</h2>
            
            <div className="token-config-grid">
              <div className="config-item">
                <div className="config-label">Nom du Token</div>
                <div className="config-value" data-testid="token-name">{tokenName}</div>
              </div>
              
              <div className="config-item">
                <div className="config-label">Symbole</div>
                <div className="config-value" data-testid="token-symbol">{tokenSymbol}</div>
              </div>
              
              <div className="config-item">
                <div className="config-label">Supply Initial</div>
                <div className="config-value" data-testid="initial-supply">
                  {parseInt(initialSupply).toLocaleString()} {tokenSymbol}
                </div>
              </div>
              
              <div className="config-item">
                <div className="config-label">Supply Maximum</div>
                <div className="config-value" data-testid="max-supply">
                  {parseInt(maxSupply).toLocaleString()} {tokenSymbol}
                </div>
              </div>
            </div>

            <div className="deploy-info">
              <h3>Caractéristiques</h3>
              <ul>
                <li>✅ Standard ERC-20</li>
                <li>✅ Fonction Mint (création de tokens)</li>
                <li>✅ Fonction Burn (destruction de tokens)</li>
                <li>✅ Supply maximum limité</li>
                <li>✅ Ownership transférable</li>
              </ul>
            </div>

            {!account && (
              <div className="deploy-warning">
                ⚠️ Veuillez connecter MetaMask pour déployer
              </div>
            )}

            <Button
              onClick={deployToken}
              disabled={!account || deploying}
              data-testid="deploy-button"
              className="deploy-button"
            >
              {deploying ? (
                <>
                  <Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} />
                  Déploiement en cours...
                </>
              ) : (
                <>
                  <Rocket size={20} style={{ marginRight: '0.5rem' }} />
                  Déployer le Token
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="success-card">
          <div className="success-content">
            <CheckCircle2 size={64} className="success-icon" />
            <h2 className="success-title">Token Déployé avec Succès!</h2>
            
            <div className="contract-address-box">
              <div className="contract-address-label">Adresse du Contrat</div>
              <div className="contract-address-value" data-testid="deployed-address">
                {contractAddress}
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(contractAddress);
                  toast.success("Adresse copiée!");
                }}
                variant="outline"
                size="sm"
                className="copy-button"
                data-testid="copy-address-button"
              >
                Copier l'adresse
              </Button>
            </div>

            <div className="next-steps">
              <h3>Prochaines Étapes</h3>
              <ol>
                <li>Ajoutez le token à MetaMask en utilisant l'adresse ci-dessus</li>
                <li>Utilisez la page "Manage" pour mint, transférer ou burn des tokens</li>
                <li>Partagez l'adresse du contrat avec votre communauté</li>
              </ol>
            </div>

            <Button
              onClick={() => window.location.href = "/manage"}
              data-testid="go-to-manage-button"
              className="manage-button"
            >
              Gérer le Token
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Deploy;