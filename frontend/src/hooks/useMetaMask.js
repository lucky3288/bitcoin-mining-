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
    // Check if MetaMask is available
    const checkMetaMask = async () => {
      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask detected');
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await handleAccountsChanged(accounts);
          }
        } catch (error) {
          console.error('Error checking accounts:', error);
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      } else {
        console.log('MetaMask not detected');
      }
    };

    checkMetaMask();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask n\'est pas installé! Veuillez installer MetaMask pour continuer.');
      window.open('https://metamask.io/download.html', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Requesting accounts...');
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      console.log('Accounts received:', accounts);
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        
        // Create provider and get network
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);
        setSigner(web3Provider.getSigner());
        
        // Get network info
        const network = await web3Provider.getNetwork();
        console.log('Network detected:', network.chainId, network.name);
        setChainId(network.chainId);
        
        // Also get it directly from ethereum
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(chainIdHex, 16);
        console.log('ChainId from ethereum:', chainIdDec);
        
        if (!chainId || chainId !== chainIdDec) {
          setChainId(chainIdDec);
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        alert('Connexion refusée. Veuillez accepter la connexion dans MetaMask.');
      } else {
        alert('Erreur de connexion: ' + error.message);
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
    connectWallet,
    disconnectWallet,
    switchNetwork
  };
};