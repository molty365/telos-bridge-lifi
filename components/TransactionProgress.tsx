'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';

type TransactionStep = {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
};

type StepStatus = 'pending' | 'active' | 'completed' | 'error';

type TransactionProgressProps = {
  currentStep: string;
  error?: string;
  transactionHash?: string;
  estimatedCompletion?: Date;
  onClose?: () => void;
};

const BRIDGE_STEPS: TransactionStep[] = [
  {
    id: 'submit',
    title: 'Submit Transaction',
    description: 'Confirm in your wallet',
    estimatedTime: '~30s'
  },
  {
    id: 'confirm',
    title: 'Confirming',
    description: 'Transaction confirmed on source chain',
    estimatedTime: '~2m'
  },
  {
    id: 'bridge',
    title: 'Bridging Assets',
    description: 'Processing cross-chain transfer',
    estimatedTime: '~5-15m'
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Assets received on destination chain',
  }
];

export default function TransactionProgress({
  currentStep,
  error,
  transactionHash,
  estimatedCompletion,
  onClose
}: TransactionProgressProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!estimatedCompletion) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = estimatedCompletion.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Complete');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedCompletion]);

  const getStepStatus = (step: TransactionStep): StepStatus => {
    const currentIndex = BRIDGE_STEPS.findIndex(s => s.id === currentStep);
    const stepIndex = BRIDGE_STEPS.findIndex(s => s.id === step.id);

    if (error && stepIndex === currentIndex) return 'error';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-400" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-400" />;
      case 'active':
        return (
          <div className="h-6 w-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <ClockIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const isComplete = currentStep === 'complete' && !error;

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {error ? 'Transaction Failed' : isComplete ? 'Bridge Complete!' : 'Bridging Assets'}
          </h3>
          {timeRemaining && !error && !isComplete && (
            <p className="text-sm text-gray-400">Est. {timeRemaining} remaining</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        {BRIDGE_STEPS.map((step, index) => {
          const status = getStepStatus(step);
          const isLast = index === BRIDGE_STEPS.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Connection Line */}
              {!isLast && (
                <div className={`absolute left-3 top-8 h-12 w-0.5 ${
                  status === 'completed' ? 'bg-cyan-400' : 'bg-gray-600'
                }`} />
              )}
              
              {/* Step Content */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 relative z-10">
                  {getStepIcon(status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      status === 'error' ? 'text-red-400' :
                      status === 'active' ? 'text-cyan-400' :
                      status === 'completed' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </h4>
                    {step.estimatedTime && status === 'active' && !error && (
                      <span className="text-xs text-gray-500 font-mono">
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm ${
                    status === 'error' ? 'text-red-400/80' :
                    status === 'active' ? 'text-cyan-400/80' :
                    status === 'completed' ? 'text-green-400/80' : 'text-gray-500'
                  }`}>
                    {status === 'error' && step.id === currentStep ? error : step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Hash */}
      {transactionHash && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Transaction Hash:</span>
            <button className="text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-colors">
              {transactionHash.slice(0, 8)}...{transactionHash.slice(-6)}
            </button>
          </div>
        </div>
      )}

      {/* Success Actions */}
      {isComplete && (
        <div className="mt-6 flex space-x-3">
          <button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all">
            View Transaction
          </button>
          <button className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-all">
            Bridge Again
          </button>
        </div>
      )}

      {/* Error Actions */}
      {error && (
        <div className="mt-6 flex space-x-3">
          <button className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all">
            Try Again
          </button>
          <button className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-all">
            Get Help
          </button>
        </div>
      )}
    </div>
  );
}