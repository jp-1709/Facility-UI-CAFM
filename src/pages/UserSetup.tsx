import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Save,
  X,
  Trash2,
  RefreshCw,
  Edit,
  Shield,
  UserPlus,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  Mail,
  Phone,
  Smartphone,
  Lock,
  ArrowRight,
  CheckCheck,
  FileText,
  Activity,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { cn } from "@/lib/utils";
import { frappeFetch } from '@/lib/frappe-sdk';

/* ═══════════════════════════════════════════
   GLOBAL STYLES & ANIMATIONS
   (Matches Contracts/Assets aesthetic)
═══════════════════════════════════════════ */

const USER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes userFadeUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes userSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes userPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .5; }
}

.u-fade-up   { animation: userFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.u-slide-r   { animation: userSlideR 0.22s cubic-bezier(.4,0,.2,1) both; }
.u-stagger > * { animation: userFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }

/* Rich Card Styles */
.user-rich-card {
  position: relative;
  transition: transform 0.18s cubic-bezier(.22,1,.36,1),
              box-shadow 0.18s cubic-bezier(.22,1,.36,1),
              border-color 0.18s ease;
  will-change: transform;
}
.user-rich-card:hover {
  transform: translateY(-1px) scale(1.008);
  box-shadow: 0 6px 24px rgba(79, 70, 229, 0.08), 0 1px 4px rgba(79, 70, 229, 0.04);
}
.user-rich-card.selected {
  border-color: #4F46E5;
  background-color: #4F46E508;
  transform: translateY(-1px) scale(1.010);
  box-shadow: 0 8px 30px rgba(79, 70, 229, 0.12);
}

.user-card-row:hover .user-arrow { opacity: 1; transform: translateX(3px); }
.user-arrow { opacity: 0; transition: opacity .14s, transform .14s; }

.section-card-wrap { transition: box-shadow .18s, transform .18s; }
.section-card-wrap:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,0,0,.08); }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #4F46E530; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #4F46E5; }
`;

// Helper for class merging
const s = (cls: string) => cn("font-['DM_Sans']", cls);

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface UserRole {
  role: string;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
}

interface User {
  name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  mobile_no?: string;
  enabled?: number;
  user_type?: string;
  roles?: UserRole[];
  new_password?: string;
  confirm_password?: string;
}

interface RoleDoc {
  name: string;
  role_name: string;
  desk_access?: number;
  is_custom?: number;
  disabled?: number;
  two_factor_auth?: number;
}

/* ═══════════════════════════════════════════
   UI COMPONENTS (Matches Contracts.tsx)
═══════════════════════════════════════════ */

function SectionCard({
  accentColor, icon, title, subtitle, children, className = "",
}: {
  accentColor: string; icon: React.ReactNode; title: string; subtitle?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`section-card-wrap u-fade-up rounded-2xl border border-border/70 bg-card overflow-hidden mb-5 ${className}`}>
      {/* colour accent strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accentColor},${accentColor}55)` }} />
      {/* card header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/40"
        style={{ background: `linear-gradient(135deg,${accentColor}07 0%,transparent 70%)` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: accentColor }}>{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value, link = false, mono = false, valueColor }: {
  label: string; value?: string | null; link?: boolean; mono?: boolean; valueColor?: string;
}) {
  const isEmpty = !value;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/25 last:border-0">
      <span className="text-[11px] text-muted-foreground font-medium shrink-0">{label}</span>
      {isEmpty
        ? <span className="text-[11px] text-muted-foreground/35">—</span>
        : link
          ? <span className="text-[11px] text-[#4F46E5] font-semibold cursor-pointer hover:underline text-right">{value}</span>
          : <span className={`text-[11px] font-semibold text-right ${mono ? "font-mono" : ""}`}
            style={valueColor ? { color: valueColor } : undefined}>{value}</span>
      }
    </div>
  );
}

const StatsBar = ({ items, loading }: { items: { label: string, value: any, icon: any, color: string, bg: string }[], loading?: boolean }) => (
  <div className="flex items-stretch border-b border-border bg-card u-stagger">
    {items.map(({ label, value, icon, color, bg }) => (
      <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border/50 last:border-r-0 relative overflow-hidden">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin opacity-40" /> : icon}
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{loading ? "—" : value}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    ))}
  </div>
);

const EditInput = ({ label, value, onChange, placeholder, type = "text", disabled = false, required = false }: any) => (
  <div className="mb-4">
    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] mb-1.5 ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

const UserSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleDoc | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (User)
  const [userFormData, setUserFormData] = useState<User>({
    name: '', email: '', first_name: '', last_name: '', full_name: '',
    phone: '', mobile_no: '', enabled: 1, user_type: 'System User',
    roles: [], new_password: '', confirm_password: ''
  });

  // Form State (Role)
  const [roleFormData, setRoleFormData] = useState<RoleDoc>({
    name: '', role_name: '', desk_access: 1, is_custom: 0, disabled: 0, two_factor_auth: 0
  });

  // Inject styles
  useEffect(() => {
    const id = 'user-setup-styles-v2';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = USER_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // API Methods
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await frappeFetch('/api/method/frappe.client.get_list', {
        method: 'POST',
        body: JSON.stringify({
          doctype: 'User',
          fields: ['name', 'email', 'first_name', 'last_name', 'full_name', 'phone', 'mobile_no', 'enabled', 'user_type'],
          limit_page_length: 200,
          order_by: 'full_name asc'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.message || []);
      }
    } catch (error) { showToast.error('Error fetching users'); }
    finally { setLoading(false); }
  }, []);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await frappeFetch('/api/method/frappe.client.get_list', {
        method: 'POST',
        body: JSON.stringify({
          doctype: 'Role',
          fields: ['name', 'role_name', 'desk_access', 'is_custom', 'disabled', 'two_factor_auth'],
          limit_page_length: 200,
          order_by: 'role_name asc'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.message || []);
      }
    } catch (error) { showToast.error('Error fetching roles'); }
    finally { setLoading(false); }
  }, []);

  const fetchUserDetails = async (userName: string) => {
    setLoading(true);
    try {
      const response = await frappeFetch('/api/method/frappe.client.get', {
        method: 'POST',
        body: JSON.stringify({ doctype: 'User', name: userName })
      });
      if (response.ok) {
        const data = await response.json();
        const userData = data.message;

        // Fetch roles via custom method
        const roleResponse = await frappeFetch('/api/method/quantbit_facility_management.api.facility_user_management.fm_get_user_roles', {
          method: 'POST',
          body: JSON.stringify({ user_id: userName })
        });
        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          userData.roles = (roleData.message || []).map((r: string) => ({ role: r }));
        }
        setUserFormData(userData);
        setSelectedUser(userData);
      }
    } catch (error) { showToast.error('Error fetching details'); }
    finally { setLoading(false); }
  };

  const fetchRoleDetails = async (roleName: string) => {
    setLoading(true);
    try {
      const res = await frappeFetch('/api/method/frappe.client.get', {
        method: 'POST',
        body: JSON.stringify({ doctype: 'Role', name: roleName })
      });
      if (res.ok) {
        const data = await res.json();
        setRoleFormData(data.message);
        setSelectedRole(data.message);
      }
    } catch (error) { showToast.error('Error fetching role'); }
    finally { setLoading(false); }
  };

  // Save Logic
  const saveUser = async () => {
    if (!userFormData.email || !userFormData.first_name) {
      showToast.error('Email and First Name are required');
      return;
    }
    setSaving(true);
    try {
      const isUpdate = !!userFormData.name;
      if (isUpdate) {
        const fields = ['email', 'first_name', 'last_name', 'full_name', 'phone', 'mobile_no', 'enabled', 'user_type'];
        for (const f of fields) {
          await frappeFetch('/api/method/frappe.client.set_value', {
            method: 'POST',
            body: JSON.stringify({ doctype: 'User', name: userFormData.name, fieldname: f, value: (userFormData as any)[f] })
          });
        }
        await frappeFetch('/api/method/quantbit_facility_management.api.facility_user_management.fm_assign_user_roles', {
          method: 'POST',
          body: JSON.stringify({ user_id: userFormData.name, roles: userFormData.roles?.map(r => r.role) || [] })
        });
        if (userFormData.new_password && userFormData.new_password === userFormData.confirm_password) {
          await frappeFetch('/api/method/quantbit_facility_management.api.facility_user_management.fm_update_user_password', {
            method: 'POST',
            body: JSON.stringify({ user_id: userFormData.name, new_password: userFormData.new_password })
          });
        }
        showToast.success('User updated successfully');
      } else {
        const res = await frappeFetch('/api/method/quantbit_facility_management.api.facility_user_management.fm_create_user_with_roles', {
          method: 'POST',
          body: JSON.stringify({
            user_data: { ...userFormData, full_name: userFormData.full_name || `${userFormData.first_name} ${userFormData.last_name}`, send_welcome_email: 1 },
            roles: userFormData.roles?.map(r => r.role) || []
          })
        });
        const result = await res.json();
        if (result.success) showToast.success('User created successfully');
        else { showToast.error(result.message || 'Failed to create user'); return; }
      }
      fetchUsers();
      resetUserForm();
    } catch (error) { showToast.error('Error saving user'); }
    finally { setSaving(false); }
  };

  const saveRole = async () => {
    if (!roleFormData.role_name) { showToast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const isUpdate = !!roleFormData.name;
      // If it's a new role, use fm_create_role
      const endpoint = isUpdate ? '/api/method/frappe.client.save' : '/api/method/quantbit_facility_management.api.facility_user_management.fm_create_role';
      const payload = isUpdate ? { doc: { ...roleFormData, doctype: 'Role' } } : { role_data: roleFormData };

      const res = await frappeFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast.success(isUpdate ? 'Role updated' : 'Role created');
        fetchRoles();
        resetRoleForm();
      }
    } catch (error) { showToast.error('Error saving role'); }
    finally { setSaving(false); }
  };

  const deleteDoc = async (doctype: string, name: string) => {
    if (!confirm(`Are you sure you want to delete this ${doctype}?`)) return;
    try {
      const res = await frappeFetch('/api/method/frappe.client.delete', {
        method: 'POST',
        body: JSON.stringify({ doctype, name })
      });
      if (res.ok) {
        showToast.success(`${doctype} deleted`);
        doctype === 'User' ? fetchUsers() : fetchRoles();
        doctype === 'User' ? resetUserForm() : resetRoleForm();
      }
    } catch (error) { showToast.error('Delete failed'); }
  };

  const resetUserForm = () => {
    setSelectedUser(null);
    setUserFormData({
      name: '', email: '', first_name: '', last_name: '', full_name: '',
      phone: '', mobile_no: '', enabled: 1, user_type: 'System User',
      roles: [], new_password: '', confirm_password: ''
    });
  };

  const resetRoleForm = () => {
    setSelectedRole(null);
    setRoleFormData({ name: '', role_name: '', desk_access: 1, is_custom: 1, disabled: 0, two_factor_auth: 0 });
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filteredUsers = useMemo(() => users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [users, searchQuery]);

  const filteredRoles = useMemo(() => roles.filter(r =>
    r.role_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [roles, searchQuery]);

  const userStats = [
    { label: "Active", value: users.filter(u => u.enabled).length, icon: <CheckCheck className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
    { label: "Total", value: users.length, icon: <Users className="w-4 h-4" />, color: "#4F46E5", bg: "#4F46E515" },
    { label: "System", value: users.filter(u => u.user_type === 'System User').length, icon: <Shield className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
  ];

  const roleStats = [
    { label: "Custom", value: roles.filter(r => r.is_custom).length, icon: <LayoutGrid className="w-4 h-4" />, color: "#4F46E5", bg: "#4F46E515" },
    { label: "Total", value: roles.length, icon: <Shield className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
    { label: "Active", value: roles.filter(r => !r.disabled).length, icon: <Activity className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
  ];

  return (
    <div className={s("flex flex-col h-screen bg-muted/20 overflow-hidden")}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center shadow-lg shadow-[#4F46E5]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">Access Control</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Identity Management</p>
            </div>
          </div>

          <div className="flex items-center bg-muted/40 p-1.5 rounded-2xl border border-border/60 ml-8">
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              className={cn("px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'users' ? "bg-white text-[#4F46E5] shadow-sm" : "hover:bg-muted/60 text-muted-foreground")}
            >
              Users
            </button>
            <button
              onClick={() => { setActiveTab('roles'); setSearchQuery(''); }}
              className={cn("px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'roles' ? "bg-white text-[#4F46E5] shadow-sm" : "hover:bg-muted/60 text-muted-foreground")}
            >
              Roles
            </button>
          </div>

          <div className="flex-1 max-w-sm ml-6">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#4F46E5]" />
              <input
                type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={activeTab === 'users' ? fetchUsers : fetchRoles} className="rounded-xl h-10 border-border group">
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180", loading && "animate-spin")} />
            </Button>
            <Button
              onClick={() => {
                if (activeTab === 'users') { resetUserForm(); setSelectedUser({} as any); }
                else { resetRoleForm(); setSelectedRole({} as any); }
              }}
              className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-xl h-10 px-6 font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> {activeTab === 'users' ? 'New User' : 'New Role'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex max-w-[1600px] mx-auto w-full px-6 py-6 gap-6">
        {/* Left Pane: Master List */}
        <div className="w-[400px] flex flex-col shrink-0">
          <StatsBar items={activeTab === 'users' ? userStats : roleStats} loading={loading} />

          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3 u-stagger">
            {activeTab === 'users' ? (
              filteredUsers.map(user => (
                <button
                  key={user.name}
                  onClick={() => fetchUserDetails(user.name!)}
                  className={cn(
                    "w-full text-left p-4 rounded-3xl border user-rich-card user-card-row transition-all",
                    selectedUser?.name === user.name ? "selected" : "bg-card border-border/60 hover:border-[#4F46E5]/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 text-base font-bold",
                      user.enabled ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-muted text-muted-foreground"
                    )}>
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-extrabold text-foreground truncate">{user.full_name}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          user.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          {user.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate opacity-70">@{user.email}</p>
                    </div>
                    <ChevronRight className="user-arrow w-4 h-4 text-[#4F46E5]" />
                  </div>
                </button>
              ))
            ) : (
              filteredRoles.map(role => (
                <button
                  key={role.name}
                  onClick={() => fetchRoleDetails(role.name)}
                  className={cn(
                    "w-full text-left p-4 rounded-3xl border user-rich-card user-card-row transition-all",
                    selectedRole?.name === role.name ? "selected" : "bg-card border-border/60 hover:border-[#4F46E5]/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30",
                      role.disabled ? "bg-muted text-muted-foreground" : "bg-indigo-50 text-[#4F46E5]"
                    )}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-extrabold text-foreground truncate">{role.role_name}</p>
                        {role.is_custom ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-100">Custom</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {role.desk_access ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-red-500" />} Desk Access
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="user-arrow w-4 h-4 text-[#4F46E5]" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Detail View */}
        <div className="flex-1 bg-card rounded-[40px] border border-border/80 shadow-2xl shadow-muted flex flex-col u-fade-up">
          {(!selectedUser && !selectedRole) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-white to-[#4F46E5]/5 flex items-center justify-center mb-8 shadow-xl shadow-muted/50 border border-border/60">
                {activeTab === 'users' ? <Users className="w-10 h-10 text-[#4F46E5] opacity-30" /> : <Shield className="w-10 h-10 text-[#4F46E5] opacity-30" />}
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Select an Entry</h2>
              <p className="text-sm text-muted-foreground max-w-[340px] mt-4 leading-relaxed font-medium">
                Choose a {activeTab.slice(0, -1)} from the list on the left to manage permissions or update settings.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="shrink-0 px-10 py-8 border-b border-border/40 bg-muted/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-[#4F46E5]/20">
                    {activeTab === 'users'
                      ? (userFormData.first_name?.[0] || 'U')
                      : <Shield className="w-8 h-8" />
                    }
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      {activeTab === 'users' ? (userFormData.full_name || 'New User') : (roleFormData.role_name || 'New Role')}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5 opacity-60">
                      {activeTab === 'users' && userFormData.email && (
                        <span className="flex items-center gap-1.5 text-xs font-bold border-r border-border pr-3"><Mail className="w-3.5 h-3.5" /> {userFormData.email}</span>
                      )}
                      <span className="text-xs font-bold uppercase tracking-widest">{activeTab === 'users' ? userFormData.user_type : (roleFormData.is_custom ? 'Custom Role' : 'Standard Role')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(selectedRole?.name || selectedUser?.name) && (
                    <Button
                      variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-2xl px-4 font-bold"
                      onClick={() => deleteDoc(activeTab === 'users' ? 'User' : 'Role', activeTab === 'users' ? selectedUser!.name! : selectedRole!.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-2xl px-6 border-border font-bold" onClick={activeTab === 'users' ? resetUserForm : resetRoleForm}>Cancel</Button>
                  <Button className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-2xl px-8 font-extrabold shadow-lg shadow-[#4F46E5]/10" onClick={activeTab === 'users' ? saveUser : saveRole} disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
                <div className="max-w-3xl mx-auto">
                  {activeTab === 'users' ? (
                    <div className="space-y-2">
                      <SectionCard accentColor="#4F46E5" icon={<UserPlus className="w-4 h-4" />} title="Profile Information" subtitle="Basic personal details">
                        <div className="grid grid-cols-2 gap-x-12 mb-4">
                          <div>
                            <DataRow label="Associated ID" value={userFormData.name} mono />
                            <DataRow label="Account Status" value={userFormData.enabled ? 'Active' : 'Disabled'} valueColor={userFormData.enabled ? '#10b981' : '#ef4444'} />
                          </div>
                          <div>
                            <DataRow label="Client Type" value={userFormData.user_type} />
                            <DataRow label="Created On" value="Recently updated" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <EditInput label="First Name" value={userFormData.first_name} onChange={(v: any) => setUserFormData({ ...userFormData, first_name: v })} required />
                          <EditInput label="Last Name" value={userFormData.last_name} onChange={(v: any) => setUserFormData({ ...userFormData, last_name: v })} />
                        </div>
                        <EditInput label="Email Address" value={userFormData.email} onChange={(v: any) => setUserFormData({ ...userFormData, email: v })} required disabled={!!selectedUser?.name} />
                        <div className="grid grid-cols-2 gap-4">
                          <EditInput label="Mobile No" value={userFormData.mobile_no} onChange={(v: any) => setUserFormData({ ...userFormData, mobile_no: v })} />
                          <div className="mb-4">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] mb-2 ml-1">Account Active</label>
                            <div
                              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", userFormData.enabled ? "bg-[#4F46E5]" : "bg-muted")}
                              onClick={() => setUserFormData({ ...userFormData, enabled: userFormData.enabled ? 0 : 1 })}
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", userFormData.enabled ? "translate-x-6" : "translate-x-0")} />
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard accentColor="#6366f1" icon={<Shield className="w-4 h-4" />} title="Access Control" subtitle="Role-based permissions">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#4F46E5] mb-3 ml-1 opacity-60">Assigned Member roles</label>
                        <div className="flex flex-wrap gap-2 p-5 bg-muted/20 rounded-3xl border border-dashed border-border/60 mb-6">
                          {userFormData.roles?.map((r, i) => (
                            <span key={i} className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-border/80 rounded-2xl text-[11px] font-bold shadow-sm group">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                              {r.role}
                              <button className="ml-1 opacity-30 hover:opacity-100 hover:text-red-500 transition-all" onClick={() => setUserFormData({ ...userFormData, roles: userFormData.roles?.filter(role => role.role !== r.role) })}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                          {(!userFormData.roles || userFormData.roles.length === 0) && <p className="text-[11px] text-muted-foreground italic font-medium">No roles assigned to this user yet.</p>}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Quick Role Assignment</span>
                            <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-widest">{roles.length} Available Roles</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {roles.slice(0, 12).map(role => (
                              <button
                                key={role.name}
                                onClick={() => {
                                  const exists = userFormData.roles?.some(r => r.role === role.role_name);
                                  if (exists) {
                                    setUserFormData({ ...userFormData, roles: userFormData.roles?.filter(r => r.role !== role.role_name) });
                                  } else {
                                    setUserFormData({ ...userFormData, roles: [...(userFormData.roles || []), { role: role.role_name }] });
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 p-3 rounded-2xl border text-[11px] font-bold transition-all",
                                  userFormData.roles?.some(r => r.role === role.role_name)
                                    ? "bg-[#4F46E5]/10 border-[#4F46E5] text-[#4F46E5] shadow-sm"
                                    : "bg-white border-border/60 text-muted-foreground hover:border-[#4F46E5]/40"
                                )}
                              >
                                {userFormData.roles?.some(r => r.role === role.role_name) ? <CheckCheck className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-30" />}
                                <span className="truncate">{role.role_name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard accentColor="#f59e0b" icon={<Lock className="w-4 h-4" />} title="Security & Authentication" subtitle="Credentials & type">
                        <div className="grid grid-cols-2 gap-x-12 mb-6">
                          <div>
                            <DataRow label="Auth Method" value="Standard Password" />
                            <DataRow label="Password Updated" value="Last updated recently" />
                          </div>
                          <div>
                            <DataRow label="Desk Access" value={userFormData.user_type === 'System User' ? 'Full Desk' : 'No Access'} valueColor={userFormData.user_type === 'System User' ? '#10b981' : '#f59e0b'} />
                            <DataRow label="Two Factor" value="Disabled" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <EditInput label="Update Password" type="password" value={userFormData.new_password} onChange={(v: any) => setUserFormData({ ...userFormData, new_password: v })} placeholder="Enter new password" />
                          <EditInput label="Confirm Secret" type="password" value={userFormData.confirm_password} onChange={(v: any) => setUserFormData({ ...userFormData, confirm_password: v })} placeholder="Verify new password" />
                        </div>
                      </SectionCard>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SectionCard accentColor="#4F46E5" icon={<Shield className="w-4 h-4" />} title="Role Configuration" subtitle="Primary role settings">
                        <div className="grid grid-cols-2 gap-x-12 mb-6">
                          <div>
                            <DataRow label="Internal ID" value={roleFormData.name} mono />
                            <DataRow label="Role Status" value={roleFormData.disabled ? 'Disabled' : 'Active'} valueColor={roleFormData.disabled ? '#ef4444' : '#10b981'} />
                          </div>
                          <div>
                            <DataRow label="Source" value={roleFormData.is_custom ? 'Custom' : 'Standard'} />
                            <DataRow label="Desk Interface" value={roleFormData.desk_access ? 'Allowed' : 'Blocked'} valueColor={roleFormData.desk_access ? '#10b981' : '#ef4444'} />
                          </div>
                        </div>
                        <EditInput label="Display Name" value={roleFormData.role_name} onChange={(v: any) => setRoleFormData({ ...roleFormData, role_name: v })} required />

                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl">
                            <div>
                              <p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Desk Access</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Allow access to desk view</p>
                            </div>
                            <div
                              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", roleFormData.desk_access ? "bg-[#4F46E5]" : "bg-muted")}
                              onClick={() => setRoleFormData({ ...roleFormData, desk_access: roleFormData.desk_access ? 0 : 1 })}
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", roleFormData.desk_access ? "translate-x-6" : "translate-x-0")} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl">
                            <div>
                              <p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Two Factor</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Require 2FA for this role</p>
                            </div>
                            <div
                              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", roleFormData.two_factor_auth ? "bg-[#4F46E5]" : "bg-muted")}
                              onClick={() => setRoleFormData({ ...roleFormData, two_factor_auth: roleFormData.two_factor_auth ? 0 : 1 })}
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", roleFormData.two_factor_auth ? "translate-x-6" : "translate-x-0")} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl">
                            <div>
                              <p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Disabled</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Deactivate this role</p>
                            </div>
                            <div
                              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", roleFormData.disabled ? "bg-red-500" : "bg-muted")}
                              onClick={() => setRoleFormData({ ...roleFormData, disabled: roleFormData.disabled ? 0 : 1 })}
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", roleFormData.disabled ? "translate-x-6" : "translate-x-0")} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl">
                            <div>
                              <p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Custom Role</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Manually created role</p>
                            </div>
                            <div
                              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors cursor-not-allowed opacity-50", roleFormData.is_custom ? "bg-[#4F46E5]" : "bg-muted")}
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", roleFormData.is_custom ? "translate-x-6" : "translate-x-0")} />
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <div className="p-8 bg-amber-50 rounded-[40px] border border-amber-100 flex flex-col items-center text-center u-fade-up">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                          <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-sm font-black text-amber-900 tracking-tight">Permissions Disclaimer</p>
                        <p className="text-xs text-amber-700/80 mt-2 max-w-sm leading-relaxed font-bold uppercase tracking-wide opacity-80">
                          Updating role properties here affects all users assigned to this role. Ensure you have the necessary administrative privileges.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserSetup;