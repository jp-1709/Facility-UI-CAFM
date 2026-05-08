// src/hooks/useMachineData.ts
import { useState, useEffect, useCallback } from 'react';

const BASE_URL = '/api/method/quantbit_facility_management.api.iot';

export const useMachineOverview = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}.get_machine_overview`);
      const result = await response.json();
      setData(result.message || []);
    } catch (err) {
      setError('Failed to fetch machine overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Mocking real-time listener (In a real Frappe app, use frappe.realtime)
    // Assuming frappe is globally available or handled via a context
    const handleUpdate = (update: any) => {
      setData((prev) => 
        prev.map((m) => (m.machine_id === update.machine_id ? { ...m, ...update } : m))
      );
    };

    // This is a placeholder for actual Socket.io integration
    if ((window as any).frappe) {
      (window as any).frappe.realtime.on('machine_feed', handleUpdate);
    }

    return () => {
      if ((window as any).frappe) {
        (window as any).frappe.realtime.off('machine_feed', handleUpdate);
      }
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
};

export const useFleetKPIs = (days = 7) => {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}.get_fleet_kpis?days=${days}`)
      .then(res => res.json())
      .then(result => setKpis(result.message))
      .finally(() => setLoading(false));
  }, [days]);

  return { kpis, loading };
};

export const useMachineHistory = (machineId: number | null, metricName: string, days = 7) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (machineId === null) return;
    setLoading(true);
    fetch(`${BASE_URL}.get_machine_history?machine_id=${machineId}&metric_name=${metricName}&days=${days}`)
      .then(res => res.json())
      .then(result => setHistory(result.message || []))
      .finally(() => setLoading(false));
  }, [machineId, metricName, days]);

  return { history, loading };
};

export const useFailureBreakdown = (machineId: number | null = null, days = 30) => {
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = machineId 
      ? `${BASE_URL}.get_failure_breakdown?machine_id=${machineId}&days=${days}`
      : `${BASE_URL}.get_failure_breakdown?days=${days}`;
    
    fetch(url)
      .then(res => res.json())
      .then(result => setBreakdown(result.message || []))
      .finally(() => setLoading(false));
  }, [machineId, days]);

  return { breakdown, loading };
};

export const useCriticalMachines = (threshold = 0.7) => {
  const [critical, setCritical] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}.get_critical_machines?risk_threshold=${threshold}`)
      .then(res => res.json())
      .then(result => setCritical(result.message || []))
      .finally(() => setLoading(false));
  }, [threshold]);

  return { critical, loading };
};
