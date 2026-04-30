import React from 'react';
import { ArrowLeft } from 'lucide-react';

const OpeningBalances: React.FC = () => {
    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Opening Balances</h1>
                        <p className="text-gray-600 mt-2">Manage opening balances for all accounts</p>
                    </div>
                    <button onClick={() => window.location.href = '/pos'} className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to POS
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <div className="text-center">
                    <ArrowLeft className="h-12 w-12 opacity-20" />
                    <p className="mt-4 text-lg font-medium">Opening Balances</p>
                    <p className="text-sm text-gray-500">This page is under construction</p>
                </div>
            </div>
        </div>
    );
};

export default OpeningBalances;
