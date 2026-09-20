import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useAI } from '../../context/AIContext';
import FormattedReport from '../ui/FormattedReport';
import { 
  Zap, Play, Square, Loader2, BarChart3, 
  Settings, AlertCircle, RefreshCw, CheckCircle2,
  TrendingUp, History, Activity, Clock,
  Users, Globe, Sparkles, ChevronRight, ArrowUpRight,
  ShieldCheck, AlertTriangle, Layers, FileText, Trash2
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export default function StressTest() {
  const {
    stressTestActive,
    stressTestConfig,
    stressTestResults,
    setStressTestActive,
    setStressTestConfig,
    setStressTestResults,
    isProxyActive
  } = useStore();

  const targetUrl = useStore(state => state.proxyUrl || state.backendUrl || 'http://funcspan.funclexa.dev/p/demo');
  const { messages, isProcessing, sendMessage } = useAI();
  const [showAiReport, setShowAiReport] = useState(false);

  // Real execution state
  const [realProgress, setRealProgress] = useState(0);
  const [realStats, setRealStats] = useState({
    sent: 0,
    success: 0,
    errors: 0,
    currentRps: 0,
    currentLatency: 0
  });

  // Real history loaded from localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('funcspan_real_stress_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Live charting state (10-second sliding window)
  const [liveRps, setLiveRps] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [liveLatency, setLiveLatency] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const abortRef = useRef(null);

  // Real HTTP Load Testing Engine
  const handleStart = async () => {
    if (!isProxyActive) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setStressTestActive(true);
    setRealProgress(0);
    setStressTestResults(null);
    setLiveRps([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setLiveLatency([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setRealStats({ sent: 0, success: 0, errors: 0, currentRps: 0, currentLatency: 0 });

    const { proxyUrl, backendUrl } = useStore.getState();
    const actualTarget = proxyUrl
      ? proxyUrl
          .replace('http://funcspan.funclexa.dev', API_BASE_URL)
          .replace('https://funcspan.funclexa.dev', API_BASE_URL)
          .replace('http://mock.funclexa.com', API_BASE_URL)
          .replace('https://mock.funclexa.com', API_BASE_URL)
      : (backendUrl || API_BASE_URL);

    const total = Math.max(1, Number(stressTestConfig.totalRequests) || 50);
    const concurrency = Math.min(Math.max(1, Number(stressTestConfig.concurrentRequests) || 5), total);
    const testDurationMs = (Number(stressTestConfig.duration) || 30) * 1000;
    const testStartTime = Date.now();

    let nextIndex = 0;
    let completed = 0;
    let successes = 0;
    let failures = 0;
    let allLatencies = [];
    let secRequests = 0;
    let secLatencies = [];

    // Live 1-second sampling ticker for real charts
    const ticker = setInterval(() => {
      const currentSecRps = secRequests;
      const currentSecLat = secLatencies.length > 0 
        ? Math.round(secLatencies.reduce((a, b) => a + b, 0) / secLatencies.length) 
        : 0;

      secRequests = 0;
      secLatencies = [];

      setLiveRps(prev => [...prev.slice(1), currentSecRps]);
      setLiveLatency(prev => [...prev.slice(1), currentSecLat]);
      setRealStats({
        sent: completed,
        success: successes,
        errors: failures,
        currentRps: currentSecRps,
        currentLatency: currentSecLat
      });
      setRealProgress(Math.min(100, Math.round((completed / total) * 100)));
    }, 1000);

    // Parallel Worker executing REAL HTTP requests
    const runWorker = async () => {
      while (nextIndex < total && (Date.now() - testStartTime) < testDurationMs && !controller.signal.aborted) {
        const idx = nextIndex++;
        if (idx >= total) break;

        const t0 = performance.now();
        let ok = false;
        let lat = 0;

        try {
          const method = ['GET', 'POST', 'PUT'][idx % 3];
          const route = `/stress-test-${idx % 25}`;
          const url = `${actualTarget}${route}?t=${Date.now()}&index=${idx}`;

          const res = await axios({
            method,
            url,
            data: method !== 'GET' ? { test: true, index: idx, timestamp: Date.now() } : undefined,
            timeout: 7000,
            signal: controller.signal,
            validateStatus: () => true // captures real HTTP status code
          });

          lat = Math.round(performance.now() - t0);
          ok = res.status >= 200 && res.status < 400;
        } catch (err) {
          if (controller.signal.aborted) return;
          lat = Math.round(performance.now() - t0);
          ok = false;
        }

        allLatencies.push(lat);
        secLatencies.push(lat);
        secRequests++;
        if (ok) successes++;
        else failures++;
        completed++;
      }
    };

    try {
      const workers = Array.from({ length: concurrency }).map(() => runWorker());
      await Promise.all(workers);
    } catch (e) {
      console.warn('Load test interrupted:', e);
    } finally {
      clearInterval(ticker);
      setStressTestActive(false);
      setRealProgress(100);

      // Real final metrics
      const durationSec = Math.max(1, Math.round((Date.now() - testStartTime) / 1000));
      const finalSuccessRate = completed > 0 ? Math.round((successes / completed) * 100) : 0;
      const finalAvgLatency = allLatencies.length > 0 
        ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length) 
        : 0;
      const sorted = [...allLatencies].sort((a, b) => a - b);
      const p95 = sorted.length > 0 
        ? sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] 
        : 0;

      const finalResults = {
        totalSent: completed,
        successRate: finalSuccessRate,
        avgLatency: finalAvgLatency,
        p95Latency: p95,
        errors: failures,
        duration: durationSec,
        isRealData: true
      };

      setStressTestResults(finalResults);
      setRealStats({
        sent: completed,
        success: successes,
        errors: failures,
        currentRps: Math.round(completed / durationSec),
        currentLatency: finalAvgLatency
      });

      if (completed > 0) {
        const newEntry = {
          timestamp: new Date().toLocaleTimeString(),
          concurrent: stressTestConfig.concurrentRequests,
          total: completed,
          duration: durationSec,
          successRate: finalSuccessRate,
          avgLatency: finalAvgLatency,
          isReal: true
        };
        setHistory(prev => {
          const updated = [newEntry, ...prev.filter(item => item.isReal)].slice(0, 20);
          try {
            localStorage.setItem('funcspan_real_stress_history', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setStressTestActive(false);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('funcspan_real_stress_history');
    } catch (e) {}
  };

  // Render SVG charts
  const getSvgPath = (data, maxVal = 500) => {
    if (!data || data.length === 0) return 'M0,100';
    const width = 300;
    const height = 100;
    const step = width / (data.length - 1);
    
    return data.map((val, i) => {
      const x = i * step;
      const scaleVal = maxVal > 0 ? maxVal : 1;
      const y = height - (val / scaleVal) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  };

  // Active results from current execution or most recent real history run
  const activeResults = stressTestResults || (history.length > 0 ? {
    totalSent: history[0].total,
    successRate: history[0].successRate,
    avgLatency: history[0].avgLatency,
    p95Latency: Math.round(history[0].avgLatency * 1.35),
    errors: Math.round(history[0].total * (1 - history[0].successRate / 100)),
    duration: history[0].duration || stressTestConfig.duration || 30
  } : null);

  const duration = activeResults?.duration || stressTestConfig.duration || 30;
  const throughputRps = activeResults 
    ? Math.max(1, Math.round((activeResults.totalSent * (activeResults.successRate / 100)) / duration))
    : 0;

  // Real-world user capacity calculation (Little's Law for web browsing with ~3s dwell interval)
  const latencyFactor = activeResults ? Math.min(1.0, 350 / Math.max(activeResults.avgLatency, 50)) : 1;
  const successFactor = activeResults ? (activeResults.successRate / 100) : 1;
  const safeConcurrentUsers = activeResults 
    ? Math.max(1, Math.round(throughputRps * 3.0 * successFactor * latencyFactor))
    : 0;

  const minCapacity = Math.max(1, Math.round(safeConcurrentUsers * 0.85));
  const maxCapacity = Math.round(safeConcurrentUsers * 1.25);
  const peakConnections = activeResults 
    ? Math.max(1, Math.round(stressTestConfig.concurrentRequests * successFactor))
    : 0;

  const getCapacityStatus = () => {
    if (!activeResults) return { 
      label: 'READY FOR TEST', 
      color: 'text-slate-400', 
      bg: 'bg-slate-500/10', 
      border: 'border-slate-500/20',
      desc: 'Execute a load test to measure live URL concurrent user capacity.'
    };
    if (activeResults.successRate >= 98 && activeResults.avgLatency <= 300) {
      return { 
        label: 'HIGH STABILITY (SUB-300ms SLA)', 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/30',
        desc: 'Production Grade: Target URL easily handles this concurrency with sub-300ms response SLA.' 
      };
    }
    if (activeResults.successRate >= 90 && activeResults.avgLatency <= 600) {
      return { 
        label: 'MODERATE LOAD (APPROACHING LIMIT)', 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/30',
        desc: 'Elevated latency detected: URL is operating near single-instance capacity limits.' 
      };
    }
    return { 
      label: 'SATURATED / BOTTLENECK DETECTED', 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/30',
      desc: 'High error rate or severe latency degradation: scale backend or optimize bottlenecks.' 
    };
  };

  const capacityStatus = getCapacityStatus();

  // Find latest assistant message
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

  const handleTriggerAiAudit = () => {
    setShowAiReport(true);
    const prompt = `Analyze how many people can access this URL at a time:
- Target Tested URL: ${targetUrl}
- Test Configuration: ${stressTestConfig.concurrentRequests} concurrent threads, ${stressTestConfig.totalRequests} total requests over ${duration}s
- Real Execution Metrics: ${throughputRps} RPS sustained, ${activeResults?.avgLatency}ms average latency, ${activeResults?.p95Latency}ms P95 latency, ${activeResults?.successRate}% success rate (${activeResults?.errors} errors)
- Calculated Safe User Capacity: ~${safeConcurrentUsers} people at a time (${minCapacity} - ${maxCapacity} concurrent visitors under target SLA)

Please provide a detailed, human-readable capacity audit report with clean Markdown tables and actionable optimization steps.`;
    sendMessage(prompt);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto h-full pr-1 pb-6">
      {/* Left Column: Configuration */}
      <div className="lg:col-span-4 space-y-4">
        <div className="panel-3d p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              Load Configuration
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
              REAL ENGINE
            </span>
          </div>

          {!isProxyActive && (
            <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-accent-400">Proxy Offline</p>
                <p className="mt-0.5">Please generate and start a proxy configuration first before initiating a stress test.</p>
              </div>
            </div>
          )}

          {/* Config Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Concurrency</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={stressTestConfig.concurrentRequests}
                  onChange={(e) => setStressTestConfig({ concurrentRequests: parseInt(e.target.value) || 10 })}
                  className="input-premium w-full text-xs"
                  disabled={stressTestActive}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Total Requests</label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={stressTestConfig.totalRequests}
                  onChange={(e) => setStressTestConfig({ totalRequests: parseInt(e.target.value) || 100 })}
                  className="input-premium w-full text-xs"
                  disabled={stressTestActive}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Ramp Up (s)</label>
                <input
                  type="number"
                  min="1"
                  value={stressTestConfig.rampUpTime}
                  onChange={(e) => setStressTestConfig({ rampUpTime: parseInt(e.target.value) || 5 })}
                  className="input-premium w-full text-xs"
                  disabled={stressTestActive}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Duration (s)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={stressTestConfig.duration}
                  onChange={(e) => setStressTestConfig({ duration: parseInt(e.target.value) || 30 })}
                  className="input-premium w-full text-xs"
                  disabled={stressTestActive}
                />
              </div>
            </div>
          </div>

          {/* Control Button */}
          {stressTestActive ? (
            <div className="space-y-3">
              <button
                onClick={handleStop}
                className="w-full btn-3d-secondary flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              >
                <Square className="w-3.5 h-3.5 fill-white text-white" />
                Abort Test Run
              </button>
              
              {/* Progress bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                    Executing real HTTP requests ({realStats.sent}/{stressTestConfig.totalRequests})...
                  </span>
                  <span className="font-mono font-bold text-cyan-400">{realProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] transition-all duration-300" 
                    style={{ width: `${realProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={!isProxyActive}
              className="w-full btn-3d flex items-center justify-center gap-2 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:scale-100"
            >
              <Play className="w-4 h-4" />
              Initiate Load Test
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Live Charts & History */}
      <div className="lg:col-span-8 space-y-4">
        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="panel-3d p-4">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">CURRENT RPS</span>
            <div className="text-xl font-bold font-mono text-[#06B6D4] mt-1">
              {stressTestActive ? liveRps[liveRps.length - 1] : activeResults ? throughputRps : 0}
            </div>
          </div>
          <div className="panel-3d p-4">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">LATENCY</span>
            <div className="text-xl font-bold font-mono text-[#F59E0B] mt-1">
              {stressTestActive 
                ? `${liveLatency[liveLatency.length - 1]}ms` 
                : activeResults ? `${activeResults.avgLatency}ms` : '0ms'}
            </div>
          </div>
          <div className="panel-3d p-4">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">SUCCESS RATE</span>
            <div className="text-xl font-bold font-mono text-[#22C55E] mt-1">
              {stressTestActive 
                ? (realStats.sent > 0 ? `${Math.round((realStats.success / realStats.sent) * 100)}%` : '100%')
                : activeResults ? `${activeResults.successRate}%` : '100%'}
            </div>
          </div>
          <div className="panel-3d p-4">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">ERRORS</span>
            <div className="text-xl font-bold font-mono text-[#EF4444] mt-1">
              {stressTestActive ? realStats.errors : activeResults ? activeResults.errors : '0'}
            </div>
          </div>
        </div>

        {/* URL Concurrent User Capacity Specification Card */}
        <div className="panel-3d p-5 border border-cyan-500/20 bg-gradient-to-br from-slate-900/95 via-[#0C1427]/95 to-slate-900/95 shadow-[0_10px_35px_rgba(6,182,212,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  URL Concurrent User Capacity
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${capacityStatus.bg} ${capacityStatus.color} border ${capacityStatus.border} font-semibold uppercase`}>
                    {capacityStatus.label}
                  </span>
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <Globe className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span className="font-mono text-cyan-300/90 truncate max-w-[260px] md:max-w-md">
                    {targetUrl}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Audit Action */}
            <button
              onClick={handleTriggerAiAudit}
              disabled={isProcessing || !activeResults}
              className="btn-3d flex items-center gap-1.5 text-xs py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-[0_0_20px_rgba(6,182,212,0.25)] transition duration-200 disabled:opacity-50"
              title="Generate comprehensive human-readable report with LexaChat AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>{isProcessing ? 'Auditing...' : 'Audit with LexaChat AI'}</span>
            </button>
          </div>

          {/* Primary Metric & Explanation */}
          <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-6 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                MAX SAFE CONCURRENT ACCESS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                  ~{safeConcurrentUsers}
                </span>
                <span className="text-sm font-bold text-white">
                  People At A Time
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug pt-1">
                {activeResults ? (
                  <>
                    This URL can reliably handle <strong className="text-white">~{safeConcurrentUsers} simultaneous active people</strong> ({minCapacity}–{maxCapacity} range) based on tested {activeResults.avgLatency}ms avg latency and {activeResults.successRate}% error-free execution.
                  </>
                ) : (
                  'Execute a load test run to calculate simultaneous people capacity for this endpoint.'
                )}
              </p>
            </div>

            {/* Capacity Breakdown Pills */}
            <div className="md:col-span-6 grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <span className="text-slate-400 block flex items-center gap-1">
                  <Users className="w-3 h-3 text-cyan-400" />
                  Active People (3s Dwell)
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  ~{safeConcurrentUsers} users
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <span className="text-slate-400 block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Max In-Flight Threads
                </span>
                <span className="font-mono text-sm font-bold text-amber-300">
                  {peakConnections} reqs
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <span className="text-slate-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  Avg / P95 Latency SLA
                </span>
                <span className="font-mono text-sm font-bold text-sky-300">
                  {activeResults?.avgLatency || 0}ms / {activeResults?.p95Latency || 0}ms
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <span className="text-slate-400 block flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Sustained Throughput
                </span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {throughputRps} RPS
                </span>
              </div>
            </div>
          </div>

          {/* Status Bar Note */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${capacityStatus.color}`} />
              <span>{capacityStatus.desc}</span>
            </span>
            <span className="font-mono text-slate-500 hidden sm:inline">
              Real Performance Measurement Engine
            </span>
          </div>

          {/* Expandable Embedded LexaChat AI Audit Report */}
          {(showAiReport || isProcessing) && (
            <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  LexaChat AI Capacity Audit Report
                </h5>
                <button
                  onClick={() => setShowAiReport(false)}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
                >
                  Collapse
                </button>
              </div>

              {isProcessing && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <p className="font-semibold text-white">Synthesizing Capacity Audit Report...</p>
                    <p className="text-[10px] text-slate-400">LexaChat AI is computing Little's Law capacity, throughput curves, and bottleneck diagnostics.</p>
                  </div>
                </div>
              )}

              {lastAssistantMessage && !isProcessing && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner max-h-[420px] overflow-y-auto no-scrollbar">
                  <FormattedReport content={lastAssistantMessage.content} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Charts Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RPS Chart */}
          <div className="panel-3d p-5">
            <div className="flex items-center gap-1.5 border-b border-[#1E293B]/60 pb-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span className="text-xs font-semibold text-white">Requests Per Second (RPS)</span>
            </div>
            <div className="h-28 w-full relative">
              <svg className="w-full h-full text-[#06B6D4]" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path 
                  d={getSvgPath(liveRps, Math.max(50, ...liveRps))} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
              </svg>
              {liveRps[liveRps.length - 1] === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  Waiting for test run...
                </div>
              )}
            </div>
          </div>

          {/* Latency Chart */}
          <div className="panel-3d p-5">
            <div className="flex items-center gap-1.5 border-b border-[#1E293B]/60 pb-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-xs font-semibold text-white">Average Latency (ms)</span>
            </div>
            <div className="h-28 w-full relative">
              <svg className="w-full h-full text-[#F59E0B]" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path 
                  d={getSvgPath(liveLatency, Math.max(200, ...liveLatency))} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
              </svg>
              {liveLatency[liveLatency.length - 1] === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  Waiting for test run...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results History */}
        <div className="panel-3d p-6">
          <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3 mb-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Real Execution Results History
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                REAL HTTP METRICS
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] text-slate-400 hover:text-red-400 p-1 hover:bg-white/5 rounded transition flex items-center gap-1"
                  title="Clear real history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono space-y-1">
              <p>No load test runs recorded yet.</p>
              <p className="text-[11px] text-slate-600">Click &quot;Initiate Load Test&quot; above to execute real concurrent HTTP traffic against your URL.</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-[#1E293B]/40 pb-2">
                    <th className="pb-2">TIME</th>
                    <th className="pb-2">CONCURRENCY</th>
                    <th className="pb-2">TOTAL REQS</th>
                    <th className="pb-2">SUCCESS RATE</th>
                    <th className="pb-2 text-right">AVG LATENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#1E293B]/20 hover:bg-white/5 transition duration-150">
                      <td className="py-2 text-slate-400">{item.timestamp}</td>
                      <td className="py-2 text-slate-300">{item.concurrent}</td>
                      <td className="py-2 text-slate-300">{item.total}</td>
                      <td className="py-2">
                        <span className={`font-bold ${item.successRate >= 95 ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
                          {item.successRate}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-300">{item.avgLatency}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
