import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * UI TOKENS: Based on Clean Enterprise Tailwind System
 * bg-card: #ffffff | border: hsl(214, 20%, 92%) | primary: #2196F3
 */
const COLORS = {
  primary: "#2196F3",
  secondary: "#64B5F6",
  success: "#4CAF50",
  warning: "#FF9800",
  danger: "#f44336",
  info: "#00BCD4",
  background: "#f8fafc", // Light neutral surface
  card: "#ffffff",
  border: "hsl(214, 20%, 92%)",
  foreground: "#1e293b", // Dark gray text
  muted: "hsl(215, 16%, 47%)", // Muted text
  mutedBg: "hsl(210, 40%, 96%)",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const weeklyTrend = [
  { date: "01/07", created: 20,  reactive: 98  },
  { date: "01/14", created: 100, reactive: 107 },
  { date: "01/21", created: 90,  reactive: 79  },
  { date: "01/28", created: 140, reactive: 123 },
  { date: "02/04", created: 175, reactive: 119 },
  { date: "02/11", created: 300, reactive: 97  },
];

const categoryData = [
  { name: "HVAC", value: 38, pct: 76, color: COLORS.info },
  { name: "Plumbing", value: 24, pct: 48, color: COLORS.primary },
  { name: "Electrical", value: 31, pct: 62, color: COLORS.warning },
  { name: "Cleaning", value: 19, pct: 38, color: COLORS.success },
];

const statusData = [
  { name: "Open", value: 332, color: COLORS.primary },
  { name: "On Hold", value: 90, color: COLORS.warning },
  { name: "In Progress", value: 271, color: COLORS.info },
  { name: "Done", value: 346, color: COLORS.success },
];

const recentSRs = [
  { id: "SR-2041", cat: "HVAC Maintenance", priority: "P2 - Urgent", status: "In Progress", time: "09:15" },
  { id: "SR-2040", cat: "Plumbing", priority: "P3 - Routine", status: "Open", time: "09:02" },
  { id: "SR-2039", cat: "Electrical", priority: "P1 - Emergency", status: "Resolved", time: "08:44" },
];

// ─── Shared Components ────────────────────────────────────────────────────────

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "0.75rem", // rounded-xl
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    ...style
  }}>
    {children}
  </div>
);

const Badge = ({ label, type = "default" }: { label: string; type?: string }) => {
  const isEmergency = label.includes("P1") || label === "Escalated";
  return (
    <span style={{
      padding: "2px 10px",
      borderRadius: "9999px",
      fontSize: "0.75rem",
      fontWeight: 500,
      background: isEmergency ? `${COLORS.danger}15` : COLORS.mutedBg,
      color: isEmergency ? COLORS.danger : COLORS.muted,
      border: `1px solid ${isEmergency ? `${COLORS.danger}30` : COLORS.border}`,
    }}>
      {label}
    </span>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div style={{
      backgroundColor: COLORS.background,
      color: COLORS.foreground,
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "1.5rem", // p-6
      minHeight: "100vh"
    }}>
      <style>{`
        body { margin: 0; }
        .transition-hover { transition: background-color 0.2s; }
        .transition-hover:hover { background-color: ${COLORS.mutedBg}; }
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: COLORS.primary, margin: 0 }}>
            Live FM Dashboard
          </h1>
          <p style={{ fontSize: "0.875rem", color: COLORS.muted, margin: "0.25rem 0 0 0" }}>
            Real-time analytics and asset performance
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer"
          }}>
            Export Data
          </button>
        </div>
      </header>

      {/* Top Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Open Work Orders", val: "24", sub: "↑ 3 since yesterday", color: COLORS.primary },
          { label: "SLA Compliance", val: "94%", sub: "Target: 95%", color: COLORS.success },
          { label: "Avg MTTR", val: "2.5h", sub: "↓ 0.3h improved", color: COLORS.warning },
          { label: "PPM Completion", val: "88%", sub: "22/25 tasks done", color: COLORS.info },
        ].map((k) => (
          <Card key={k.label} style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: COLORS.muted, textTransform: "uppercase", margin: 0 }}>{k.label}</p>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>{k.val}</h2>
            <p style={{ fontSize: "0.75rem", color: k.sub.includes("↑") ? COLORS.success : COLORS.muted, margin: 0 }}>{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        
        {/* Left Column: Trend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card>
            <div style={{ padding: "1.25rem", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Weekly Ticket Trend</h3>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,92%)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="created" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: COLORS.primary }} />
                  <Line type="monotone" dataKey="reactive" stroke={COLORS.info} strokeWidth={2} dot={{ r: 4, fill: COLORS.info }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div style={{ padding: "1.25rem", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Recent Service Requests</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `1px solid ${COLORS.border}` }}>
                  {["ID", "Category", "Priority", "Status", "Time"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", color: COLORS.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSRs.map((r) => (
                  <tr key={r.id} className="transition-hover" style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                    <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.875rem", fontWeight: 500, color: COLORS.primary }}>{r.id}</td>
                    <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.875rem" }}>{r.cat}</td>
                    <td style={{ padding: "0.875rem 1.25rem" }}><Badge label={r.priority} /></td>
                    <td style={{ padding: "0.875rem 1.25rem" }}><Badge label={r.status} /></td>
                    <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.875rem", color: COLORS.muted }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Right Column: Donuts & Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Status Distribution</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: "1rem" }}>
              {statusData.map(s => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", padding: "0.25rem 0" }}>
                  <span style={{ color: COLORS.muted }}>{s.name}</span>
                  <span style={{ fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Categories</h3>
            {categoryData.map(c => (
              <div key={c.name} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: COLORS.muted }}>{c.value} ({c.pct}%)</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: COLORS.mutedBg, borderRadius: "99px" }}>
                  <div style={{ width: `${c.pct}%`, height: "100%", backgroundColor: c.color, borderRadius: "99px" }} />
                </div>
              </div>
            ))}
          </Card>
        </div>

      </div>
    </div>
  );
}