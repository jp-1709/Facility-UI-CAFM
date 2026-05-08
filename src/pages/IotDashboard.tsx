// src/pages/IotDashboard.tsx
import React, { useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, Battery, Cpu,
  Database, Filter, LayoutGrid,
  RefreshCcw, Search, Settings, ShieldAlert,
  Thermometer, TrendingUp, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  useMachineOverview, useFleetKPIs, useMachineHistory,
  useFailureBreakdown, useCriticalMachines
} from '@/hooks/useMachineData';
import {
  STATUS_COLORS, STATUS_LABELS, FAILURE_TYPE_COLORS,
  METRIC_THRESHOLDS, MACHINE_STATUS_OPTIONS
} from '@/config/machineConfig';

const IotDashboard: React.FC = () => {
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  const { data: machines, loading: machinesLoading, refresh: refreshMachines } = useMachineOverview();
  const { kpis, loading: kpisLoading } = useFleetKPIs();
  const { history, loading: historyLoading } = useMachineHistory(selectedMachine, selectedMetric);
  const { breakdown } = useFailureBreakdown(selectedMachine);
  const { critical } = useCriticalMachines();

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesSearch = String(m.machine_id).includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || String(m.machine_status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [machines, searchTerm, statusFilter]);

  const selectedMachineData = useMemo(() => {
    return machines.find(m => m.machine_id === selectedMachine);
  }, [machines, selectedMachine]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Smart Asset Management</h1>
          <p className="text-slate-500">Real-time fleet monitoring and predictive analytics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshMachines}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-700">
            <Settings className="h-4 w-4" />
            System Settings
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Machines"
          value={kpis?.total_machines || 0}
          icon={<Cpu className="h-5 w-5 text-indigo-500" />}
          subValue={`${kpis?.running || 0} Running`}
        />
        <KpiCard
          title="Avg Temperature"
          value={`${kpis?.fleet_avg_temp || 0}°C`}
          icon={<Thermometer className="h-5 w-5 text-orange-500" />}
          subValue="Across fleet"
        />
        <KpiCard
          title="Active Anomalies"
          value={kpis?.anomalies || 0}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          trend={`${kpis?.need_maintenance || 0} need maintenance`}
          trendType="warning"
        />
        <KpiCard
          title="Energy Usage"
          value={`${(kpis?.total_energy_kwh || 0).toLocaleString()} kWh`}
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
          subValue="Last 7 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar / Machine Grid */}
        <div className="lg:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Machine ID..."
                className="w-full bg-transparent text-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                className="rounded-xl border-none bg-white px-4 py-2 text-sm shadow-sm outline-none ring-1 ring-slate-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {MACHINE_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMachines.map((m) => (
              <MachineCard
                key={m.machine_id}
                machine={m}
                isSelected={selectedMachine === m.machine_id}
                onClick={() => setSelectedMachine(m.machine_id)}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            {/* Critical Alerts */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-slate-900">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Critical Machines
                </h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                  {critical.length}
                </span>
              </div>
              <div className="space-y-4">
                {critical.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">All systems within normal parameters</p>
                ) : (
                  critical.map(c => (
                    <div key={c.machine_id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-900">Machine {c.machine_id}</p>
                        <p className="text-xs text-slate-500">{c.failure_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">{(c.downtime_risk * 100).toFixed(0)}% Risk</p>
                        <p className="text-xs text-slate-400">{c.predicted_remaining_life}h left</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Drill-down View */}
            {selectedMachine ? (
              <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 transition-all">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Machine {selectedMachine}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">In-depth Analysis</p>
                  </div>
                  <div className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: STATUS_COLORS[selectedMachineData?.machine_status as keyof typeof STATUS_COLORS] }} />
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                  <MetricSmall
                    label="Temperature"
                    value={`${selectedMachineData?.temperature?.toFixed(1)}°C`}
                    isWarning={selectedMachineData?.temperature > METRIC_THRESHOLDS.temperature.warning}
                  />
                  <MetricSmall
                    label="Vibration"
                    value={`${selectedMachineData?.vibration?.toFixed(1)} mm/s`}
                    isWarning={selectedMachineData?.vibration > METRIC_THRESHOLDS.vibration.warning}
                  />
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">Metric Trend</h4>
                  <select
                    className="bg-transparent text-xs font-medium text-slate-500 outline-none"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                  >
                    <option value="temperature">Temperature</option>
                    <option value="vibration">Vibration</option>
                    <option value="energy_consumption">Energy</option>
                    <option value="downtime_risk">Downtime Risk</option>
                  </select>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="bucket_time"
                        hide
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_val"
                        stroke="#6366f1"
                        fillOpacity={1}
                        fill="url(#colorMetric)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6">
                  <h4 className="mb-4 text-sm font-bold text-slate-700">Failure Distribution (30d)</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="failure_type"
                        >
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={FAILURE_TYPE_COLORS[entry.failure_type] || '#cbd5e1'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
                <LayoutGrid className="mb-4 h-12 w-12 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">Select a machine to view detailed diagnostics and trends</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const KpiCard = ({ title, value, icon, subValue, trend, trendType }: any) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <div className="rounded-xl bg-slate-50 p-2">{icon}</div>
      {trend && (
        <span className={`text-xs font-bold ${trendType === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    {subValue && <p className="mt-1 text-xs text-slate-400">{subValue}</p>}
  </div>
);

const MachineCard = ({ machine, isSelected, onClick }: any) => (
  <div
    onClick={onClick}
    className={`cursor-pointer rounded-2xl p-5 transition-all ${isSelected
      ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]'
      : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-100 hover:shadow-md'
      }`}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${machine.machine_status === 2 ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: STATUS_COLORS[machine.machine_status as keyof typeof STATUS_COLORS] }} />
        <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
          ID {machine.machine_id}
        </span>
      </div>
      {machine.anomaly_flag && (
        <AlertTriangle className="h-4 w-4 text-red-500" />
      )}
    </div>

    <div className="mb-4">
      <h4 className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
        {machine.failure_type !== 'Normal' ? machine.failure_type : STATUS_LABELS[machine.machine_status]}
      </h4>
      <p className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
        Risk: {(machine.downtime_risk * 100).toFixed(0)}% • {machine.predicted_remaining_life}h left
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className={`rounded-lg p-2 ${isSelected ? 'bg-indigo-500/50' : 'bg-slate-50'}`}>
        <p className={`text-[10px] uppercase font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>Temp</p>
        <p className="text-sm font-bold">{machine.temperature?.toFixed(1)}°C</p>
      </div>
      <div className={`rounded-lg p-2 ${isSelected ? 'bg-indigo-500/50' : 'bg-slate-50'}`}>
        <p className={`text-[10px] uppercase font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>Energy</p>
        <p className="text-sm font-bold">{machine.energy_consumption?.toFixed(1)}kW</p>
      </div>
    </div>
  </div>
);

const MetricSmall = ({ label, value, isWarning }: any) => (
  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
    <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
    <p className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
  </div>
);

export default IotDashboard;
