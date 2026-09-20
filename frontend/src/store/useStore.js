import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Proxy Configuration
      backendUrl: '',
      proxyUrl: '',
      isProxyActive: false,
      proxyId: null,
      
      // Network Conditions
      latency: 0,
      errorCode: 'none',
      failureRate: 0,
      rateLimit: 'none',
      networkProfile: 'custom',
      
      // Schema Mutator
      schemaMutations: {
        removeFields: [],
        renameFields: {},
        returnNull: [],
        emptyArrays: [],
        changeTypes: {},
      },
      
      // Payload Settings
      payloadMultiplier: 1,
      payloadSize: 'small',
      
      // Stress Testing
      stressTestActive: false,
      stressTestConfig: {
        concurrentRequests: 10,
        totalRequests: 100,
        rampUpTime: 5,
        duration: 30,
      },
      stressTestResults: null,
      
      // Traffic Logs
      trafficLogs: [],
      trafficStats: {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0,
        requestsPerSecond: 0,
      },
      
      // Scenarios
      scenarios: [],
      activeScenario: null,
      
      // UI State
      isGenerating: false,
      isCopying: false,
      activeTab: 'config',
      isFullscreen: false,
      themeMode: 'dark', // 'dark' (Midnight Pro), 'obsidian' (OLED Black), 'glass' (Cyber Glass)
      cursorMode: 'website', // 'website' (Precision Website Cursor - Windows cursor hidden) or 'system' (OS Default)
      
      // Generator State
      generatorType: 'users',
      generatorFormat: 'json',
      generatorCount: 50,
      generatorData: '',
      
      // Advanced Features
      isRecording: false,
      recordedTraffic: [],
      webhookUrl: '',
      isWebhookEnabled: false,
      
      // Actions
      setGeneratorType: (type) => set({ generatorType: type }),
      setGeneratorFormat: (format) => set({ generatorFormat: format }),
      setGeneratorCount: (count) => set({ generatorCount: count }),
      setGeneratorData: (data) => set({ generatorData: data }),
      
      setBackendUrl: (url) => set({ backendUrl: url }),
      setProxyUrl: (url) => set({ proxyUrl: url }),
      setProxyId: (id) => set({ proxyId: id }),
      setIsProxyActive: (active) => set({ isProxyActive: active }),
      setLatency: (latency) => {
        const state = get();
        const update = { latency };
        const profiles = {
          'fast-wifi': { latency: 0, failureRate: 0 },
          '4g': { latency: 100, failureRate: 5 },
          '3g': { latency: 300, failureRate: 10 },
          '2g': { latency: 800, failureRate: 20 },
          'satellite': { latency: 1500, failureRate: 25 },
        };
        const currentProfile = state.networkProfile;
        if (currentProfile !== 'custom' && profiles[currentProfile]) {
          if (profiles[currentProfile].latency !== latency) {
            update.networkProfile = 'custom';
          }
        }
        set(update);
      },
      setErrorCode: (code) => set({ errorCode: code }),
      setFailureRate: (rate) => {
        const state = get();
        const update = { failureRate: rate };
        const profiles = {
          'fast-wifi': { latency: 0, failureRate: 0 },
          '4g': { latency: 100, failureRate: 5 },
          '3g': { latency: 300, failureRate: 10 },
          '2g': { latency: 800, failureRate: 20 },
          'satellite': { latency: 1500, failureRate: 25 },
        };
        const currentProfile = state.networkProfile;
        if (currentProfile !== 'custom' && profiles[currentProfile]) {
          if (profiles[currentProfile].failureRate !== rate) {
            update.networkProfile = 'custom';
          }
        }
        set(update);
      },
      setRateLimit: (limit) => set({ rateLimit: limit }),
      setNetworkProfile: (profile) => {
        const profiles = {
          'fast-wifi': { latency: 0, failureRate: 0 },
          '4g': { latency: 100, failureRate: 5 },
          '3g': { latency: 300, failureRate: 10 },
          '2g': { latency: 800, failureRate: 20 },
          'satellite': { latency: 1500, failureRate: 25 },
        };
        if (profile !== 'custom' && profiles[profile]) {
          set({
            networkProfile: profile,
            latency: profiles[profile].latency,
            failureRate: profiles[profile].failureRate
          });
        } else {
          set({ networkProfile: profile });
        }
      },
      setPayloadMultiplier: (multiplier) => set({ payloadMultiplier: multiplier }),
      setPayloadSize: (size) => set({ payloadSize: size }),
      
      setSchemaMutations: (mutations) => set({ schemaMutations: mutations }),
      addRemoveField: (field) => set((state) => ({
        schemaMutations: {
          ...state.schemaMutations,
          removeFields: [...state.schemaMutations.removeFields, field]
        }
      })),
      removeRemoveField: (field) => set((state) => ({
        schemaMutations: {
          ...state.schemaMutations,
          removeFields: state.schemaMutations.removeFields.filter(f => f !== field)
        }
      })),
      
      setStressTestActive: (active) => set({ stressTestActive: active }),
      setStressTestConfig: (config) => set({ stressTestConfig: { ...get().stressTestConfig, ...config } }),
      setStressTestResults: (results) => set({ stressTestResults: results }),
      
      addTrafficLog: (log) => set((state) => {
        const newLogs = [log, ...state.trafficLogs].slice(0, 200);
        // Update stats
        const stats = { ...state.trafficStats };
        stats.total++;
        if (log.status < 400) stats.success++;
        else stats.errors++;
        stats.avgResponseTime = Math.round(
          newLogs.reduce((acc, l) => acc + parseInt(l.responseTime || 0), 0) / newLogs.length
        );
        return { 
          trafficLogs: newLogs,
          trafficStats: stats
        };
      }),
      
      clearTrafficLogs: () => set({ 
        trafficLogs: [],
        trafficStats: { total: 0, success: 0, errors: 0, avgResponseTime: 0, requestsPerSecond: 0 }
      }),
      
      addScenario: (scenario) => set((state) => ({
        scenarios: [...state.scenarios, scenario]
      })),
      
      removeScenario: (id) => set((state) => ({
        scenarios: state.scenarios.filter(s => s.id !== id)
      })),
      
      setActiveScenario: (id) => set({ activeScenario: id }),
      
      loadScenario: (id) => {
        const state = get();
        const scenario = state.scenarios.find(s => s.id === id);
        if (scenario) {
          set({
            latency: scenario.latency || 0,
            errorCode: scenario.errorCode || 'none',
            failureRate: scenario.failureRate || 0,
            rateLimit: scenario.rateLimit || 'none',
            networkProfile: scenario.networkProfile || 'custom',
            payloadMultiplier: scenario.payloadMultiplier || 1,
            activeScenario: id,
          });
        }
      },
      
      reset: () => set({
        backendUrl: '',
        proxyUrl: '',
        isProxyActive: false,
        proxyId: null,
        latency: 0,
        errorCode: 'none',
        failureRate: 0,
        rateLimit: 'none',
        networkProfile: 'custom',
        payloadMultiplier: 1,
        trafficLogs: [],
        trafficStats: { total: 0, success: 0, errors: 0, avgResponseTime: 0, requestsPerSecond: 0 },
        activeScenario: null,
        stressTestActive: false,
        stressTestResults: null,
      }),
      
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setIsCopying: (copying) => set({ isCopying: copying }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleThemeMode: () => set((state) => {
        const nextTheme = state.themeMode === 'dark' ? 'obsidian' : state.themeMode === 'obsidian' ? 'glass' : 'dark';
        return { themeMode: nextTheme };
      }),
      setCursorMode: (mode) => set({ cursorMode: mode }),
      toggleCursorMode: () => set((state) => ({ cursorMode: state.cursorMode === 'website' ? 'system' : 'website' })),
      
      setIsRecording: (recording) => set({ isRecording: recording }),
      addRecordedTraffic: (log) => set((state) => ({
        recordedTraffic: [...state.recordedTraffic, log]
      })),
      clearRecordedTraffic: () => set({ recordedTraffic: [] }),
      
      setWebhookUrl: (url) => set({ webhookUrl: url }),
      setIsWebhookEnabled: (enabled) => set({ isWebhookEnabled: enabled }),
    }),
    {
      name: 'mock-funclexa-storage',
      partialize: (state) => ({
        backendUrl: state.backendUrl,
        proxyUrl: state.proxyUrl,
        proxyId: state.proxyId,
        isProxyActive: state.isProxyActive,
        scenarios: state.scenarios,
        latency: state.latency,
        errorCode: state.errorCode,
        failureRate: state.failureRate,
        rateLimit: state.rateLimit,
        networkProfile: state.networkProfile,
        payloadMultiplier: state.payloadMultiplier,
        schemaMutations: state.schemaMutations,
        trafficLogs: state.trafficLogs,
        trafficStats: state.trafficStats,
        webhookUrl: state.webhookUrl,
        isWebhookEnabled: state.isWebhookEnabled,
        themeMode: state.themeMode,
        cursorMode: state.cursorMode,
      }),
    }
  )
);
