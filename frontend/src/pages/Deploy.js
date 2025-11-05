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
  const { account, signer, chainId, error: walletError } = useMetaMask();
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [deploymentStep, setDeploymentStep] = useState("");
  const [txHash, setTxHash] = useState("");
  
  // Paramètres prédéfinis pour Zyno
  const [tokenName] = useState("Zyno");
  const [tokenSymbol] = useState("ZYN");
  const [initialSupply] = useState("100000000"); // 100M
  const [maxSupply] = useState("500000000"); // 500M

  const deployToken = async () => {
    console.log('=== DEPLOY STARTED ===');
    console.log('Account:', account);
    console.log('ChainId:', chainId);
    console.log('Signer:', signer ? 'Available' : 'Not available');
    
    // Validations
    if (!account) {
      toast.error("❌ Veuillez connecter MetaMask d'abord");
      return;
    }

    if (!chainId) {
      toast.error("❌ Réseau non détecté. Sélectionnez un réseau dans MetaMask puis reconnectez.");
      return;
    }

    if (!signer) {
      toast.error("❌ Signer non disponible. Reconnectez votre wallet.");
      return;
    }

    setDeploying(true);
    setDeploymentStep("Chargement du contrat...");
    
    try {
      console.log('Fetching contract data...');
      toast.info("📄 Chargement du contrat...");
      
      // Récupérer ABI et Bytecode avec timeout
      const fetchWithTimeout = (url, timeout = 10000) => {
        return Promise.race([
          axios.get(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      };
      
      const [abiResponse, bytecodeResponse] = await Promise.all([
        fetchWithTimeout(`${API}/contract/abi`),
        fetchWithTimeout(`${API}/contract/bytecode`)
      ]);
      
      const abi = abiResponse.data.abi;
      const bytecode = bytecodeResponse.data.bytecode;

      console.log('Contract data loaded');
      setDeploymentStep("Création du contrat...");
      toast.info("🔨 Préparation du déploiement...");

      // Créer la factory du contrat
      const factory = new ethers.ContractFactory(abi, bytecode, signer);

      console.log('Deploying contract...');
      setDeploymentStep("⚠️ Confirmez la transaction dans MetaMask...");
      toast.warning("🦊 OUVREZ METAMASK et confirmez la transaction !", {
        duration: 15000,
        important: true
      });

      // Déployer le contrat avec gas estimation
      let gasLimit;
      try {
        const gasEstimate = await factory.signer.estimateGas(
          factory.getDeployTransaction(tokenName, tokenSymbol, initialSupply, maxSupply)
        );
        gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (err) {
        console.warn('Could not estimate gas, using default');
        gasLimit = 3000000;
      }

      const contract = await factory.deploy(
        tokenName,
        tokenSymbol,
        initialSupply,
        maxSupply,
        { gasLimit }
      );

      console.log('Transaction sent:', contract.deployTransaction.hash);
      setTxHash(contract.deployTransaction.hash);
      setDeploymentStep("⏳ Transaction envoyée, attente de confirmation...");
      
      toast.info("✅ Transaction envoyée ! Hash: " + contract.deployTransaction.hash.substring(0, 10) + "...", {
        duration: 5000
      });
      
      toast.info("⏳ Attente de la confirmation blockchain (2-5 min)...", {
        duration: 10000
      });

      // Attendre la confirmation
      const receipt = await contract.deployTransaction.wait();
      console.log('Transaction confirmed:', receipt);

      const address = contract.address;
      setContractAddress(address);
      setDeployed(true);
      setDeploymentStep("✅ Déploiement réussi !");

      // Sauvegarder dans la base de données
      try {
        await axios.post(`${API}/deployments`, {
          contract_address: address,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          initial_supply: initialSupply,
          max_supply: maxSupply,
          deployer_address: account,
          network: chainId === 1 ? "mainnet" : chainId === 5 ? "goerli" : chainId === 11155111 ? "sepolia" : chainId === 137 ? "polygon" : "other",
          chain_id: chainId
        });
      } catch (dbError) {
        console.warn('Could not save to database:', dbError);
      }

      toast.success(`🎉 Token ${tokenName} déployé avec succès !`, {
        duration: 10000
      });
      
    } catch (error) {
      console.error('=== DEPLOYMENT ERROR ===');
      console.error('Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      setDeploymentStep("");
      
      if (error.code === 4001) {
        toast.error("❌ Transaction rejetée par l'utilisateur");
      } else if (error.code === -32002) {
        toast.error("⚠️ Une demande est déjà en attente dans MetaMask. Ouvrez MetaMask et confirmez.");
      } else if (error.message && error.message.includes("insufficient funds")) {
        toast.error("❌ Solde insuffisant pour les frais de déploiement");
      } else if (error.message && error.message.includes("Timeout")) {
        toast.error("❌ Timeout - Vérifiez votre connexion internet");
      } else {
        toast.error("❌ Erreur: " + (error.reason || error.message || "Erreur inconnue"));
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