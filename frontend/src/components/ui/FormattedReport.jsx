import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Copy, Check } from 'lucide-react';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function FormattedReport({ content, className = '' }) {
  const [copied, setCopied] = React.useState(false);

  const cleanHtml = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content);
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'class'],
        FORBID_TAGS: ['script', 'style', 'iframe'],
      });
    } catch (e) {
      console.error('Failed to parse report markdown:', e);
      return content;
    }
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`formatted-report-container relative group/report ${className}`}>
      {/* Quick Copy Button */}
      {content && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover/report:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 z-10 backdrop-blur-md"
          title="Copy raw report"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      )}

      <div
        className="report-prose text-xs text-slate-200 leading-relaxed space-y-2.5 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    </div>
  );
}
