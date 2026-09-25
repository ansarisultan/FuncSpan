import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

export default function CustomCursor() {
  const cursorMode = useStore(state => state.cursorMode || 'website');
  const cursorRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If system cursor is selected, remove custom-cursor-active and exit
    if (cursorMode === 'system') {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Suppress the default OS cursor across the website
    document.documentElement.classList.add('custom-cursor-active');

    const handlePointerMove = (e) => {
      // Ignore touch gestures
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (cursorRef.current) cursorRef.current.style.opacity = '0';
        return;
      }

      if (cursorRef.current) {
        // Direct GPU-accelerated transform with 0ms lag
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        if (!isVisible) setIsVisible(true);
      }
    };

    const handlePointerLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      setIsVisible(false);
    };

    const handlePointerEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
      setIsVisible(true);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;
      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.cursor-pointer') ||
        target.closest('[role="button"]') ||
        target.closest('.interactive');
      setIsHovering(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerenter', handlePointerEnter);
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerenter', handlePointerEnter);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cursorMode, isVisible]);

  // If system cursor mode, don't render custom cursor
  if (cursorMode === 'system') {
    return null;
  }

  // If device is strictly touch-only (coarse pointer)
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="fixed pointer-events-none z-[999999] will-change-transform"
      style={{
        left: 0,
        top: 0,
        transform: 'translate3d(-100px, -100px, 0)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Dynamic Aura Ring on Interactive Hover */}
      <div 
        className={`absolute -left-3.5 -top-3.5 w-8 h-8 rounded-full border border-cyan-400/80 bg-cyan-400/15 transition-all duration-200 pointer-events-none ${
          isHovering ? 'scale-125 opacity-100 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'scale-50 opacity-0'
        } ${isClicking ? 'scale-90 bg-cyan-400/30' : ''}`}
      />

      {/* Zero-Offset Pixel-Perfect Precision Cyber Pointer (Tip at 0,0) */}
      <div 
        className="relative transition-transform duration-75 origin-top-left"
        style={{
          transform: `scale(${isClicking ? 0.85 : isHovering ? 1.15 : 1})`,
        }}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter"
        >
          {/* Main Pointer Arrow with tip exactly at (0,0) */}
          <path
            d="M0 0L7.5 21L11.5 12L20.5 8L0 0Z"
            fill="url(#cyberCursorGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Glowing Accent Core */}
          <path
            d="M3 3.5L7.8 17L10.5 11L16.5 8.2L3 3.5Z"
            fill="#FFFFFF"
            fillOpacity="0.35"
          />
          <defs>
            <linearGradient id="cyberCursorGrad" x1="0" y1="0" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Mini Status Dot on Hover */}
        {isHovering && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
        )}
      </div>
    </div>
  );
}
