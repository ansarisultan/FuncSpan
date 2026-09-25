import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Network, Settings, FileText, Activity, 
  Zap, Sparkles, Shield, Globe,
  Plus, FolderOpen, Clock, BarChart3,
  ChevronDown, ChevronRight, Cpu,
  Loader2, Terminal, GitBranch, Database, X,
  Download, Upload
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

const navItems = [
  { to: '/app', label: 'Overview', icon: BarChart3 },
  { to: '/app/config', label: 'Configuration', icon: Settings },
  { to: '/app/proxy', label: 'Proxy Gateway', icon: Shield },
  { to: '/app/logs', label: 'Traffic Logs', icon: Activity },
  { to: '/app/stress', label: 'Stress Test', icon: Loader2 },
  { to: '/app/scenarios', label: 'Scenarios', icon: FolderOpen },
  { to: '/app/generator', label: 'Data Generator', icon: Database },
];

export default function Sidebar({ onClose }) {
  const { scenarios, isProxyActive, trafficLogs, setActiveTab, loadScenario } = useStore();
  const [showProjects, setShowProjects] = useState(true);
  const navigate = useNavigate();

  const handleExportBackup = () => {
    try {
      const state = useStore.getState();
      const backupData = {
        backendUrl: state.backendUrl,
        proxyUrl: state.proxyUrl,
        proxyId: state.proxyId,
        isProxyActive: state.isProxyActive,
        latency: state.latency,
        errorCode: state.errorCode,
        failureRate: state.failureRate,
        rateLimit: state.rateLimit,
        networkProfile: state.networkProfile,
        payloadMultiplier: state.payloadMultiplier,
        schemaMutations: state.schemaMutations,
        scenarios: state.scenarios,
        trafficLogs: state.trafficLogs,
        trafficStats: state.trafficStats,
        webhookUrl: state.webhookUrl,
        isWebhookEnabled: state.isWebhookEnabled,
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `funcspan-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('Backup file exported successfully!');
    } catch (err) {
      toast.error('Failed to export backup: ' + err.message);
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (typeof data !== 'object') {
          throw new Error('Invalid JSON format.');
        }

        useStore.setState({
          backendUrl: data.backendUrl || '',
          proxyUrl: data.proxyUrl || '',
          proxyId: data.proxyId || null,
          isProxyActive: data.isProxyActive || false,
          latency: data.latency || 0,
          errorCode: data.errorCode || 'none',
          failureRate: data.failureRate || 0,
          rateLimit: data.rateLimit || 'none',
          networkProfile: data.networkProfile || 'custom',
          payloadMultiplier: data.payloadMultiplier || 1,
          schemaMutations: data.schemaMutations || {
            removeFields: [],
            renameFields: {},
            returnNull: [],
            emptyArrays: [],
            changeTypes: {},
          },
          scenarios: data.scenarios || [],
          trafficLogs: data.trafficLogs || [],
          trafficStats: data.trafficStats || { total: 0, success: 0, errors: 0, avgResponseTime: 0, requestsPerSecond: 0 },
          webhookUrl: data.webhookUrl || '',
          isWebhookEnabled: data.isWebhookEnabled || false,
        });

        if (data.isProxyActive && data.proxyId && data.backendUrl) {
          try {
            await axios.post(`${API_BASE_URL}/api/proxy/create`, {
              backendUrl: data.backendUrl,
              networkConfig: {
                latency: data.latency || 0,
                errorCode: data.errorCode || 'none',
                failureRate: data.failureRate || 0,
                rateLimit: data.rateLimit || 'none',
                networkProfile: data.networkProfile || 'custom',
                payloadMultiplier: data.payloadMultiplier || 1,
              },
              schemaMutations: data.schemaMutations || {}
            });
          } catch (backendErr) {
            console.error('Failed to sync proxy on backend during import:', backendErr);
          }
        }

        toast.success('Backup file imported successfully!');
      } catch (err) {
        toast.error('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="h-full flex flex-col py-4 px-3 bg-[#0A1020]/95 backdrop-blur-2xl border-r border-[#1E293B]/60 shadow-2xl">
      {/* Brand - FuncLexa Style */}
      <div className="flex items-center justify-between mb-8 px-3 relative">
        <div className="flex items-center gap-3 preserve-3d">
          <img src="/logo.png" alt="FuncLexa Logo" className="w-12 h-12 object-contain flex-shrink-0" />
          <div>
            <span className="text-3xl font-bold text-gradient-animated-funclexa block leading-none">FuncLexa</span>
            <span className="text-[10px] font-normal text-slate-400 tracking-wider uppercase mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-ping" />
              FuncSpan • Network
            </span>
          </div>
        </div>
        {/* Absolute Mobile Close Button */}
        <button 
          onClick={onClose} 
          className="lg:hidden absolute top-1 right-2 text-slate-400 hover:text-white transition p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="px-3 mb-4 flex items-center gap-2 text-[10px]">
        <div className={`w-1.5 h-1.5 rounded-full ${isProxyActive ? 'bg-success-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-slate-400">{isProxyActive ? 'Proxy Active' : 'Proxy Inactive'}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">{trafficLogs.length} requests</span>
      </div>

      {/* Main nav */}
      <nav className="space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="my-4 border-t border-white/5" />

      {/* Scenarios section */}
      <div className="space-y-1">
        <button
          onClick={() => setShowProjects(!showProjects)}
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider hover:text-white transition w-full"
        >
          {showProjects ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Saved Scenarios
          <span className="ml-auto text-[10px] text-slate-500">{scenarios.length}</span>
        </button>
        
        {showProjects && (
          <div className="space-y-1 pl-2">
            {scenarios.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                No scenarios saved
              </div>
            ) : (
              scenarios.slice(0, 5).map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    navigate('/app');
                    setActiveTab('scenarios');
                    loadScenario(scenario.id);
                    if (onClose) onClose();
                  }}
                  className="sidebar-item w-full text-left text-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="truncate">{scenario.name}</span>
                  {scenario.isActive && (
                    <span className="text-[8px] text-success-400 bg-success-500/20 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </button>
              ))
            )}
            {scenarios.length > 5 && (
              <button className="text-[10px] text-primary-400 hover:text-primary-300 px-3 py-1">
                View all ({scenarios.length})
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Quick Actions */}
      <div className="px-3 space-y-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium flex items-center gap-2">
          <Zap className="w-3 h-3" />
          Quick Actions
        </span>
        <button 
          onClick={() => {
            navigate('/app');
            setActiveTab('config');
            if (onClose) onClose();
          }}
          className="sidebar-item w-full text-left text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Proxy
        </button>
        <button 
          onClick={() => {
            navigate('/app/scenarios');
            setActiveTab('scenarios');
            if (onClose) onClose();
          }}
          className="sidebar-item w-full text-left text-xs"
        >
          <GitBranch className="w-3.5 h-3.5" />
          Clone Scenario
        </button>
        <button 
          onClick={() => {
            navigate('/app/logs');
            setActiveTab('traffic');
            if (onClose) onClose();
          }}
          className="sidebar-item w-full text-left text-xs"
        >
          <Terminal className="w-3.5 h-3.5" />
          View Logs
        </button>
      </div>

      {/* Backup Controls */}
      <div className="px-3 pt-3 mt-3 border-t border-[#1E293B]/60 space-y-2">
        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Backup Management</div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={handleExportBackup} 
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white bg-[#0A1020] hover:bg-white/5 transition border border-[#1E293B]/60 w-full"
          >
            <Download className="w-3 h-3 text-primary-400" />
            <span>Export</span>
          </button>
          <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white bg-[#0A1020] hover:bg-white/5 transition border border-[#1E293B]/60 w-full cursor-pointer text-center">
            <Upload className="w-3 h-3 text-[#06B6D4]" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pt-2 mt-2 border-t border-[#1E293B]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
            <span>System Ready</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Shield className="w-3 h-3" />
            <span>v2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
