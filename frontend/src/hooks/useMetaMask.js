import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useMetaMask = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    // Check if already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            handleAccountsChanged(accounts);
          }
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setProvider(null);
      setSigner(null);
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());
      web3Provider.getNetwork().then(network => setChainId(network.chainId));
    }
  };

  const handleChainChanged = (chainId) => {
    window.location.reload();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask n\'est pas installé! Veuillez installer MetaMask pour continuer.');
      window.open('https://metamask.io/download.html', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      handleAccountsChanged(accounts);
    } catch (error) {
      console.error('Erreur de connexion:', error);
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
    connectWallet,
    disconnectWallet,
    switchNetwork
  };
};