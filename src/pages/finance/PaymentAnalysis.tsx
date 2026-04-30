import React, { useState, useEffect, useMemo } from 'react';
import { PieChart as PieChartIcon, Activity, LayoutDashboard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { FrappeApp } from 'frappe-js-sdk';

const COLORS = [
    '#10b981', // Green (Cash)
    '#3b82f6', // Blue (Mpesa)
    '#f59e0b', // Yellow (Mobile)
    '#ef4444', // Red (Card)
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
];

interface PaymentEntry {
    name: string;
    mode_of_payment: string;
    paid_amount: number;
    received_amount: number;
    base_paid_amount: number;
    base_received_amount: number;
    payment_type: string;
}



const PaymentAnalysis: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchPayments = async () => {
            setLoading(true);
            try {
                const frappe = new FrappeApp(window.location.origin);
                const db = frappe.db();

                // Fetch Payment Entries for receive
                const data = await db.getDocList('Payment Entry', {
                    fields: ['name', 'mode_of_payment', 'paid_amount', 'received_amount', 'base_paid_amount', 'base_received_amount', 'payment_type'],
                    filters: [['docstatus', '=', 1]],
                    limit: 2000
                });

                if (!isCancelled) {
                    setEntries(data as PaymentEntry[]);
                }
            } catch (err: any) {
                console.error('Failed to fetch payment entries:', err);
                if (!isCancelled) setError(err.message || 'Failed to fetch the payment data');
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchPayments();
        return () => {
            isCancelled = true;
        };
    }, []);

    const summaryData = useMemo(() => {
        const summaryMap: Record<string, { count: number; total: number }> = {};

        entries.forEach(entry => {
            // Include both receive and other types if they are recorded as income, but let's just group mostly by mode
            const mode = entry.mode_of_payment || 'Unknown';
            const amount = entry.base_received_amount || entry.received_amount || entry.paid_amount || 0;

            if (amount > 0) {
                if (!summaryMap[mode]) {
                    summaryMap[mode] = { count: 0, total: 0 };
                }
                summaryMap[mode].count += 1;
                summaryMap[mode].total += amount;
            }
        });

        // Convert to array and assign colors based on predefined array or match strings
        const colorMap: Record<string, string> = {
            'Cash': '#10b981',
            'Mpesa': '#3b82f6',
            'Mobile': '#f59e0b',
            'Card': '#ef4444',
            'Bank': '#8b5cf6'
        };

        const sorted = Object.entries(summaryMap)
            .map(([mode, data], index) => {
                let color = colorMap[mode];
                if (!color) {
                    // Try to partial match
                    const match = Object.keys(colorMap).find(k => mode.toLowerCase().includes(k.toLowerCase()));
                    color = match ? colorMap[match] : COLORS[index % COLORS.length];
                }
                return {
                    mode,
                    count: data.count,
                    total: data.total,
                    color
                };
            })
            .sort((a, b) => b.total - a.total);

        return sorted;
    }, [entries]);

    const overallTotal = useMemo(() => summaryData.reduce((acc, curr) => acc + curr.total, 0), [summaryData]);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-KE', {
            style: 'currency', currency: 'KES',
            minimumFractionDigits: 0, maximumFractionDigits: 2,
        }).format(n);

    // Custom Tooltip for Pie Chart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm animate-in fade-in zoom-in-95 duration-200">
                    <p className="font-semibold text-gray-800">{data.mode}</p>
                    <p className="text-gray-600">Total: <span className="font-semibold">{formatCurrency(data.total)}</span></p>
                    <p className="text-gray-600">Transactions: <span className="font-semibold">{data.count}</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                <PieChartIcon className="h-6 w-6 text-primary" />
                Payment Analysis
            </h1>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800">Sales by Payment Method</h2>
                </div>

                {loading ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 gap-3">
                        <Activity className="h-8 w-8 animate-spin" />
                        <p>Analyzing payments...</p>
                    </div>
                ) : summaryData.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 gap-3">
                        <LayoutDashboard className="h-10 w-10 opacity-20" />
                        <p>No payment found.</p>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Chart Area with hover animations */}
                        <div className="h-[350px] w-full flex justify-center items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summaryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={120}
                                        paddingAngle={2}
                                        dataKey="total"
                                        labelLine={false}
                                        label={({ cx, cy, midAngle = 0, outerRadius, value, index }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius + 30;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            const color = summaryData[index].color;
                                            const mode = summaryData[index].mode;
                                            return (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    fill={color}
                                                    textAnchor={x > cx ? 'start' : 'end'}
                                                    dominantBaseline="central"
                                                    className="text-xs font-medium animate-in fade-in"
                                                    style={{ animationDelay: `${index * 150}ms`, fill: color }}
                                                >
                                                    {mode}: {formatCurrency(value)}
                                                </text>
                                            );
                                        }}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {summaryData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                className="hover:opacity-80 transition-opacity duration-300 cursor-pointer outline-none"
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Custom Legend */}
                        <div className="flex flex-wrap justify-center gap-4 mt-2 mb-8 items-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-both">
                            {summaryData.map((entry, idx) => (
                                <div key={`legend-${idx}`} className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                                    <span>{entry.mode}</span>
                                </div>
                            ))}
                        </div>

                        {/* List View Details */}
                        <div className="space-y-3 mt-6">
                            {summaryData.map((item, idx) => (
                                <div
                                    key={item.mode}
                                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-right-4 group"
                                    style={{ animationDelay: `${500 + (idx * 100)}ms`, animationFillMode: 'both' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full group-hover:scale-125 transition-transform duration-300"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-gray-800">{item.mode}</span>
                                            <span className="text-xs text-gray-400">({item.count} transaction{item.count !== 1 ? 's' : ''})</span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-gray-800">
                                        {formatCurrency(item.total)}
                                    </div>
                                </div>
                            ))}

                            {/* Total row */}
                            <div
                                className="flex items-center justify-between p-4 mt-6 border-t font-bold text-lg animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${500 + (summaryData.length * 100) + 100}ms`, animationFillMode: 'both' }}
                            >
                                <span className="text-gray-800">Total</span>
                                <span className="text-yellow-500">{formatCurrency(overallTotal)}</span>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentAnalysis;
