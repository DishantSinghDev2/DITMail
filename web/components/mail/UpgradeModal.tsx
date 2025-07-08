// components/mail/UpgradeModal.tsx
"use client"

import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/solid'

interface UpgradeModalProps {
  onClose: () => void;
}

const plans = [
    {
        name: 'Pro',
        price: '15',
        features: ['50 GB Storage', 'Advanced Collaboration', 'Custom Domain', 'Priority Support'],
        primary: false,
    },
    {
        name: 'Business',
        price: '25',
        features: ['100 GB Storage', 'Team Management', 'Security Audits', '24/7 Dedicated Support'],
        primary: true,
    }
]

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl transform animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upgrade Your Plan</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-8">
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
                Unlock more power and features by upgrading your account.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map(plan => (
                    <div key={plan.name} className={`rounded-lg border p-6 flex flex-col ${plan.primary ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${plan.price}</span>
                            / month
                        </p>
                        <ul className="mt-6 space-y-4 flex-grow">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-start">
                                    <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mr-3 mt-0.5" />
                                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                         <button className={`w-full mt-8 py-3 rounded-lg font-semibold transition ${plan.primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}>
                            Choose {plan.name}
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  )
}