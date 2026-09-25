import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useProxy } from '../../hooks/useProxy';
import { 
  Link, Copy, Check, Play, Square, 
  Globe, Shield, Loader2, Sparkles,
  Server, Cpu, GitBranch, Terminal,
  ArrowRight, Plus, Trash2, Edit,
  RefreshCw, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

export default function ProxyConfig() {
  const { 
    backendUrl, 
    setBackendUrl, 
    proxyUrl, 
    isProxyActive,
    setIsProxyActive,
    trafficLogs,
  } = useStore();
  
  const { generateProxy, stopProxy, copyProxyUrl, isGenerating } = useProxy();
  const [copied, setCopied] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [responseTime, setResponseTime] = useState('');

  const normalizeUrlInput = (input) => {
    if (!input) return '';
    let trimmed = input.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleTestConnection = async () => {
    if (!backendUrl) {
      setUrlError('Please enter a backend URL');
      return;
    }

    const normalized = normalizeUrlInput(backendUrl);
    try {
      new URL(normalized);
      setUrlError('');
      if (normalized !== backendUrl) {
        setBackendUrl(normalized);
      }
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://api.example.com)');
      return;
    }

    setConnectionStatus('checking');
    setConnectionMessage('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/proxy/check-network`, {
        backendUrl: normalized
      });
      if (response.data && response.data.online) {
        setConnectionStatus('online');
        setResponseTime(response.data.responseTime);
        setConnectionMessage(response.data.message);
        toast.success('Connection successful! Backend is online.');
      } else {
        setConnectionStatus('offline');
        setConnectionMessage(response.data.message || 'Host is unreachable.');
        toast.error('Connection failed: ' + (response.data.message || 'Unreachable'));
      }
    } catch (err) {
      setConnectionStatus('offline');
      const msg = err.response?.data?.message || err.message || 'Failed to check connection';
      setConnectionMessage(msg);
      toast.error('Network check error: ' + msg);
    }
  };

  const handleGenerate = async () => {
    if (!backendUrl) {
      setUrlError('Please enter a backend URL');
      return;
    }

    const normalized = normalizeUrlInput(backendUrl);
    try {
      new URL(normalized);
      setUrlError('');
      if (normalized !== backendUrl) {
        setBackendUrl(normalized);
      }
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://api.example.com)');
      return;
    }

    await generateProxy();
  };

  const handleCopy = async () => {
    const success = await copyProxyUrl();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStop = () => {
    stopProxy();
  };

  return (
    <div className="panel-3d p-4 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
          <Link className="w-4 h-4 text-primary-400" />
          Proxy Configuration
        </h3>
        <span className="text-[10px] text-slate-500">Step 1</span>
      </div>

      {/* Backend URL Input */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-[10px] sm:text-xs text-slate-400">Backend URL</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => {
                setBackendUrl(e.target.value);
                setUrlError('');
              }}
              placeholder="https://api.myapp.com"
              className="input-premium w-full pl-9 text-xs sm:text-sm py-2 sm:py-2.5"
              disabled={isProxyActive}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isProxyActive}
            className="btn-3d flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : isProxyActive ? (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {isGenerating ? 'Generating...' : isProxyActive ? 'Active' : 'Generate'}
          </button>
        </div>
        {urlError && (
          <p className="text-xs text-accent-400">{urlError}</p>
        )}
        
        {/* Connection health check controls */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs mt-1 pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!backendUrl || isProxyActive || connectionStatus === 'checking'}
            className="text-primary-400 hover:text-primary-300 disabled:text-slate-600 transition flex items-center gap-1 sm:gap-1.5 font-semibold bg-white/5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-white/5 hover:bg-white/10"
          >
            {connectionStatus === 'checking' ? (
              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-400" />
            )}
            {connectionStatus === 'checking' ? 'Testing Connection...' : 'Test Connection'}
          </button>
          
          {connectionStatus !== 'idle' && (
            <span className={`flex items-center gap-1 sm:gap-1.5 font-semibold px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] ${
              connectionStatus === 'online' 
                ? 'text-success-400 bg-success-500/10 border border-success-500/20' 
                : 'text-accent-400 bg-accent-500/10 border border-accent-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'online' ? 'bg-success-400' : 'bg-accent-400 animate-pulse'
              }`} />
              {connectionStatus === 'online' ? `Online (${responseTime})` : 'Offline/Unreachable'}
            </span>
          )}
        </div>
        
        {connectionMessage && (
          <p className={`text-[9px] sm:text-[10px] pl-1 ${
            connectionStatus === 'online' ? 'text-slate-400' : 'text-accent-400/80 font-medium'
          }`}>
            {connectionMessage}
          </p>
        )}
      </div>

      {/* Proxy URL Output */}
      {proxyUrl && (
        <div className="space-y-1.5 sm:space-y-2 animate-slide-up">
          <label className="text-[10px] sm:text-xs text-slate-400">Generated Proxy URL</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success-400" />
              <input
                type="text"
                value={proxyUrl}
                readOnly
                className="input-premium w-full pl-9 text-success-400 font-mono text-xs sm:text-sm py-2 sm:py-2.5"
              />
            </div>
            <button
              onClick={handleCopy}
              className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10 hover:scale-110 duration-300"
              title="Copy Proxy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success-400" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
            </button>
            <button
              onClick={() => {
                const id = proxyUrl.split('/').pop();
                if (id) {
                  window.open(`${window.location.origin}/proxy-interface/${id}`, '_blank');
                }
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 transition border border-primary-500/20 hover:scale-110 duration-300"
              title="Open Proxy Interface"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
            </button>
            {isProxyActive && (
              <button
                onClick={handleStop}
                className="p-2 sm:p-2.5 rounded-xl bg-accent-500/20 hover:bg-accent-500/30 transition border border-accent-500/20 hover:scale-110 duration-300"
                title="Stop Proxy"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-slate-500">
            <Shield className="w-3 h-3 text-success-400" />
            <span>Replace your API URL with this proxy URL in your frontend</span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {isProxyActive && (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-white/5 rounded-xl border border-white/5 animate-slide-up">
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-slate-400">Requests</div>
            <div className="text-base sm:text-lg font-bold text-white">{trafficLogs.length}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-slate-400">Status</div>
            <div className="text-xs sm:text-sm font-semibold text-success-400">● Active</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-slate-400">Proxy ID</div>
            <div className="text-[10px] sm:text-xs font-mono text-primary-400 truncate">
              {proxyUrl?.split('/').pop() || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs text-slate-400 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <Cpu className="w-3 h-3" />
          Advanced Options
        </span>
        <span>{showAdvanced ? '▼' : '►'}</span>
      </button>

      {showAdvanced && (
        <div className="space-y-2 animate-slide-up">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <GitBranch className="w-3 h-3" />
            <span>Environment Variables</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="API_KEY=your_key"
              className="input-premium flex-1 text-xs"
            />
            <button className="btn-3d text-xs px-3 py-1.5">Add</button>
          </div>
          <div className="text-[10px] text-slate-500">
            Add custom headers or environment variables to your proxy
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="text-primary-400">💡</span>
          <span>Tip: Save this configuration as a scenario for later use</span>
        </div>
      </div>
    </div>
  );
}
