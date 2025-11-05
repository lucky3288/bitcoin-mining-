import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export const useMetaMask = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const setupProvider = useCallback(async (accounts) => {
    if (!accounts || accounts.length === 0) {
      setAccount(null);
      setProvider(null);
      setSigner(null);
      setChainId(null);
      return;
    }

    try {
      setAccount(accounts[0]);
      
      // Create provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());
      
      // Get network with retry
      let network;
      let retries = 3;
      while (retries > 0) {
        try {
          network = await web3Provider.getNetwork();
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('Network:', network.chainId, network.name);
      setChainId(network.chainId);
      
      // Double check with eth_chainId
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(chainIdHex, 16);
        if (chainIdDec !== network.chainId) {
          console.warn('ChainId mismatch, using:', chainIdDec);
          setChainId(chainIdDec);
        }
      } catch (err) {
        console.warn('Could not verify chainId:', err);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error setting up provider:', error);
      setError(error.message);
    }
  }, []);

  const handleAccountsChanged = useCallback(async (accounts) => {
    console.log('Accounts changed:', accounts);
    await setupProvider(accounts);
  }, [setupProvider]);

  const handleChainChanged = useCallback((chainId) => {
    console.log('Chain changed to:', chainId);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);

  useEffect(() => {
    const initMetaMask = async () => {
      // Vérifie si MetaMask est disponible
      if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask est installé !');
        
        try {
          // Tente de récupérer les comptes déjà connectés
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            console.log('🔗 Connexion existante trouvée');
            console.log('Compte connecté :', accounts[0]);
            await setupProvider(accounts);
          } else {
            console.log('⚠️ Aucune connexion existante. Cliquez sur "Connect MetaMask"');
          }
        } catch (error) {
          console.error('❌ Erreur lors de la vérification des comptes:', error);
        }

        // Set up event listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      } else {
        console.log('❌ MetaMask n\'est pas installé');
        console.log('📥 Installez MetaMask depuis : https://metamask.io/download.html');
      }
    };

    initMetaMask();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged, setupProvider]);

  const connectWallet = async () => {
    // Vérifie si MetaMask est disponible
    if (typeof window.ethereum === 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      console.log('❌ MetaMask n\'est pas installé !');
      
      if (isMobile) {
        console.log('📱 Redirection vers l\'app MetaMask...');
        // Redirect to MetaMask mobile app
        const dappUrl = window.location.href.replace(/^https?:\/\//, '');
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
      } else {
        alert('MetaMask n\'est pas installé ! Veuillez installer MetaMask pour continuer.');
        window.open('https://metamask.io/download.html', '_blank');
      }
      return;
    }

    console.log('✅ MetaMask est installé !');
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('🔌 Demande de connexion à MetaMask...');
      
      // Demande la connexion
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      console.log('✅ Comptes reçus:', accounts);
      console.log('🔗 Connecté avec le compte :', accounts[0]);
      
      if (accounts && accounts.length > 0) {
        await setupProvider(accounts);
        console.log('✅ Wallet connecté avec succès !');
      }
    } catch (error) {
      console.error('❌ Erreur de connexion à MetaMask :', error);
      setError(error.message);
      
      if (error.code === 4001) {
        alert('❌ Connexion refusée. Veuillez accepter la connexion dans MetaMask.');
      } else if (error.code === -32002) {
        alert('⚠️ Une demande de connexion est déjà en attente dans MetaMask. Veuillez ouvrir MetaMask et accepter.');
      } else {
        alert('❌ Erreur de connexion: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  const switchNetwork = async (targetChainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.utils.hexValue(targetChainId) }],
      });
    } catch (error) {
      console.error('Erreur de changement de réseau:', error);
      throw error;
    }
  };

  return {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork
  };
};