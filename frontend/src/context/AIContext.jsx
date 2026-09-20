import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';

const AIContext = createContext(null);

const SYSTEM_PROMPT = `You are LexaChat AI, an intelligent performance engineering and load testing analyst for the FuncSpan Network Testing Platform.

Your mission is to provide clear, human-readable, executive performance reports, diagnose backend bottlenecks, and advise developers on scaling.

REPORT FORMATTING RULES:
Whenever the user asks to explain, analyze, or generate a report on network traffic, latency, errors, or load testing:
You MUST format your analysis strictly as a clean, human-readable report in GitHub Flavored Markdown using these exact sections:

## 🎯 Executive Verdict
A 2-3 sentence executive assessment. State whether the URL passed, experienced mild degradation, or failed the test under current load conditions.

## 👥 URL Concurrent User Capacity
Directly answer: **How many people can access this URL at a time?**
- **Recommended Safe Concurrency**: e.g., ~X simultaneous active users (based on ~2.5s-3.5s typical user browsing intervals).
- **Peak Simultaneous Connections**: e.g., ~Y concurrent in-flight requests.
- **Performance Tier**: e.g., High Stability / Approaching Bottleneck / Critical Degradation.
- **SLA Boundary**: Estimated latency threshold before response exceeds 500ms or fails.

## 📊 Load & Performance Metrics
Provide a clean Markdown table summarizing the execution:
| Metric | Tested Value | Status / SLA Verdict |
| :--- | :--- | :--- |
| Target URL | \`{url}\` | Tested Endpoint |
| Concurrency | ... | Target Concurrency |
| Total Requests | ... | Completed |
| Throughput | ... req/s | Sustained |
| Avg Latency | ... ms | Normal / Elevated |
| P95 Latency | ... ms | SLA Boundary |
| Success Rate | ... % | Error-free |

## ⚠️ Bottlenecks & Anomaly Analysis
Identify any latency spikes, error codes (e.g. 500, 502, 503, 429), or payload issues observed during the run.

## 🚀 Actionable Optimization Recommendations
Numbered list of 3-4 concrete technical steps to increase concurrent user capacity (e.g., Redis caching, database indexing, horizontal scaling, rate limiting, connection pooling).

Always maintain an authoritative, developer-friendly, human-readable tone with bold highlights, tables, and bullet points.`;

export function AIProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [activeModel, setActiveModel] = useState('LexaChat AI');
  const abortControllerRef = useRef(null);

  const {
    backendUrl,
    proxyUrl,
    isProxyActive,
    latency,
    errorCode,
    failureRate,
    trafficLogs,
    stressTestConfig,
    stressTestResults
  } = useStore();

  const buildContext = useCallback(() => {
    let capacityInsight = '';
    if (stressTestResults) {
      const duration = stressTestConfig?.duration || 30;
      const rps = Math.round(((stressTestResults.totalSent || 100) * ((stressTestResults.successRate || 100) / 100)) / duration);
      const safeUsers = Math.max(1, Math.round(
        rps * 3.0 * ((stressTestResults.successRate || 100) / 100) * Math.min(1.0, 350 / Math.max(stressTestResults.avgLatency || 150, 50))
      ));
      capacityInsight = `
Load Test Execution Results:
- Target Tested URL: ${proxyUrl || backendUrl || 'Default Proxy URL'}
- Test Concurrency: ${stressTestConfig?.concurrentRequests || 10} concurrent threads
- Total Requests Sent: ${stressTestResults.totalSent}
- Test Duration: ${stressTestConfig?.duration || 30} seconds
- Sustained Throughput: ${rps} req/s
- Average Latency: ${stressTestResults.avgLatency}ms
- P95 Latency: ${stressTestResults.p95Latency}ms
- Success Rate: ${stressTestResults.successRate}%
- Error Count: ${stressTestResults.errors}
- Calculated Safe Concurrent User Capacity: ~${safeUsers} active users simultaneously
`;
    }

    return `
Current Network Configuration:
- Backend Target URL: ${backendUrl || 'Not set'}
- Active Proxy URL: ${proxyUrl || 'Not generated'}
- Proxy Status: ${isProxyActive ? 'Active' : 'Inactive'}
- Injected Latency: ${latency}ms
- Simulated Error Code: ${errorCode === 'none' ? 'None' : errorCode}
- Injected Failure Rate: ${failureRate}%
- Total Captured Traffic Logs: ${trafficLogs.length}
${capacityInsight}
`;
  }, [backendUrl, proxyUrl, isProxyActive, latency, errorCode, failureRate, trafficLogs, stressTestConfig, stressTestResults]);

  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return;

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      const errorMsg = 'Groq API key not configured. Please add VITE_GROQ_API_KEY to your environment variables.';
      setError(errorMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setError(null);

    const userMsg = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);

    const context = buildContext();
    const systemPrompt = SYSTEM_PROMPT + context;

    // Primary requested model is gpt-20b ('openai/gpt-oss-20b') with fallback cascade
    const modelCandidates = [
      'openai/gpt-oss-20b',
      'gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
      userMsg,
    ];

    let lastError = null;
    let assistantMessage = null;

    for (const candidateModel of modelCandidates) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: candidateModel,
            messages: apiMessages,
            temperature: 0.6,
            max_tokens: 1500,
            stream: false,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || `API error: ${response.status}`;
          // If model is not found, try next candidate
          if (response.status === 400 || response.status === 404 || errMsg.toLowerCase().includes('model')) {
            console.warn(`Model ${candidateModel} unavailable, trying fallback...`, errMsg);
            lastError = new Error(errMsg);
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        assistantMessage = data.choices[0]?.message?.content || 'Report generation completed.';
        setActiveModel('LexaChat AI');
        break; // Success
      } catch (err) {
        if (err.name === 'AbortError') return;
        lastError = err;
      }
    }

    try {
      if (assistantMessage) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

        try {
          localStorage.setItem('funcspan_chat_history', JSON.stringify(
            [...messages, userMsg, { role: 'assistant', content: assistantMessage }].slice(-50)
          ));
        } catch (e) {}
      } else {
        throw lastError || new Error('Could not process request across available models.');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setError(error.message);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Something went wrong. Please try again.'}` 
      }]);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [messages, buildContext]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('funcspan_chat_history');
    localStorage.removeItem('mock_funclexa_chat_history');
  }, []);

  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem('funcspan_chat_history') || localStorage.getItem('mock_funclexa_chat_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed);
      }
    } catch (e) {}
  }, []);

  const quickActions = {
    'audit capacity': 'Analyze how many people can access this URL at a time and generate a full performance report.',
    'stress test analysis': 'Review my latest load testing results and explain any latency or error bottlenecks.',
    'generate proxy': 'Enter your backend URL in the Configuration panel and click "Generate Proxy" to create your mock URL.',
    'simulate latency': 'Use the Network Controls panel to add latency. Choose from presets or set custom values.',
    'inject errors': 'Select an error code from the Error Injection section to simulate backend failures.',
    'help': 'I can help with:\n• URL concurrent user capacity analysis\n• Load testing & stress test reports\n• Latency and bottleneck diagnosis\n• Proxy routing and configuration\n\nWhat would you like me to analyze?',
  };

  return (
    <AIContext.Provider value={{
      messages,
      isProcessing,
      error,
      activeModel,
      sendMessage,
      clearHistory,
      loadHistory,
      quickActions,
      buildContext,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
