import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import AtomicSwap from './AtomicSwap';
import { Alert, AlertDescription, AlertTitle} from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';


// Constants
const NETWORKS = {
  MAINNET: 'MainNet',
  TESTNET: 'TestNet'
} as const;

const API_ENDPOINTS = {
  MAINNET: 'https://mainnet-api.algonode.cloud',
  TESTNET: 'https://testnet-api.algonode.cloud',
  VERIFIED_ASSETS: 'https://mainnet.api.perawallet.app/v1/public/verified-assets/'
} as const;

const RECEIVER_ADDRESS = 'Y4532MAF7R46EHON24GMDKPZAD4RK7B3QYQ22KXAVZMPXYL7YF475E2CIU';
const DONATION_AMOUNT = 1_000_000; // 1 ALGO

// Types
type Network = typeof NETWORKS[keyof typeof NETWORKS];
type TransactionStatus = 'idle' | 'pending' | 'confirmed' | 'failed';
type SwapStatus = 'idle' | 'creating' | 'awaiting_signature' | 'pending' | 'completed' | 'failed';

interface VerifiedAsset {
  verification_tier: 'trusted' | 'verified' | 'unverified' | 'suspicious';
  asset_id?: number;
  name?: string;
  unitName?: string;
  logo?: string;
}

interface SwapParams {
  assetIdA: number;
  assetIdB: number;
  amountA: number;
  amountB: number;
  senderAddress: string;
  receiverAddress: string;
}

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true
});

// Utility functions
const getAlgodClient = (network: Network) => {
  const server = network === NETWORKS.MAINNET ? API_ENDPOINTS.MAINNET : API_ENDPOINTS.TESTNET;
  return new algosdk.Algodv2('', server, '');
};

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

// Custom hooks
const useWalletConnection = () => {
  const [accountAddress, setAccountAddress] = useState<string>('');
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [shouldShowAccountSelect, setShouldShowAccountSelect] = useState(false);

  const connectWallet = useCallback(async () => {
    try {
      setIsConnecting(true);
      setConnectionError('');
      
      const walletAccounts = await peraWallet.connect();
      setAccounts(walletAccounts);
      
      if (walletAccounts.length === 1) {
        setAccountAddress(walletAccounts[0]);
      } else if (walletAccounts.length > 1) {
        setShouldShowAccountSelect(true);
      }
      
      return walletAccounts;
    } catch (error: any) {
      if (error.message === 'Connect modal is closed by user') {
        setConnectionError('Connection cancelled');
      } else {
        setConnectionError('Failed to connect wallet');
        console.error("Connection failed:", error);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const selectAccount = useCallback((address: string) => {
    setAccountAddress(address);
    setShouldShowAccountSelect(false);
  }, []);

  const disconnectWallet = useCallback(() => {
    peraWallet.disconnect();
    setAccountAddress('');
    setAccounts([]);
  }, []);

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) {
        setAccounts(accounts);
        setAccountAddress(accounts[0]);
      }
    });

    peraWallet.connector?.on('disconnect', disconnectWallet);
    return () => {
      peraWallet.connector?.off('disconnect');
    };
  }, [disconnectWallet]);

  return {
    accountAddress,
    accounts,
    isConnecting,
    connectionError,
    shouldShowAccountSelect,
    connectWallet,
    selectAccount,
    disconnectWallet,
    setAccountAddress,
    setShouldShowAccountSelect
  };
};

