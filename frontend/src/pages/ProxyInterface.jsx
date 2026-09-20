import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  Shield, Globe, Loader2, AlertCircle, 
  Terminal, RefreshCw, Send, ArrowLeft, Activity, 
  Clock, Database, Lock, Copy, Check, Code, 
  Layers, Zap, ExternalLink, SlidersHorizontal, Trash2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ProxyInterface() {
  const { proxyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proxyConfig, setProxyConfig] = useState(null);
  const [trafficLogs, setTrafficLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Test Request state
  const [testMethod, setTestMethod] = useState('GET');
  const [testPath, setTestPath] = useState('');
  const [testPayload, setTestPayload] = useState('{\n  "test": true\n}');
  const [customHeaders, setCustomHeaders] = useState([
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [showHeadersEditor, setShowHeadersEditor] = useState(false);
  const [activeResponseTab, setActiveResponseTab] = useState('body'); // 'body' | 'headers' | 'curl'

  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchProxyData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/proxy/${proxyId}`);
      if (response.data && response.data.success) {
        setProxyConfig(response.data.proxy);
        
        const trafficResponse = await axios.get(`${API_BASE_URL}/api/proxy/${proxyId}/traffic?limit=20`);
        if (trafficResponse.data && trafficResponse.data.success) {
          setTrafficLogs(trafficResponse.data.traffic || []);
        }
      } else {
        throw new Error('Proxy configuration not found on the server.');
      }
    } catch (err) {
      if (!isBackground) {
        setError(
          err.response?.data?.message || 
          err.message || 
          'Could not establish a connection to the proxy server.'
        );
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (proxyId) {
      fetchProxyData();
    }
  }, [proxyId]);

  // Auto-refresh interval
  useEffect(() => {
    let timer;
    if (autoRefresh && proxyId) {
      timer = setInterval(() => {
        fetchProxyData(true);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh, proxyId]);

  const constructFullUrl = () => {
    const formattedPath = testPath.startsWith('/') ? testPath : `/${testPath}`;
    return `${API_BASE_URL}/p/${proxyId}${formattedPath}`;
  };

  const generateCurlCommand = () => {
    const url = constructFullUrl();
    let curl = `curl -X ${testMethod} "${url}"`;
    customHeaders.forEach(h => {
      if (h.key && h.value) {
        curl += ` \\\n  -H "${h.key}: ${h.value}"`;
      }
    });
    if (['POST', 'PUT', 'PATCH'].includes(testMethod) && testPayload.trim()) {
      curl += ` \\\n  -d '${testPayload.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurlCommand()).then(() => {
      setCopiedCurl(true);
      toast.success('cURL command copied to clipboard!');
      setTimeout(() => setCopiedCurl(false), 2000);
    });
  };

  const copyProxyUrl = (urlToCopy) => {
    navigator.clipboard.writeText(urlToCopy).then(() => {
      setCopiedUrl(true);
      toast.success('Gateway URL copied!');
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  const handleTestRequest = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const proxyTestUrl = constructFullUrl();

      let parsedPayload = null;
      if (['POST', 'PUT', 'PATCH'].includes(testMethod)) {
        try {
          parsedPayload = JSON.parse(testPayload);
        } catch (e) {
          toast.error('Invalid JSON payload syntax');
          setTesting(false);
          return;
        }
      }

      // Convert header array to object
      const reqHeaders = {};
      customHeaders.forEach(h => {
        if (h.key.trim()) reqHeaders[h.key.trim()] = h.value;
      });

      const startTime = performance.now();
      const response = await axios({
        method: testMethod,
        url: proxyTestUrl,
        headers: reqHeaders,
        data: parsedPayload,
        timeout: 12000,
        validateStatus: () => true, // capture all status codes
      });
      const duration = Math.round(performance.now() - startTime);

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        durationNum: duration,
        headers: response.headers,
        data: response.data,
        timestamp: new Date().toLocaleTimeString()
      });
      
      if (response.status >= 200 && response.status < 400) {
        toast.success(`Success: HTTP ${response.status} (${duration}ms)`);
      } else {
        toast.error(`Response: HTTP ${response.status} (${duration}ms)`);
      }

      // Refresh traffic logs in background
      const trafficResponse = await axios.get(`${API_BASE_URL}/api/proxy/${proxyId}/traffic?limit=20`);
      if (trafficResponse.data && trafficResponse.data.success) {
        setTrafficLogs(trafficResponse.data.traffic || []);
      }
    } catch (err) {
      setTestResponse({
        error: true,
        message: err.message,
        details: err.response?.data || 'Unreachable network endpoint'
      });
      toast.error(`Proxy Request Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const addHeader = () => {
    setCustomHeaders(prev => [...prev, { key: '', value: '' }]);
  };

  const removeHeader = (index) => {
    setCustomHeaders(prev => prev.filter((_, i) => i !== index));
  };

  const updateHeader = (index, field, val) => {
    setCustomHeaders(prev => {
      const copy = [...prev];
      copy[index][field] = val;
      return copy;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#06B6D4]/10 rounded-full blur-[100px] pointer-events-none z-0" />
        
        <div className="z-10 text-center space-y-6 animate-pulse">
          <Loader2 className="w-12 h-12 text-[#06B6D4] animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gradient-animated-funclexa font-sans">Connecting to Proxy Gateway...</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Synchronizing routing state and validating proxy session #{proxyId}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
        
        <div className="z-10 max-w-md w-full panel-3d p-6 bg-[#0A1020]/90 backdrop-blur-2xl border-red-500/30 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-8 h-8 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-red-400 font-sans">Proxy Connection Failed</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {error}
            </p>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left text-[11px] text-slate-400 space-y-2 leading-relaxed">
            <p className="font-semibold text-white flex items-center gap-1.5 font-sans">
              <Lock className="w-3.5 h-3.5 text-primary-400" />
              Troubleshooting checklist:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Confirm the backend API server is running on port 5000.</li>
              <li>Verify the proxy session ID (<span className="text-primary-400 font-mono">{proxyId}</span>) is registered.</li>
              <li>Verify that the destination URL accepts inbound HTTP requests.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/app')}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition font-sans"
            >
              Back to Playground
            </button>
            <button
              onClick={() => fetchProxyData()}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-semibold transition flex items-center justify-center gap-1.5 font-sans"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      <Toaster position="top-right" />
      <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#06B6D4]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto space-y-6 z-10 relative">
        {/* Top Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0A1020]/90 backdrop-blur-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.15)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white">Proxy Gateway Console</h1>
                <span className="text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Session: {proxyId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => navigate('/app')}
              className="py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Playground
            </button>
            <button
              onClick={() => fetchProxyData()}
              className="py-2 px-3 text-xs font-semibold bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl border border-primary-500/20 transition flex items-center gap-1.5"
              title="Sync proxy state"
            >
              <RefreshCw className="w-4 h-4" />
              Sync
            </button>
            <button
              onClick={copyCurl}
              className="py-2 px-3 text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 transition flex items-center gap-1.5 font-mono"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
              cURL
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Info & Test Client */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Routing Information Card */}
            <div className="panel-3d p-6 bg-[#0A1020]/90 backdrop-blur-2xl border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Proxy Gateway Routing
                </h2>
                <button
                  onClick={() => copyProxyUrl(proxyConfig?.proxyUrl || `${API_BASE_URL}/p/${proxyId}`)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition font-mono"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy Gateway URL
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px]">PUBLIC PROXY GATEWAY</span>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-cyan-300 select-all truncate font-semibold">
                    {proxyConfig?.proxyUrl || `${API_BASE_URL}/p/${proxyId}`}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px]">TARGET DESTINATION ENDPOINT</span>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-primary-400 select-all truncate font-semibold">
                    {proxyConfig?.backendUrl || 'Default local backend'}
                  </div>
                </div>
              </div>

              {/* Active Conditions Summary Banner */}
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Latency: <strong className="text-white font-mono">{proxyConfig?.latency || 0}ms</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Error Code: <strong className="text-white font-mono">{proxyConfig?.errorCode || 'none'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Drop Rate: <strong className="text-white font-mono">{proxyConfig?.failureRate || 0}%</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/app')}
                  className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-1 underline"
                >
                  Tune in Playground
                </button>
              </div>
            </div>

            {/* Interactive Request Tester */}
            <div className="panel-3d p-6 bg-[#0A1020]/90 backdrop-blur-2xl border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  Interactive Request Dispatcher
                </h2>
                <button
                  onClick={() => setShowHeadersEditor(!showHeadersEditor)}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Headers ({customHeaders.length})
                </button>
              </div>
              
              {/* Endpoint bar */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={testMethod}
                    onChange={(e) => setTestMethod(e.target.value)}
                    className="bg-[#10182D] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-500/50 font-mono"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                  
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">/p/{proxyId}</span>
                    <input
                      type="text"
                      placeholder="/users or /api/data"
                      value={testPath}
                      onChange={(e) => setTestPath(e.target.value)}
                      className="input-premium w-full pl-[95px] text-xs font-mono py-2"
                    />
                  </div>
                  
                  <button
                    onClick={handleTestRequest}
                    disabled={testing}
                    className="btn-3d px-4 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                  >
                    {testing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Request
                  </button>
                </div>

                {/* Optional Custom Headers Editor */}
                {showHeadersEditor && (
                  <div className="p-3 bg-[#10182D]/80 rounded-xl border border-white/5 space-y-2 text-xs animate-slide-up">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>CUSTOM REQUEST HEADERS</span>
                      <button
                        onClick={addHeader}
                        className="text-cyan-400 hover:underline"
                      >
                        + Add Header
                      </button>
                    </div>
                    {customHeaders.map((hdr, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Header Name"
                          value={hdr.key}
                          onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                          className="input-premium flex-1 text-xs py-1"
                        />
                        <input
                          type="text"
                          placeholder="Header Value"
                          value={hdr.value}
                          onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                          className="input-premium flex-1 text-xs py-1"
                        />
                        <button
                          onClick={() => removeHeader(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Request Payload for write methods */}
                {['POST', 'PUT', 'PATCH'].includes(testMethod) && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <label>REQUEST JSON PAYLOAD</label>
                      <button
                        onClick={() => setTestPayload('{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "timestamp": ' + Date.now() + '\n}')}
                        className="text-cyan-400 hover:underline"
                      >
                        Insert Sample
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                      className="w-full bg-[#10182D] border border-white/10 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-y"
                    />
                  </div>
                )}

                {/* Response Viewer with Tabs */}
                {testResponse && (
                  <div className="space-y-2 border-t border-[#1E293B]/60 pt-4 animate-slide-up">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveResponseTab('body')}
                          className={`px-2.5 py-1 rounded-lg transition ${activeResponseTab === 'body' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                          Body
                        </button>
                        <button
                          onClick={() => setActiveResponseTab('headers')}
                          className={`px-2.5 py-1 rounded-lg transition ${activeResponseTab === 'headers' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                          Headers
                        </button>
                        <button
                          onClick={() => setActiveResponseTab('curl')}
                          className={`px-2.5 py-1 rounded-lg transition ${activeResponseTab === 'curl' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                          cURL
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-emerald-400" />
                          Status: <strong className={testResponse.error || testResponse.status >= 400 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{testResponse.status || 'Error'}</strong>
                        </span>
                        {testResponse.duration && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {testResponse.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Tab 1: Response Body */}
                    {activeResponseTab === 'body' && (
                      <div className="p-3 bg-[#080D1A] border border-white/10 rounded-xl overflow-x-auto max-h-[280px] overflow-y-auto no-scrollbar font-mono text-[11px] relative group">
                        <button
                          onClick={() => {
                            const text = typeof testResponse.data === 'object' ? JSON.stringify(testResponse.data, null, 2) : String(testResponse.data || '');
                            navigator.clipboard.writeText(text);
                            toast.success('Response copied');
                          }}
                          className="absolute top-2 right-2 p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition text-[10px] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <pre className="text-slate-200">
                          {typeof testResponse.data === 'object'
                            ? JSON.stringify(testResponse.data, null, 2)
                            : String(testResponse.data || testResponse.message || '')}
                        </pre>
                      </div>
                    )}

                    {/* Tab 2: Response Headers */}
                    {activeResponseTab === 'headers' && (
                      <div className="p-3 bg-[#080D1A] border border-white/10 rounded-xl overflow-x-auto max-h-[280px] overflow-y-auto no-scrollbar font-mono text-[11px]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-slate-500 border-b border-white/10 pb-1">
                              <th className="pb-1 text-cyan-400">HEADER</th>
                              <th className="pb-1 text-cyan-400">VALUE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testResponse.headers && Object.entries(testResponse.headers).map(([k, v]) => (
                              <tr key={k} className="border-b border-white/5">
                                <td className="py-1 text-slate-400 font-semibold pr-4">{k}</td>
                                <td className="py-1 text-slate-200 break-all">{String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Tab 3: Generated cURL */}
                    {activeResponseTab === 'curl' && (
                      <div className="p-3 bg-[#080D1A] border border-white/10 rounded-xl overflow-x-auto max-h-[280px] font-mono text-[11px] relative group">
                        <button
                          onClick={copyCurl}
                          className="absolute top-2 right-2 p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy cURL</span>
                        </button>
                        <pre className="text-emerald-400 whitespace-pre-wrap">{generateCurlCommand()}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right panel: Live Stats & Real Captured Traffic */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Metrics */}
            <div className="panel-3d p-6 bg-[#0A1020]/90 backdrop-blur-2xl border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Real Gateway Metrics
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  LIVE TELEMETRY
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Total Proxy Calls</span>
                  <span className="text-2xl font-bold font-mono text-[#06B6D4]">{proxyConfig?.stats?.totalRequests || trafficLogs.length || 0}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Avg Response Time</span>
                  <span className="text-2xl font-bold font-mono text-[#F59E0B]">{Math.round(proxyConfig?.stats?.averageResponseTime || 0)}ms</span>
                </div>
                <div className="p-3 bg-[#22C55E]/5 rounded-xl border border-[#22C55E]/10 text-center col-span-2 flex items-center justify-between px-4">
                  <span className="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider">Gateway Creation</span>
                  <span className="text-xs font-semibold text-[#22C55E] font-mono">
                    {proxyConfig?.createdAt ? new Date(proxyConfig.createdAt).toLocaleString() : 'Active Session'}
                  </span>
                </div>
              </div>
            </div>

            {/* Real Traffic Logs */}
            <div className="panel-3d p-6 bg-[#0A1020]/90 backdrop-blur-2xl border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Live Proxy Traffic Feed
                </h2>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-slate-800 border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-Refresh (3s)</span>
                </label>
              </div>
              
              {trafficLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono space-y-1">
                  <p>No traffic recorded for this proxy yet.</p>
                  <p className="text-[10px] text-slate-600">Send a request via the tester or curl above to observe real HTTP packets.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
                  {trafficLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.method === 'GET' ? 'bg-[#06B6D4]/15 text-[#06B6D4]' :
                          log.method === 'POST' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                          'bg-[#F59E0B]/15 text-[#F59E0B]'
                        }`}>
                          {log.method}
                        </span>
                        <span className="text-slate-300 truncate max-w-[140px] font-semibold" title={log.route}>
                          {log.route || '/'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`font-bold ${log.status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {log.status}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {log.responseTime ? `${log.responseTime}ms` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
