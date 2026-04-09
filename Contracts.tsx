import React, { useState } from "react";
import {
  Search, Plus, Building2, User, CalendarDays, Tag, CheckCircle2,
  ChevronDown, ChevronUp, Edit2, MoreVertical, Link as LinkIcon,
  Download, AlertTriangle, Paperclip, Settings, Shield, Wrench,
  Briefcase, FileText
} from "lucide-react";

// --- MOCK DATA ---
const mockContracts = [
  { id: "C-1", title: "HVAC AMC - Al Barsha Tower A", contractor: "GulfTech Services", type: "AMC", value: "AED 96,000/yr", expiry: "Expires Jun 2026", status: "Active", icon: "❄️", bg: "bg-blue-100", text: "text-blue-600" },
  { id: "C-2", title: "Elevator PMC - All Properties", contractor: "KONE Elevators LLC", type: "PMC", value: "AED 36,000/yr", expiry: "Expires Aug 2026", status: "Active", icon: "↕️", bg: "bg-green-100", text: "text-green-600" },
  { id: "C-3", title: "FM Master Contract - Tower B & C", contractor: "Ficus FM Operations", type: "FM", value: "AED 480,000/yr", expiry: "Expires Dec 2026", status: "Active", icon: "🏢", bg: "bg-purple-100", text: "text-purple-600" },
  { id: "C-4", title: "Pest Control - Quarterly", contractor: "BugShield Arabia", type: "AMC", value: "AED 8,400/yr", expiry: "Expires Apr 2026", status: "Expiring", icon: "🪲", bg: "bg-blue-100", text: "text-blue-600" },
  { id: "C-5", title: "CCTV Maintenance AMC", contractor: "SecureTech UAE", type: "AMC", value: "AED 18,000/yr", expiry: "Expires Feb 2026", status: "Expired", icon: "📹", bg: "bg-blue-100", text: "text-blue-600" },
  { id: "C-6", title: "Civil Works Ad-Hoc", contractor: "BuildRight LLC", type: "AdHoc", value: "AED 24,000", expiry: "Completed", status: "Closed", icon: "🏗️", bg: "bg-orange-100", text: "text-orange-600" },
];

