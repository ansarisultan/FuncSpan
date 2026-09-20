import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useProxy } from '../hooks/useProxy';
import { useTraffic } from '../hooks/useTraffic';
import { useAI } from '../context/AIContext';
import FormattedReport from '../components/ui/FormattedReport';
import ProxyConfig from '../components/panels/ProxyConfig';
import NetworkControls from '../components/panels/NetworkControls';
import TrafficInspector from '../components/panels/TrafficInspector';
import ScenarioManager from '../components/panels/ScenarioManager';
import StressTest from '../components/panels/StressTest';
import { DummyDataGeneratorConfig, DummyDataGeneratorPreview } from '../components/panels/DummyDataGenerator';
import { 
  SplitSquareHorizontal, Maximize2, Minimize2,
  Activity, Settings, Network, FileText,
  ChevronLeft, ChevronRight, Loader2,
  Zap, Sparkles, Shield, Globe, Clock,
  AlertCircle, Database, Upload, Download, BarChart3,
  ChevronDown, MoreHorizontal, X, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function Playground() {
  const { 
    activeTab, 
    setActiveTab, 
    isProxyActive, 
    setIsFullscreen, 
    isFullscreen,
    latency,
    failureRate,
    errorCode,
    trafficStats,
    themeMode,
    backendUrl
  } = useStore();
  
  // Call useProxy to ensure dynamic configuration sync effect remains mounted & active at all times
  useProxy();

  const navigate = useNavigate();
  const { trafficLogs } = useTraffic();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isPlaceholderCollapsed, setIsPlaceholderCollapsed] = useState(false);
  const location = useLocation();
  const [showMoreTabs, setShowMoreTabs] = useState(false);
  
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const floatingChatEndRef = useRef(null);
  const { messages, isProcessing, sendMessage, activeModel } = useAI();

  useEffect(() => {
    if (isFloatingChatOpen && floatingChatEndRef.current) {
      floatingChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isFloatingChatOpen]);

  const getLeftColSpanClass = () => {
    if (activeTab === 'traffic') return 'hidden';
    if (!isLeftPanelOpen) return 'hidden';
    if (isPlaceholderCollapsed && !isProxyActive && activeTab !== 'traffic' && activeTab !== 'generator') {
      const showRightPanel = isRightPanelOpen && activeTab !== 'traffic' && activeTab !== 'generator';
      return showRightPanel ? 'lg:col-span-9' : 'lg:col-span-12';
    }
    return 'lg:col-span-4';
  };

  const getCenterColSpanClass = () => {
    if (activeTab === 'traffic') return 'lg:col-span-12';
    const showPlaceholder = !isProxyActive && activeTab !== 'traffic' && activeTab !== 'generator';
    if (showPlaceholder && isPlaceholderCollapsed) return 'hidden';
    
    let s = 12;
    if (isLeftPanelOpen) s -= 4;
    const showRightPanel = isRightPanelOpen && activeTab !== 'traffic' && activeTab !== 'generator' && !isProxyActive;
    if (showRightPanel) s -= 3;
    
    if (s === 12) return 'lg:col-span-12';
    if (s === 9) return 'lg:col-span-9';
    if (s === 8) return 'lg:col-span-8';
    return 'lg:col-span-5';
  };

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

        // Restore into Zustand store
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

        // Sync to backend proxy if active
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
            console.error('Failed to register/sync proxy on backend during import:', backendErr);
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, to: '/app' },
    { id: 'config', label: 'Configuration', icon: Settings, to: '/app/config' },
    { id: 'traffic', label: 'Traffic Inspector', icon: Activity, to: '/app/logs' },
    { id: 'stress', label: 'Stress Test', icon: Loader2, to: '/app/stress' },
    { id: 'scenarios', label: 'Scenarios', icon: FileText, to: '/app/scenarios' },
    { id: 'generator', label: 'Data Generator', icon: Database, to: '/app/generator' },
  ];

  useEffect(() => {
    if (location.pathname === '/app/scenarios') {
      setActiveTab('scenarios');
    } else if (location.pathname === '/app/logs') {
      setActiveTab('traffic');
    } else if (location.pathname === '/app/stress') {
      setActiveTab('stress');
    } else if (location.pathname === '/app/generator') {
      setActiveTab('generator');
    } else if (location.pathname === '/app/config') {
      setActiveTab('config');
    } else if (location.pathname === '/app') {
      setActiveTab('overview');
    }
  }, [location.pathname, setActiveTab]);

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <OverviewPage 
            latency={latency}
            failureRate={failureRate}
            errorCode={errorCode}
            trafficLogs={trafficLogs}
            isProxyActive={isProxyActive}
            setActiveTab={setActiveTab}
            navigate={navigate}
          />
        );
      case 'config': 
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto h-full pr-1 pb-6">
            <div className="lg:col-span-5">
              <ProxyConfig />
            </div>
            <div className="lg:col-span-7">
              <NetworkControls />
            </div>
          </div>
        );
      case 'scenarios': return <ScenarioManager />;
      case 'traffic': return <TrafficInspector />;
      case 'stress': return <StressTest />;
      case 'generator': 
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <div className="lg:col-span-5 overflow-y-auto h-full pr-1 pb-4">
              <DummyDataGeneratorConfig />
            </div>
            <div className="lg:col-span-7 h-full">
              <DummyDataGeneratorPreview />
            </div>
          </div>
        );
      default: 
        return (
          <OverviewPage 
            latency={latency}
            failureRate={failureRate}
            errorCode={errorCode}
            trafficLogs={trafficLogs}
            isProxyActive={isProxyActive}
            setActiveTab={setActiveTab}
            navigate={navigate}
          />
        );
    }
  };

  return (
    <div className={`w-full flex flex-col relative overflow-hidden transition-colors duration-700 ${
      isFullscreen 
        ? `fixed inset-0 z-50 p-4 h-screen ${themeMode === 'glass' ? 'bg-[#090e25] theme-glass' : 'bg-[#050816]'}` 
        : themeMode === 'glass' ? 'theme-glass' : ''
    } ${isFullscreen ? '' : 'h-full lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden'}`}>
      {/* Background Grid Pattern & Radial Glows */}
      <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#06B6D4]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/3 rounded-full blur-[100px] pointer-events-none z-0" />
      
      {themeMode === 'glass' && (
        <>
          <div className="absolute top-10 left-1/4 w-[350px] h-[350px] bg-[#06B6D4]/12 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse-slow" />
          <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse-slow" style={{ animationDelay: '-1s' }} />
        </>
      )}

      <div className="flex flex-col h-full gap-2 sm:gap-4 z-10 relative">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#0A1020] border border-[#1E293B]/60 p-2.5 sm:p-4 shadow-lg sm:shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#06B6D4]/5 rounded-full blur-3xl animate-float-slow" />
          
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <h1 className="text-sm sm:text-xl font-bold flex items-center gap-1.5 sm:gap-3">
                <Network className="w-4 h-4 sm:w-5 sm:h-5 text-[#06B6D4] flex-shrink-0" />
                <span className="text-gradient-animated-funclexa whitespace-nowrap">FuncSpan Proxy</span>
                {isProxyActive && (
                  <span className="text-[9px] sm:text-xs font-normal text-[#22C55E] bg-[#22C55E]/10 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-[#22C55E]/20 flex items-center gap-1 sm:gap-2 animate-pulse whitespace-nowrap">
                    <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Active
                  </span>
                )}
              </h1>
              <p className="text-[10px] sm:text-sm text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-2">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#06B6D4] flex-shrink-0" />
                <span className="truncate">FuncSpan Simulator • {trafficLogs.length} reqs</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={handleExportBackup}
                  className="btn-3d flex items-center gap-1.5 text-xs px-3 py-2"
                  title="Export JSON Backup"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Backup
                </button>
                <label className="btn-3d flex items-center gap-1.5 text-xs px-3 py-2 cursor-pointer" title="Import JSON Backup">
                  <Upload className="w-3.5 h-3.5" />
                  Import Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 sm:p-2 rounded-xl hover:bg-white/5 transition-all duration-300 hover:scale-110"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-400" /> : <Maximize2 className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Switcher - Responsive Layout */}
        {/* Desktop Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#0A1020] rounded-xl p-1 border border-[#1E293B]/60 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.to);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-primary-400 border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Tabs Dropdown/Popup System */}
        <div className="md:hidden flex items-center gap-2 bg-[#0A1020]/90 backdrop-blur-xl rounded-xl p-1 border border-white/10 w-full justify-between relative z-30">
          {/* Always visible on mobile: Overview & Configuration */}
          <div className="flex items-center gap-1 flex-1">
            {tabs.slice(0, 2).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate(tab.to);
                  setShowMoreTabs(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-primary-400 border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            
            {/* "More Options" button */}
            <button
              onClick={() => setShowMoreTabs(!showMoreTabs)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all duration-300 border ${
                ['traffic', 'stress', 'scenarios', 'generator'].includes(activeTab)
                  ? 'bg-gradient-to-r from-primary-500/25 to-secondary-500/25 text-primary-400 border-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>
                {['traffic', 'stress', 'scenarios', 'generator'].includes(activeTab) 
                  ? tabs.find(t => t.id === activeTab)?.label 
                  : 'More'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showMoreTabs ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Popover options list for mobile */}
          {showMoreTabs && (
            <div className="absolute top-12 left-0 right-0 bg-[#0A1020]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-50 animate-scale-in">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block px-2.5 mb-1.5">Select View Tab</span>
              <div className="grid grid-cols-2 gap-1.5">
                {tabs.slice(2).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      navigate(tab.to);
                      setShowMoreTabs(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-left text-xs transition duration-200 border ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-primary-400 border-white/10'
                        : 'bg-white/5 text-slate-300 hover:text-white border-transparent'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden relative pb-6 pr-1">
          {renderTabContent()}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isProxyActive ? 'bg-success-400 animate-pulse' : 'bg-slate-600'}`} />
              {isProxyActive ? 'Proxy Active' : 'Proxy Inactive'}
            </span>
            <span>•</span>
            <span>{trafficLogs.length} requests</span>
            <span>•</span>
            <span>v2.0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary-400 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              funcspan.funclexa.dev
            </span>
            <span className="text-slate-600">|</span>
            <span>FuncSpan Network Environment Playground</span>
          </div>
        </div>
      </div>

      {/* Floating Context-Aware Chatbot Widget */}
      {(isProxyActive || trafficLogs.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {/* Chat Window Panel */}
          {isFloatingChatOpen && (
            <div className="w-[420px] md:w-[480px] max-w-[94vw] h-[520px] bg-[#0A1020]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden mb-4 animate-scale-in">
              {/* Header */}
              <div className="p-3 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-main flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      LexaChat AI
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                    </h4>
                    <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider block">Executive Performance Report Analyst</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFloatingChatOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center p-3 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#10182D] border border-white/5 flex items-center justify-center text-primary-400">
                      <Activity className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white mb-1">Human-Readable Report Ready</h5>
                      <p className="text-[10px] text-slate-400 max-w-[280px]">
                        LexaChat is ready to analyze your URL concurrent capacity, load testing metrics, and latency bottlenecks.
                      </p>
                    </div>
                    {/* Quick options */}
                    <div className="w-full space-y-1.5 pt-1">
                      <button 
                        onClick={() => sendMessage('How many people can access this URL at a time? Provide a full capacity analysis report.')}
                        className="w-full p-2 text-left text-[11px] text-cyan-300 hover:text-white bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-800/30 hover:border-cyan-500/50 rounded-xl transition duration-200 flex items-center gap-2"
                      >
                        <span>👥</span>
                        <span>How many people can access this URL at a time?</span>
                      </button>
                      <button 
                        onClick={() => sendMessage('Analyze my latest load testing results and explain any latency or error bottlenecks.')}
                        className="w-full p-2 text-left text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-primary-500/10 border border-white/5 hover:border-primary-500/20 rounded-xl transition duration-200 flex items-center gap-2"
                      >
                        <span>📊</span>
                        <span>Generate Full Load Testing Audit Report</span>
                      </button>
                      <button 
                        onClick={() => sendMessage('Explain the current network status and any latency or error anomalies')}
                        className="w-full p-2 text-left text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition duration-200"
                      >
                        Explain current proxy status
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'ml-auto flex-row-reverse max-w-[85%]' : 'w-full'}`}
                    >
                      {msg.role !== 'user' && (
                        <div className="w-6 h-6 rounded-lg bg-gradient-main flex-shrink-0 flex items-center justify-center mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`p-3 rounded-2xl text-xs overflow-hidden ${
                        msg.role === 'user'
                          ? 'bg-[#10182D] text-white border border-white/10 rounded-tr-none'
                          : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-none w-full shadow-md'
                      }`}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          <FormattedReport content={msg.content} />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="flex gap-2.5 items-center text-xs text-slate-400 p-2 bg-slate-900/50 rounded-xl border border-white/5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06B6D4]" />
                    <span>Analyzing performance report...</span>
                  </div>
                )}
                <div ref={floatingChatEndRef} />
              </div>

              {/* Chat Input Footer */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!floatingChatInput.trim() || isProcessing) return;
                  sendMessage(floatingChatInput);
                  setFloatingChatInput('');
                }}
                className="p-2 border-t border-white/10 bg-[#0A1020]/95 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Ask about URL capacity, latency, load test..."
                  value={floatingChatInput}
                  onChange={(e) => setFloatingChatInput(e.target.value)}
                  disabled={isProcessing}
                  className="flex-1 bg-[#10182D] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-500/50"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !floatingChatInput.trim()}
                  className="p-1.5 bg-gradient-main rounded-xl text-white hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Trigger Icon Button */}
          <button 
            onClick={() => setIsFloatingChatOpen(!isFloatingChatOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group relative ${
              isFloatingChatOpen 
                ? 'bg-[#10182D] border-white/10 text-white' 
                : 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-white/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
            title="Analyze Report with AI"
          >
            <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 border-2 border-[#050816] animate-pulse" />
          </button>
        </div>
      )}
    </div>
  );
}

// Dedicated Overview landing page component
function OverviewPage({
  latency,
  failureRate,
  errorCode,
  trafficLogs,
  isProxyActive,
  setActiveTab,
  navigate
}) {
  const { generateProxy, stopProxy } = useProxy();
  const { clearTrafficLogs, backendUrl } = useStore();

  const handleToggleProxy = async () => {
    if (isProxyActive) {
      await stopProxy();
      toast.success('Proxy router deactivated');
    } else {
      const url = await generateProxy();
      if (url) {
        toast.success('Proxy router activated');
      } else {
        toast.error('Please configure your Backend URL first.');
        setActiveTab('config');
        navigate('/app/config');
      }
    }
  };

  const handleClearLogs = () => {
    clearTrafficLogs();
    toast.success('Traffic logs cleared');
  };

  const totalLogs = trafficLogs.length;
  const errorLogsCount = trafficLogs.filter(log => log.status >= 400).length;
  
  const avgLatency = totalLogs > 0 
    ? Math.round(trafficLogs.reduce((acc, log) => acc + (log.latency || log.duration || 0), 0) / totalLogs)
    : 0;

  const recentLogs = trafficLogs.slice(-5).reverse();

  return (
    <div className="space-y-4 overflow-y-auto h-full pr-2 pb-6">
      {/* 5 Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* Card 1: Proxy State */}
        <div className="panel-3d p-3 flex flex-col justify-between h-20 bg-[#0A1020]/45 backdrop-blur-xl border-[#1E293B]/80 hover:border-[#22C55E]/30 transition-all duration-300 col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">PROXY STATE</span>
            <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <span className={`text-xs font-bold font-mono uppercase ${isProxyActive ? 'text-[#22C55E]' : 'text-slate-500'}`}>
              {isProxyActive ? 'ACTIVE' : 'STANDBY'}
            </span>
            <span className={`relative flex h-2 w-2`}>
              {isProxyActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isProxyActive ? 'bg-[#22C55E]' : 'bg-slate-600'}`}></span>
            </span>
          </div>
        </div>

        {/* Card 2: Throughput / Traffic */}
        <div className="panel-3d p-3 flex flex-col justify-between h-20 bg-[#0A1020]/45 backdrop-blur-xl border-[#1E293B]/80 hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">TRAFFIC</span>
            <Activity className="w-3.5 h-3.5 text-[#06B6D4]" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold font-mono text-[#06B6D4]">{totalLogs}</span>
              <span className="text-[10px] text-slate-500 font-mono">reqs</span>
            </div>
            <svg className="w-14 h-5 text-[#06B6D4]/50" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,28 Q15,5 30,25 T60,10 T90,20 L100,5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Latency */}
        <div className="panel-3d p-3 flex flex-col justify-between h-20 bg-[#0A1020]/45 backdrop-blur-xl border-[#1E293B]/80 hover:border-[#F59E0B]/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">AVG LATENCY</span>
            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold font-mono text-[#F59E0B]">{avgLatency}</span>
              <span className="text-[10px] text-slate-500 font-mono">ms</span>
            </div>
            <svg className="w-14 h-5 text-[#F59E0B]/50" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,25 L10,22 L20,28 L30,15 L40,18 L50,10 L60,25 L70,8 L80,12 L90,5 L100,15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Error Inject */}
        <div className="panel-3d p-3 flex flex-col justify-between h-20 bg-[#0A1020]/45 backdrop-blur-xl border-[#1E293B]/80 hover:border-red-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">ERROR INJECT</span>
            <Shield className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <span className={`text-xs font-bold font-mono truncate ${errorCode !== 'none' ? 'text-[#EF4444]' : 'text-slate-400'}`}>
              {errorCode === 'none' ? 'NONE' : errorCode}
            </span>
            <div className={`w-2 h-2 rounded-full ${errorCode !== 'none' ? 'bg-[#EF4444] animate-pulse' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* Card 5: Errors */}
        <div className="panel-3d p-3 flex flex-col justify-between h-20 bg-[#0A1020]/45 backdrop-blur-xl border-[#1E293B]/80 hover:border-[#EF4444]/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">ERRORS</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold font-mono text-[#EF4444]">{errorLogsCount}</span>
              <span className="text-[10px] text-slate-500 font-mono">errs</span>
            </div>
            <svg className="w-14 h-5 text-[#EF4444]/50" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,28 L10,28 L20,28 L30,22 L40,28 L50,28 L60,15 L70,28 L80,28 L90,20 L100,28" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Traffic Charts & Quick Actions & Recent Activity Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Traffic Charts */}
        <div className="lg:col-span-8 space-y-4">
          <div className="panel-3d p-4 bg-[#0A1020]/45 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="text-sm font-semibold text-white">Real-Time Traffic Throughput</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                LIVE METRICS
              </span>
            </div>
            
            {/* Custom Interactive SVG Throughput Chart */}
            <div className="h-64 flex flex-col justify-between relative overflow-hidden group">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                <div className="border-b border-[#1E293B] w-full h-0" />
                <div className="border-b border-[#1E293B] w-full h-0" />
                <div className="border-b border-[#1E293B] w-full h-0" />
                <div className="border-b border-[#1E293B] w-full h-0" />
              </div>
              
              {/* Dynamic Wave SVG */}
              <div className="flex-1 w-full relative z-10">
                <svg className="w-full h-full text-[#06B6D4]" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Fill area */}
                  <path 
                    d={`M0,150 L0,120 Q50,70 100,110 T200,60 T300,90 T400,45 T500,15 L500,150 Z`} 
                    fill="url(#chart-glow)" 
                  />
                  {/* Stroke path */}
                  <path 
                    d={`M0,120 Q50,70 100,110 T200,60 T300,90 T400,45 T500,15`} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    className="stroke-cyan-glow"
                  />
                  
                  {/* Glowing data points */}
                  <circle cx="100" cy="110" r="3" fill="#06B6D4" className="animate-pulse" />
                  <circle cx="200" cy="60" r="3" fill="#06B6D4" className="animate-pulse" />
                  <circle cx="300" cy="90" r="3" fill="#06B6D4" className="animate-pulse" />
                  <circle cx="400" cy="45" r="3" fill="#06B6D4" className="animate-pulse" />
                  <circle cx="500" cy="15" r="4" fill="#22C55E" />
                </svg>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-[#1E293B]/40 relative z-10">
                <span>60s ago</span>
                <span>45s ago</span>
                <span>30s ago</span>
                <span>15s ago</span>
                <span className="text-[#22C55E] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="panel-3d p-4 bg-[#0A1020]/45 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#22C55E]" />
                <h3 className="text-sm font-semibold text-white">Recent Logged Activity</h3>
              </div>
              <button 
                onClick={() => { setActiveTab('traffic'); navigate('/app/logs'); }}
                className="text-[10px] text-primary-400 font-bold hover:underline"
              >
                VIEW ALL LOGS →
              </button>
            </div>
            
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No request logs captured yet. Trigger proxy requests to begin.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-500 border-b border-[#1E293B]/60 pb-2">
                      <th className="py-2">METHOD</th>
                      <th className="py-2">PATH</th>
                      <th className="py-2">STATUS</th>
                      <th className="py-2">LATENCY</th>
                      <th className="py-2 text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-[#1E293B]/40 hover:bg-white/5 transition duration-150">
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'GET' ? 'bg-[#06B6D4]/10 text-[#06B6D4]' :
                            log.method === 'POST' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                            'bg-[#F59E0B]/10 text-[#F59E0B]'
                          }`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="py-2 text-slate-300 truncate max-w-[120px]" title={log.route || log.path || ''}>
                          {log.route || log.path || ''}
                        </td>
                        <td className="py-2">
                          <span className={`font-bold ${
                            log.status >= 500 ? 'text-[#EF4444]' :
                            log.status >= 400 ? 'text-[#F59E0B]' :
                            'text-[#22C55E]'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400">
                          {log.latency || log.duration || 0}ms
                        </td>
                        <td className="py-2 text-slate-500 text-right">
                          {new Date(log.time || log.timestamp || Date.now()).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="panel-3d p-4 bg-[#0A1020]/45 backdrop-blur-xl border-white/10 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1E293B]/60 pb-3 mb-2">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleToggleProxy}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition duration-300 flex items-center justify-center gap-2 ${
                    isProxyActive 
                      ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20' 
                      : 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/20'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  {isProxyActive ? 'Deactivate Proxy Router' : 'Activate Proxy Router'}
                </button>

                {isProxyActive && (
                  <button 
                    onClick={() => {
                      const state = useStore.getState();
                      const currentProxyId = state.proxyId;
                      if (currentProxyId) {
                        const url = `${window.location.origin}/proxy-interface/${currentProxyId}`;
                        window.open(url, '_blank');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600/80 hover:bg-primary-700/90 border border-primary-500/30 transition duration-300 flex items-center justify-center gap-2 animate-pulse"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Proxy Interface
                  </button>
                )}

                <button 
                  onClick={() => { setActiveTab('config'); navigate('/app/config'); }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-[#1E293B]/60 hover:bg-white/10 transition duration-300 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4 text-primary-400" />
                  Proxy Configuration
                </button>

                <button 
                  onClick={() => { setActiveTab('stress'); navigate('/app/stress'); }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-[#1E293B]/60 hover:bg-white/10 transition duration-300 flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-4 h-4 text-[#F59E0B]" />
                  Launch Stress Tester
                </button>

                <button 
                  onClick={handleClearLogs}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-[#EF4444] bg-transparent border border-dashed border-[#1E293B] hover:border-[#EF4444]/30 transition duration-300 flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Clear Captured Logs
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1E293B]/40 text-[10px] text-slate-500 font-mono space-y-1.5">
              <div className="flex justify-between">
                <span>Active Backend URL:</span>
                <span className="text-[#06B6D4] truncate max-w-[150px]">{backendUrl || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span>Latency Penalty:</span>
                <span className="text-[#F59E0B]">{latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Error Simulation:</span>
                <span className="text-[#EF4444] uppercase">{errorCode} ({failureRate}%)</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
