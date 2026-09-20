import { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, Zap, Loader2, 
  MessageCircle, Clock, Star, HardDrive,
  Layers, Palette, Wand2, Download,
  Settings, User, Shield, Globe,
  ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import FormattedReport from '../ui/FormattedReport';

export default function AIAssistant({ isOpen, onClose }) {
  const { messages, isProcessing, sendMessage, clearHistory, quickActions, activeModel } = useAI();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, input]);

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleQuickAction = (action) => {
    const response = quickActions[action];
    if (response) {
      const userMessage = `Help me with: ${action}`;
      sendMessage(userMessage);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div className="panel-3d max-w-2xl w-full max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)] animate-float-slow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gradient-cyber">LexaChat AI</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                {isProcessing ? 'Analyzing report...' : 'Performance Analyst Ready'}
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  LexaChat Online
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-slate-400 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                Clear
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">How can I help you?</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2">
                I'm your AI assistant for FuncSpan. Ask me about proxy configuration,
                network simulation, stress testing, or any feature.
              </p>
              
              {showQuickActions && (
                <div className="mt-6 w-full max-w-md">
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1 mx-auto"
                  >
                    <ChevronUp className="w-3 h-3" /> Hide suggestions
                  </button>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.keys(quickActions).map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className="text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm text-slate-300 hover:text-white border border-white/5 hover:border-white/10"
                      >
                        <span className="capitalize">{action}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary-500 to-secondary-500'
                      : 'bg-gradient-to-br from-warm-500/20 to-accent-500/20'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-warm-400" />
                  )}
                </div>
                <div
                  className={`flex-1 min-w-0 ${
                    msg.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block p-3.5 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-white'
                        : 'bg-slate-900/90 text-slate-200 border border-white/10 w-full'
                    } max-w-[95%]`}
                  >
                    {msg.role === 'user' ? (
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <FormattedReport content={msg.content} />
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="mt-1 text-[10px] text-slate-500 hover:text-primary-400 transition flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex items-center gap-3 text-slate-400 p-2 rounded-xl bg-slate-900/50 border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-warm-500/20 to-accent-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-warm-400" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs">Generating human-readable report...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about load testing, URL concurrency, bottlenecks..."
              disabled={isProcessing}
              className="flex-1 bg-[#0F172A]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-300"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="p-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="text-cyan-400 font-semibold font-mono">LexaChat AI</span>
              <span>• FuncLexa</span>
            </span>
            <span className="flex items-center gap-2">
              <span>⌘ + Enter to send</span>
              <span>•</span>
              <span>esc to close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