export default function Contracts() {
  const [viewMode, setViewMode] = useState<"detail" | "new">("detail");
  const [selectedId, setSelectedId] = useState("C-1");
  const [activeTab, setActiveTab] = useState("Active");
  
  // Collapsible sections state
  const [propOpen, setPropOpen] = useState(true);
  const [ppmOpen, setPpmOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);
  const [woOpen, setWoOpen] = useState(true);
  const [invOpen, setInvOpen] = useState(true);
  const [woFilter, setWoFilter] = useState("All");

  const [autoRenew, setAutoRenew] = useState(true);
  const [vatApplies, setVatApplies] = useState(true);

  // Status Badges
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Active": return "bg-[#DCFCE7] text-[#166534]";
      case "Expiring": return "bg-[#FEF3C7] text-[#92400E]";
      case "Expired": return "bg-[#FEE2E2] text-[#991B1B]";
      case "Draft": return "bg-[#F1F5F9] text-[#475569]";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 font-sans">
      
      {/* ═════════ TOP BAR ═════════ */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search Contracts…" 
              className="w-72 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <button 
            onClick={() => setViewMode("new")}
            className="flex items-center px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" /> New Contract
          </button>
        </div>
      </div>

      {/* ═════════ FILTER ROW ═════════ */}
      <div className="flex items-center px-6 py-3 border-b border-slate-200 bg-slate-50/50 space-x-2">
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
          <Building2 className="w-4 h-4 mr-2 text-slate-400" /> Property
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
          <User className="w-4 h-4 mr-2 text-slate-400" /> Contractor
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
          <CalendarDays className="w-4 h-4 mr-2 text-slate-400" /> Expiry Date
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
          <Tag className="w-4 h-4 mr-2 text-slate-400" /> Contract Type
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
          <CheckCircle2 className="w-4 h-4 mr-2 text-slate-400" /> Status
        </button>
        <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 border border-dashed border-slate-300 rounded-full hover:bg-slate-50">
          <Plus className="w-4 h-4 mr-1" /> Add Filter
        </button>
      </div>

      {/* ═════════ SPLIT PANEL ═════════ */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ═════════ LEFT PANEL (LIST) ═════════ */}
        <div className="w-[420px] border-r border-slate-200 flex flex-col bg-white">
          <div className="flex border-b border-slate-200">
            {["Active", "Expired", "All"].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === tab ? "text-[#2563EB] border-b-2 border-[#2563EB]" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100">
            <span className="text-sm text-slate-500">Sort By: <span className="text-[#2563EB] cursor-pointer">Expiry Date: Soonest First ▾</span></span>
          </div>
          <div className="px-4 py-2 bg-slate-50 flex items-center border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-700">All Contracts (6)</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mockContracts.map((c) => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedId(c.id); setViewMode("detail"); }}
                className={`flex items-center px-4 h-[84px] border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedId === c.id && viewMode === "detail" ? "bg-blue-50/50" : ""}`}
              >
                {/* Left: Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 shrink-0 ${c.bg}`}>
                  {c.icon}
                </div>
                
                {/* Center: Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{c.contractor}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-slate-500 truncate max-w-[120px]">Al Barsha Tower A</span>
                    <span className={`text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{c.type}</span>
                  </div>
                </div>

                {/* Right: Value & Status */}
                <div className="flex flex-col items-end shrink-0">
                  <p className="text-sm font-medium text-slate-900">{c.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.expiry}</p>
                  <div className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 flex items-center ${getStatusClasses(c.status)}`}>
                    {c.status} {c.status === "Expiring" && "⚠️"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═════════ RIGHT PANEL ═════════ */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          
          {viewMode === "detail" ? (
            /* --- DETAIL VIEW --- */
            <div className="max-w-4xl mx-auto p-8 pb-20">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-slate-900">HVAC AMC - Al Barsha Tower A</h2>
                <div className="flex items-center space-x-3">
                  <span className="bg-[#DCFCE7] text-[#166534] px-2.5 py-1 rounded-full text-sm font-semibold">Active</span>
                  <button className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">
                    <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                  </button>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Contract Identity */}
              <div className="mb-8 border-t border-slate-200">
                {[
                  { label: "Contract ID", value: "FMC-2026-001" },
                  { label: "Contract Type", value: "AMC (Annual Maintenance Contract)" },
                  { label: "Series", value: "FMC-.####" },
                  { label: "Company", value: "Ficus Real Estate LLC" },
                  { label: "Contractor", value: "GulfTech Services LLC", isLink: true },
                  { label: "Contract Manager", value: "Ahmed Hassan" },
                ].map((field, idx) => (
                  <div key={idx} className="flex py-3 border-b border-slate-200">
                    <div className="w-1/3 text-sm text-slate-500">{field.label}</div>
                    <div className={`w-2/3 text-sm font-medium ${field.isLink ? "text-[#2563EB] hover:underline cursor-pointer" : "text-slate-900"}`}>
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scope & Duration */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-2 uppercase tracking-wide">Scope & Duration</h3>
                <div className="space-y-3 pt-1">
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Start Date</div><div className="w-2/3 text-sm text-slate-900">Jan 01, 2026</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">End Date</div><div className="w-2/3 text-sm text-slate-900">Dec 31, 2026</div></div>
                  <div className="flex items-center">
                    <div className="w-1/3 text-sm text-slate-500">Auto-Renew</div>
                    <div className="w-2/3 text-sm flex items-center space-x-4">
                      <span className="text-slate-900 font-medium">Yes</span>
                      <div className="w-10 h-5 bg-[#2563EB] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5"></div></div>
                    </div>
                  </div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Renewal Notice Days</div><div className="w-2/3 text-sm text-slate-900">30 days</div></div>
                  <div className="flex pt-2">
                    <div className="w-1/3 text-sm text-slate-500">Description / Scope</div>
                    <div className="w-2/3 text-sm text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed">
                      Full AMC coverage for all HVAC systems including chillers, AHUs, FCUs, and ventilation units across Al Barsha Tower A. Includes quarterly PPM visits, 24/7 emergency callout, and parts replacement up to AED 5,000 per incident.
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-2 uppercase tracking-wide">Financial</h3>
                <div className="space-y-3 pt-1">
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Contract Value</div><div className="w-2/3 text-sm font-medium text-slate-900">AED 96,000</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Billing Frequency</div><div className="w-2/3 text-sm text-slate-900">Monthly (AED 8,000/month)</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">VAT Applicable</div><div className="w-2/3 text-sm text-slate-900">Yes (5%)</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Total with VAT</div><div className="w-2/3 text-sm font-bold text-slate-900">AED 100,800</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Currency</div><div className="w-2/3 text-sm text-slate-900">AED</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Cost Centre</div><div className="w-2/3 text-sm text-slate-900">Al Barsha Tower A - HVAC</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Total Invoiced YTD</div><div className="w-2/3 text-sm text-slate-900">AED 24,000 (3 months)</div></div>
                  <div className="flex"><div className="w-1/3 text-sm text-slate-500">Outstanding Balance</div><div className="w-2/3 text-sm font-medium text-orange-600">AED 72,000</div></div>
                </div>
              </div>

              {/* Covered Properties */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setPropOpen(!propOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Covered Properties</span>
                  {propOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {propOpen && (
                  <div className="p-0">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 font-medium text-slate-500">Property</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Floors Covered</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Units</th>
                          <th className="px-4 py-2 font-medium text-slate-500">SLA Policy</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-900 font-medium">Al Barsha Tower A</td>
                          <td className="px-4 py-3 text-slate-600">All Floors</td>
                          <td className="px-4 py-3 text-slate-600">All Units</td>
                          <td className="px-4 py-3 text-[#2563EB] hover:underline cursor-pointer">HVAC SLA Gold</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SLA Linkage */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center"><Shield className="w-4 h-4 mr-2 text-slate-400" /> SLA Policy</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">SLA Policy</p>
                    <p className="text-sm text-[#2563EB] font-medium hover:underline cursor-pointer">HVAC SLA Gold</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Response Target</p>
                    <p className="text-sm text-slate-900">2 hours</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Resolution Target</p>
                    <p className="text-sm text-slate-900">8 hours</p>
                  </div>
                </div>
              </div>

              {/* PPM Schedules */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setPpmOpen(!ppmOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">PPM Schedules</span>
                  {ppmOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {ppmOpen && (
                  <div className="p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Auto-generated PPM Work Orders</p>
                    <table className="w-full text-left text-sm mb-4">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-slate-500 rounded-tl-md">Schedule Name</th>
                          <th className="px-3 py-2 font-medium text-slate-500">Frequency</th>
                          <th className="px-3 py-2 font-medium text-slate-500">Next Due</th>
                          <th className="px-3 py-2 font-medium text-slate-500 rounded-tr-md">Last WO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-3 py-2.5 text-slate-900">Chiller A Quarterly PPM</td>
                          <td className="px-3 py-2.5 text-slate-600">Quarterly</td>
                          <td className="px-3 py-2.5 text-slate-600">Jul 2026</td>
                          <td className="px-3 py-2.5 text-[#2563EB] hover:underline cursor-pointer font-medium">WO-101</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2.5 text-slate-900">AHU Filter Change L3</td>
                          <td className="px-3 py-2.5 text-slate-600">Monthly</td>
                          <td className="px-3 py-2.5 text-slate-600">May 2026</td>
                          <td className="px-3 py-2.5 text-[#2563EB] hover:underline cursor-pointer font-medium">WO-102</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2.5 text-slate-900">FCU Service All Floors</td>
                          <td className="px-3 py-2.5 text-slate-600">Bi-Annual</td>
                          <td className="px-3 py-2.5 text-slate-600">Jul 2026</td>
                          <td className="px-3 py-2.5 text-[#2563EB] hover:underline cursor-pointer font-medium">WO-125</td>
                        </tr>
                      </tbody>
                    </table>
                    <button className="text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 px-4 py-2">
                      + Add PPM Schedule
                    </button>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setDocsOpen(!docsOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Contract Documents</span>
                  {docsOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {docsOpen && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-all">
                      <div className="flex items-center space-x-3 text-sm text-slate-900"><FileText className="w-5 h-5 text-red-500" /> <span>Signed Contract.pdf</span></div>
                      <button className="text-sm font-medium text-[#2563EB] flex items-center hover:underline"><Download className="w-4 h-4 mr-1" /> Download</button>
                    </div>
                    <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-all">
                      <div className="flex items-center space-x-3 text-sm text-slate-900"><FileText className="w-5 h-5 text-red-500" /> <span>Scope of Work.pdf</span></div>
                      <button className="text-sm font-medium text-[#2563EB] flex items-center hover:underline"><Download className="w-4 h-4 mr-1" /> Download</button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-md border border-orange-200">
                      <div className="flex items-center space-x-3 text-sm text-slate-900"><FileText className="w-5 h-5 text-red-500" /> <span>Insurance Certificate.pdf</span></div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-orange-700 font-medium flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Expires May 2026</span>
                        <button className="text-sm font-medium text-[#2563EB] flex items-center hover:underline"><Download className="w-4 h-4 mr-1" /> Download</button>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button className="text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 px-4 py-2 flex items-center">
                        <Paperclip className="w-4 h-4 mr-2 text-slate-400" /> Attach Document
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Order History */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setWoOpen(!woOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Work Orders (14)</span>
                  {woOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {woOpen && (
                  <div className="p-0">
                    <div className="flex border-b border-slate-200 px-4 pt-2 space-x-4 bg-slate-50/50">
                      {["All", "Reactive", "PPM", "Inspection"].map(f => (
                        <button key={f} onClick={() => setWoFilter(f)} className={`pb-2 text-sm font-medium border-b-2 ${woFilter === f ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 font-medium text-slate-500">WO ID</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Title</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Date</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-3 text-[#2563EB] font-medium hover:underline cursor-pointer">WO-101</td>
                          <td className="px-4 py-3 text-slate-900">Chiller A Quarterly PPM</td>
                          <td className="px-4 py-3 text-slate-600">Apr 2026</td>
                          <td className="px-4 py-3"><span className="text-emerald-600 font-medium">Open</span></td>
                          <td className="px-4 py-3 text-slate-400">—</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-[#2563EB] font-medium hover:underline cursor-pointer">WO-088</td>
                          <td className="px-4 py-3 text-slate-900">Emergency Chiller Repair</td>
                          <td className="px-4 py-3 text-slate-600">Jan 2026</td>
                          <td className="px-4 py-3"><span className="text-slate-500 font-medium">Completed</span></td>
                          <td className="px-4 py-3 text-slate-900">AED 3,200</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-[#2563EB] font-medium hover:underline cursor-pointer">WO-071</td>
                          <td className="px-4 py-3 text-slate-900">AHU Filter Change</td>
                          <td className="px-4 py-3 text-slate-600">Oct 2025</td>
                          <td className="px-4 py-3"><span className="text-slate-500 font-medium">Completed</span></td>
                          <td className="px-4 py-3 text-slate-900">AED 450</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-center">
                      <button className="text-sm font-medium text-[#2563EB] hover:underline">View all 14 Work Orders →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setInvOpen(!invOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Invoices (3)</span>
                  {invOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {invOpen && (
                  <div className="p-4">
                    <table className="w-full text-left text-sm mb-4">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-slate-500 rounded-tl-md">Invoice #</th>
                          <th className="px-3 py-2 font-medium text-slate-500">Period</th>
                          <th className="px-3 py-2 font-medium text-slate-500">Amount</th>
                          <th className="px-3 py-2 font-medium text-slate-500">Status</th>
                          <th className="px-3 py-2 font-medium text-slate-500 rounded-tr-md">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { inv: "INV-2026-003", period: "Mar 2026", amt: "AED 8,000", status: "Paid", due: "Mar 31" },
                          { inv: "INV-2026-002", period: "Feb 2026", amt: "AED 8,000", status: "Paid", due: "Feb 28" },
                          { inv: "INV-2026-001", period: "Jan 2026", amt: "AED 8,000", status: "Paid", due: "Jan 31" },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2.5 text-[#2563EB] hover:underline cursor-pointer font-medium">{row.inv}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.period}</td>
                            <td className="px-3 py-2.5 text-slate-900 font-medium">{row.amt}</td>
                            <td className="px-3 py-2.5"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">{row.status}</span></td>
                            <td className="px-3 py-2.5 text-slate-600">{row.due}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="text-sm font-medium text-[#2563EB] border border-[#2563EB]/30 bg-blue-50/50 hover:bg-blue-50 rounded px-4 py-2">
                      + Create Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* --- NEW CONTRACT FORM --- */
            <div className="max-w-3xl mx-auto p-8 pb-20">
              <h2 className="text-xl font-bold text-slate-900 mb-8">New Contract</h2>
              
              <div className="space-y-8">
                
                {/* Contract Type Grid */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Contract Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-[#2563EB] bg-blue-50/30 rounded-xl p-4 cursor-pointer flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">🔵</div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">AMC</h4>
                        <p className="text-xs text-slate-500 mt-1">Annual Maintenance Contract</p>
                      </div>
                    </div>
                    <div className="border border-slate-200 hover:border-green-400 rounded-xl p-4 cursor-pointer flex items-start space-x-3 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl shrink-0">🟢</div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">PMC</h4>
                        <p className="text-xs text-slate-500 mt-1">Planned Maintenance Contract</p>
                      </div>
                    </div>
                    <div className="border border-slate-200 hover:border-purple-400 rounded-xl p-4 cursor-pointer flex items-start space-x-3 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0">🟣</div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">FM</h4>
                        <p className="text-xs text-slate-500 mt-1">Facility Management Contract</p>
                      </div>
                    </div>
                    <div className="border border-slate-200 hover:border-orange-400 rounded-xl p-4 cursor-pointer flex items-start space-x-3 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl shrink-0">🟠</div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">Ad-Hoc</h4>
                        <p className="text-xs text-slate-500 mt-1">One-time or project-based</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contract Title <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. HVAC AMC - Tower A" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contractor <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Search contractor..." className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                      <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                        <option>Ficus Real Estate LLC</option>
                        <option>Other Company LLC</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dates & Renewal */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Duration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input type="date" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <input type="date" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 pt-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-700">Auto-Renew</span>
                      <div onClick={() => setAutoRenew(!autoRenew)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${autoRenew ? "bg-[#2563EB]" : "bg-slate-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${autoRenew ? "right-0.5" : "left-0.5"}`}></div>
                      </div>
                    </div>
                    {autoRenew && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600">Renewal Notice (days):</span>
                        <input type="number" defaultValue={30} className="w-20 p-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#2563EB]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">Covered Properties</h3>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-[#2563EB] border-slate-300 rounded" />
                        <span className="text-sm font-medium text-slate-900">Al Barsha Tower A</span>
                      </label>
                      <div className="pl-6">
                        <select className="w-full max-w-xs p-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option>All Floors</option>
                          <option>Specific Floors...</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 pt-2 border-t border-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-[#2563EB] border-slate-300 rounded" />
                        <span className="text-sm font-medium text-slate-900">Tower B</span>
                      </label>
                    </div>
                    <button className="text-sm text-[#2563EB] font-medium hover:underline">+ Add another property</button>
                  </div>
                </div>

                {/* Financial */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Financial</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value (AED)</label>
                      <input type="number" placeholder="0.00" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Billing Frequency</label>
                      <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Semi-Annual</option>
                        <option>Annual</option>
                        <option>One-Time</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-700">VAT Applicable</span>
                      <div onClick={() => setVatApplies(!vatApplies)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${vatApplies ? "bg-[#2563EB]" : "bg-slate-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${vatApplies ? "right-0.5" : "left-0.5"}`}></div>
                      </div>
                    </div>
                    {vatApplies && <span className="text-sm text-slate-500 italic">(5% auto-calculated on invoices)</span>}
                  </div>
                </div>

                {/* SLA & Scope */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SLA Policy</label>
                    <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                      <option>Select Policy...</option>
                      <option>HVAC SLA Gold</option>
                      <option>Standard Maintenance SLA</option>
                      <option>Emergency Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description/Scope</label>
                    <textarea rows={4} placeholder="Describe the contract scope..." className="w-full p-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]"></textarea>
                  </div>
                </div>

                {/* Documents Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Documents</label>
                  <div className="w-full py-8 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 transition-colors">
                    <Paperclip className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-600 font-medium">📎 Attach contract documents…</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-6">
                  <button className="w-full py-3 bg-[#2563EB] text-white font-semibold rounded-md hover:bg-blue-700 h-[48px] transition-colors shadow-sm">
                    Create Contract
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}