const useVerifiedAssets = (accountAddress: string) => {
  const [assets, setAssets] = useState<VerifiedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchAssets = async () => {
      if (!accountAddress) return;

      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(API_ENDPOINTS.VERIFIED_ASSETS, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const verifiedAssets = data.results?.filter((asset: VerifiedAsset) => 
          asset?.verification_tier && ['trusted', 'verified'].includes(asset.verification_tier)
        ) || [];

        setAssets(verifiedAssets);
      } catch (error) {
        setError('Failed to load verified assets');
        console.error('Error fetching verified assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [accountAddress]);

  return { assets, loading, error };
};

// Components
const AssetCard: React.FC<{
  asset: VerifiedAsset;
  onOptIn: (assetId: number) => void;
  onSelect: (assetId: number) => void;
  status?: string;
  selected?: boolean;
}> = React.memo(({ asset, onOptIn, onSelect, status, selected }) => (
  <div className={`asset-card ${selected ? 'selected' : ''}`}>
    <div className="asset-logo-placeholder">
      {asset.unitName?.[0] || 'A'}
    </div>
    <div className="asset-info">
      <h4>{asset.asset_id ? `Asset ${asset.asset_id}` : 'Unknown Asset'}</h4>
      <p>{asset.verification_tier}</p>
      {asset.asset_id && (
        <div className="asset-actions">
          <button
            onClick={() => onOptIn(asset.asset_id!)}
            disabled={status === 'pending'}
            className={`opt-in-button ${status || ''}`}
          >
            {status === 'pending' ? 'Processing...' : 
             status === 'success' ? 'Opted In!' : 
             'Opt In'}
          </button>
          <button
            onClick={() => onSelect(asset.asset_id!)}
            className={`select-button ${selected ? 'selected' : ''}`}
          >
            {selected ? 'Selected' : 'Select for Swap'}
          </button>
        </div>
      )}
    </div>
  </div>
));

const NetworkSelector: React.FC<{
  network: Network;
  onChange: (network: Network) => void;
  disabled: boolean;
}> = React.memo(({ network, onChange, disabled }) => (
  <div className="network-selector">
    {Object.values(NETWORKS).map((net) => (
      <button
        key={net}
        onClick={() => onChange(net)}
        className={network === net ? 'active' : ''}
        disabled={disabled}
      >
        {net}
      </button>
    ))}
  </div>
));

const AccountSelector: React.FC<{
  accounts: string[];
  selectedAccount: string;
  onSelect: (address: string) => void;
  onClose: () => void;
}> = ({ accounts, selectedAccount, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50">
    {/* Backdrop */}
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />
    
    {/* Modal */}
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px]">
      <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Select Account</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {accounts.map(account => (
            <button
              key={account}
              onClick={() => {
                onSelect(account);
                onClose();
              }}
              className={`w-full p-4 text-left rounded-xl transition-all
                ${account === selectedAccount 
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-500 shadow-purple-100' 
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{formatAddress(account)}</span>
                {account === selectedAccount && (
                  <span className="text-purple-600">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Main component
const WalletConnect: React.FC = () => {
  const {
    accountAddress,
    accounts,
    isConnecting,
    connectionError,
    shouldShowAccountSelect,
    connectWallet,
    selectAccount,
    disconnectWallet,
    setShouldShowAccountSelect
  } = useWalletConnection();

  const [network, setNetwork] = useState<Network>(NETWORKS.TESTNET);
  const [showAccountSelect, setShowAccountSelect] = useState(false);
  const [txnStatus, setTxnStatus] = useState<TransactionStatus>('idle');
  const [txnError, setTxnError] = useState<string>('');
  const { assets, loading: assetsLoading, error: assetsError } = useVerifiedAssets(accountAddress);
  const [optInStatus, setOptInStatus] = useState<Record<number, string>>({});
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [assetsToShow, setAssetsToShow] = useState(6); // Initial number of assets to show

  const handleNetworkChange = useCallback((newNetwork: Network) => {
    setNetwork(newNetwork);
    disconnectWallet();
  }, [disconnectWallet]);

  const handleDonation = useCallback(async () => {
    if (!accountAddress) return;
    
    try {
      setTxnStatus('pending');
      setTxnError('');

      const client = getAlgodClient(network);
      const suggestedParams = await client.getTransactionParams().do();
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: accountAddress,
        to: RECEIVER_ADDRESS,
        amount: DONATION_AMOUNT,
        suggestedParams,
      });

      const txnToSign = [[{
        txn: txn,
        signers: [accountAddress],
      }]];

      const signedTxns = await peraWallet.signTransaction(txnToSign);
      const { txId } = await client.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(client, txId, 4);
      
      setTxnStatus('confirmed');
      setTimeout(() => setTxnStatus('idle'), 3000);
    } catch (error) {
      console.error('Transaction failed:', error);
      setTxnStatus('failed');
      setTxnError(error instanceof Error ? error.message : 'Transaction failed');
    }
  }, [accountAddress, network]);

  const handleOptIn = useCallback(async (assetId: number) => {
    if (!accountAddress || !assetId) return;
    
    try {
      setOptInStatus(prev => ({ ...prev, [assetId]: 'pending' }));
      
      const client = getAlgodClient(network);
      const suggestedParams = await client.getTransactionParams().do();
      
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: accountAddress,
        to: accountAddress,
        assetIndex: assetId,
        amount: 0,
        suggestedParams,
      });

      const txnToSign = [[{
        txn: txn,
        signers: [accountAddress],
      }]];

      const signedTxns = await peraWallet.signTransaction(txnToSign);
      const { txId } = await client.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(client, txId, 4);
      
      setOptInStatus(prev => ({ ...prev, [assetId]: 'success' }));
      setTimeout(() => {
        setOptInStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[assetId];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      console.error('Opt-in failed:', error);
      setOptInStatus(prev => ({ ...prev, [assetId]: 'failed' }));
    }
  }, [accountAddress, network]);

  const handleAssetSelect = useCallback((assetId: number) => {
    setSelectedAssetId(assetId);
  }, []);

  const assetsList = useMemo(() => (
    <div className="assets-grid">
      {assets.map((asset) => (
        <AssetCard
          key={asset.asset_id || Math.random()}
          asset={asset}
          onOptIn={handleOptIn}
          onSelect={handleAssetSelect}
          status={asset.asset_id ? optInStatus[asset.asset_id] : undefined}
          selected={asset.asset_id === selectedAssetId}
        />
      ))}
    </div>
  ), [assets, handleOptIn, optInStatus, selectedAssetId, handleAssetSelect]);

  return (
    <div className="wallet-connect relative">
      {/* Move AtomicSwap to top left with fixed positioning */}
      {selectedAssetId && (
        <div className="fixed top-4 left-4 z-50">
          <AtomicSwap
            accountAddress={accountAddress}
            network={network}
            peraWallet={peraWallet}
            assetId={selectedAssetId}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <NetworkSelector
          network={network}
          onChange={handleNetworkChange}
          disabled={isConnecting}
        />

        {!accountAddress ? (
          <div className="text-center py-12">
            <button 
              onClick={connectWallet} 
              className="connect-button"
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect with Pera Wallet'}
            </button>
            {connectionError && (
              <div className="mt-4 text-sm text-red-600">
                {connectionError}
              </div>
            )}
          </div>
        ) : (
          <div className="account-info bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected Account</p>
                <p className="text-lg font-medium">{formatAddress(accountAddress)}</p>
              </div>
              <div className="flex items-center gap-2">
                {accounts.length > 1 && (
                  <button 
                    onClick={() => setShowAccountSelect(true)}
                    className="px-4 py-2 text-sm font-medium text-purple-600 
                      hover:text-purple-700 bg-purple-50 hover:bg-purple-100 
                      rounded-lg transition-colors"
                  >
                    Switch Account
                  </button>
                )}
                <button 
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-sm font-medium text-red-600 
                    hover:text-red-700 bg-red-50 hover:bg-red-100 
                    rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {shouldShowAccountSelect && (
          <AccountSelector
            accounts={accounts}
            selectedAccount={accountAddress}
            onSelect={selectAccount}
            onClose={() => setShouldShowAccountSelect(false)}
          />
        )}

        {accountAddress && (
          <>
            <div className="transaction-section">
              <button 
                onClick={handleDonation}
                disabled={txnStatus === 'pending'}
                className="donate-button"
              >
                {txnStatus === 'pending' ? 'Processing...' : 'Donate 1 ALGO'}
              </button>
              
              {txnStatus === 'confirmed' && (
                <Alert variant="success">
                  <AlertTitle>Transaction Confirmed</AlertTitle>
                  <AlertDescription>Your 1 ALGO donation has been successfully processed.</AlertDescription>
                </Alert>
              )}
              
              {txnStatus === 'failed' && (
                <Alert variant="destructive">
                  <AlertTitle>Transaction Failed</AlertTitle>
                  <AlertDescription>{txnError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="assets-section">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Verified Assets</h3>
                {assets.length > assetsToShow && (
                  <button
                    onClick={() => setAssetsToShow(prev => 
                      prev === assets.length ? 6 : assets.length
                    )}
                    className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 
                      bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    {assetsToShow === assets.length ? 'Show Less' : 'See More'}
                  </button>
                )}
              </div>
              
              {assetsLoading ? (
                <div className="loading"><Spinner /></div>
              ) : assetsError ? (
                <Alert variant="destructive">{assetsError}</Alert>
              ) : (
                <div className="assets-grid">
                  {assets.slice(0, assetsToShow).map((asset) => (
                    <AssetCard
                      key={asset.asset_id || Math.random()}
                      asset={asset}
                      onOptIn={handleOptIn}
                      onSelect={handleAssetSelect}
                      status={asset.asset_id ? optInStatus[asset.asset_id] : undefined}
                      selected={asset.asset_id === selectedAssetId}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;
