import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import { ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SwapFormProps {
  accountAddress: string;
  network: 'MainNet' | 'TestNet';
  peraWallet: PeraWalletConnect;
  assetId?: number;
}

type SwapStatus = 'idle' | 'creating' | 'awaiting_signature' | 'pending' | 'completed' | 'failed';

const AtomicSwap: React.FC<SwapFormProps> = ({
  accountAddress,
  network,
  peraWallet,
  assetId
}) => {
  const [amount, setAmount] = useState<string>('');
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [swapStatus, setSwapStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string>('');

  // Original helper functions remain the same
  const getAlgodClient = (network: 'MainNet' | 'TestNet') => {
    const server = network === 'MainNet' 
      ? 'https://mainnet-api.algonode.cloud'
      : 'https://testnet-api.algonode.cloud';
    return new algosdk.Algodv2('', server, '');
  };

  const waitForConfirmation = async (client: algosdk.Algodv2, txId: string) => {
    const status = await client.status().do();
    let lastRound = status["last-round"];
    
    while (true) {
      const pendingInfo = await client
        .pendingTransactionInformation(txId)
        .do();
      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
        break;
      }
      lastRound++;
      await client.statusAfterBlock(lastRound).do();
    }
  };

  const checkAssetBalance = async (client: algosdk.Algodv2, address: string, assetId: number) => {
    try {
      const accountInfo = await client.accountInformation(address).do();
      const asset = accountInfo.assets?.find((a: any) => a['asset-id'] === assetId);
      return asset ? asset.amount : 0;
    } catch (error) {
      console.error('Error checking balance:', error);
      return 0;
    }
  };

  const handleCreateSwap = useCallback(async () => {
    // Original handleCreateSwap implementation remains the same
    if (!accountAddress || !receiverAddress || !amount || !assetId) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSwapStatus('creating');
      setError('');

      if (!algosdk.isValidAddress(receiverAddress)) {
        throw new Error('Invalid receiver address');
      }

      if (parseInt(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const client = getAlgodClient(network);
      
      const balance = await checkAssetBalance(client, accountAddress, assetId);
      const requestedAmount = parseInt(amount);
      
      if (balance < requestedAmount) {
        throw new Error(`Insufficient balance. Available: ${balance}, Requested: ${requestedAmount}`);
      }

      const suggestedParams = await client.getTransactionParams().do();

      const asaTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: accountAddress,
        to: receiverAddress,
        amount: parseInt(amount),
        assetIndex: assetId,
        suggestedParams
      });

      setSwapStatus('awaiting_signature');

      const txnsToSign = [[{
        txn: asaTxn,
        signers: [accountAddress]
      }]];

      const signedTxns = await peraWallet.signTransaction(txnsToSign);

      if (!signedTxns) {
        throw new Error('Transaction was not signed');
      }

      const { txId } = await client.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(client, txId, 4);

      setSwapStatus('completed');
      console.log('Transaction completed successfully. TxID:', txId);

    } catch (error: any) {
      console.error('Swap failed:', error);
      setError(error?.message || 'Failed to create swap');
      setSwapStatus('failed');
    }
  }, [accountAddress, receiverAddress, amount, assetId, network, peraWallet]);

  return (
    <Card className="w-[420px] backdrop-blur-sm bg-white/90 shadow-2xl border border-white/20 rounded-3xl overflow-hidden">
      <CardHeader className="space-y-2 p-8 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              Atomic Swap
            </CardTitle>
            <p className="text-sm text-white/80 font-medium">
              Exchange ASA for ALGO
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-8">
        <div className="space-y-6">
          {/* Receiver Address Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              Receiver Address
            </label>
            <div className="relative group">
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl 
                  focus:ring-2 focus:ring-violet-500 focus:border-violet-500 
                  transition-all duration-200 text-sm placeholder:text-gray-400
                  group-hover:border-gray-300"
                placeholder="Enter receiver address"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              Amount of ASA {assetId}
            </label>
            <div className="relative group">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl
                  focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                  transition-all duration-200 text-sm placeholder:text-gray-400
                  group-hover:border-gray-300"
                placeholder="Enter amount"
                min="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                ASA
              </span>
            </div>
          </div>

          {/* Swap Preview */}
          <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
            <p className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Exchange {amount || '0'} of ASA {assetId} for 1 ALGO
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCreateSwap}
            disabled={swapStatus !== 'idle' && swapStatus !== 'failed'}
            className={`w-full py-4 px-4 rounded-2xl text-white font-semibold
              transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
              ${swapStatus === 'idle' || swapStatus === 'failed' 
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25' 
                : 'bg-gray-400'} 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
          >
            <div className="flex items-center justify-center space-x-2">
              {swapStatus === 'creating' && (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>
                {swapStatus === 'creating' ? 'Creating Swap...' :
                 swapStatus === 'awaiting_signature' ? 'Awaiting Signature...' :
                 swapStatus === 'pending' ? 'Processing...' :
                 swapStatus === 'completed' ? 'Swap Created!' :
                 swapStatus === 'failed' ? 'Try Again' :
                 'Create Swap'}
              </span>
            </div>
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl 
              animate-in slide-in-from-top duration-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {swapStatus === 'completed' && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl
              animate-in slide-in-from-top duration-200">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600 font-medium">
                  Swap created successfully! Share the swap details with the receiver.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AtomicSwap;