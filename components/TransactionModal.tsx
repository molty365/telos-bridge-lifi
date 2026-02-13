'use client';

import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import TransactionProgress from './TransactionProgress';

type TransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentStep: string;
  error?: string;
  transactionHash?: string;
  estimatedCompletion?: Date;
  sourceChain?: string;
  destinationChain?: string;
  amount?: string;
  token?: string;
};

export default function TransactionModal({
  isOpen,
  onClose,
  currentStep,
  error,
  transactionHash,
  estimatedCompletion,
  sourceChain,
  destinationChain,
  amount,
  token
}: TransactionModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close modal when transaction is complete (optional auto-close after delay)
  useEffect(() => {
    if (currentStep === 'complete' && !error) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [currentStep, error, onClose]);

  const isComplete = currentStep === 'complete' && !error;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal Container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl text-left align-middle shadow-xl transition-all">
                {/* Bridge Summary Header */}
                {(sourceChain || amount) && (
                  <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Bridging</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {amount && token && (
                            <span className="text-lg font-semibold text-white">
                              {amount} {token}
                            </span>
                          )}
                        </div>
                      </div>
                      {sourceChain && destinationChain && (
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <span className="bg-gray-700 px-2 py-1 rounded-lg">{sourceChain}</span>
                          <span>→</span>
                          <span className="bg-gray-700 px-2 py-1 rounded-lg">{destinationChain}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress Component */}
                <TransactionProgress
                  currentStep={currentStep}
                  error={error}
                  transactionHash={transactionHash}
                  estimatedCompletion={estimatedCompletion}
                  onClose={isComplete || error ? onClose : undefined}
                />

                {/* Success Animation Overlay */}
                {isComplete && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-2xl">
                    <div className="text-center">
                      <div className="relative">
                        {/* Success Animation */}
                        <div className="h-16 w-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                          <div className="h-8 w-8 bg-green-400 rounded-full animate-bounce"></div>
                        </div>
                        
                        {/* Confetti-like dots */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute h-2 w-2 bg-cyan-400 rounded-full animate-ping"
                              style={{
                                left: `${20 + (i * 10)}%`,
                                top: `${30 + (i % 3) * 20}%`,
                                animationDelay: `${i * 100}ms`,
                                animationDuration: '2s'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">Bridge Complete!</h3>
                      <p className="text-gray-400">Your assets have been successfully transferred</p>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}