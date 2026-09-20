import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

export default function CustomCursor() {
  const cursorMode = useStore(state => state.cursorMode || 'website');
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef(null);

  useEffect(() => {
    // If system cursor is selected, remove custom-cursor-active and exit
    if (cursorMode === 'system') {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Suppress the default Windows OS cursor across the website
    document.documentElement.classList.add('custom-cursor-active');

    const updatePosition = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!hasMoved) setHasMoved(true);

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setPosition(posRef.current);
          rafRef.current = null;
        });
      }
    };

    const updateHover = (e) => {
      const target = e.target;
      if (!target) return;
      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.cursor-pointer') ||
        target.closest('[role="button"]') ||
        target.closest('.interactive');
      setIsHovering(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', updatePosition, { passive: true });
    window.addEventListener('mouseover', updateHover, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseover', updateHover);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cursorMode, hasMoved]);

  // If system cursor mode, don't render custom cursor
  if (cursorMode === 'system') {
    return null;
  }

  // If touch device, don't show
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-[999999] will-change-transform"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity: hasMoved ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Dynamic Aura Ring on Interactive Hover */}
      <div 
        className={`absolute -left-3 -top-3 w-8 h-8 rounded-full border border-cyan-400/80 bg-cyan-400/10 transition-all duration-200 pointer-events-none ${
          isHovering ? 'scale-125 opacity-100 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'scale-50 opacity-0'
        } ${isClicking ? 'scale-90 bg-cyan-400/25' : ''}`}
      />

      {/* Prominent, Highly Visible Cyber Precision Arrow */}
      <div 
        className="relative transition-transform duration-75 origin-top-left"
        style={{
          transform: `scale(${isClicking ? 0.85 : isHovering ? 1.15 : 1})`,
        }}
      >
        <svg 
          width="26" 
          height="26" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter"
        >
          <path
            d="M3 2L9.5 21.5L13 13L21.5 9.5L3 2Z"
            fill="url(#cyberCursorGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner Accent Core */}
          <path
            d="M5.5 5.5L9.8 17.5L12 12L17.5 9.8L5.5 5.5Z"
            fill="#FFFFFF"
            fillOpacity="0.4"
          />
          <defs>
            <linearGradient id="cyberCursorGrad" x1="3" y1="2" x2="21.5" y2="21.5" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Mini Status Dot when Hovering */}
        {isHovering && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
        )}
      </div>
    </div>
  );
}
