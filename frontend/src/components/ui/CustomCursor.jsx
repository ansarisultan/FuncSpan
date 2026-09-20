import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

export default function CustomCursor() {
  const cursorMode = useStore(state => state.cursorMode || 'website');
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // If system cursor is selected, remove custom-cursor-active and exit
    if (cursorMode === 'system') {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Hide Windows OS default cursor across the website
    document.documentElement.classList.add('custom-cursor-active');

    const updatePosition = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setPosition(posRef.current);
          setIsVisible(true);
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
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.cursor-pointer') ||
        target.closest('[role="button"]') ||
        target.closest('.interactive');
      setIsHovering(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updatePosition, { passive: true });
    window.addEventListener('mouseover', updateHover, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseover', updateHover);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cursorMode]);

  // Don't render if system cursor mode or touch device
  if (cursorMode === 'system' || !isVisible || (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)) {
    return null;
  }

  return (
    <>
      {/* Precision Core Dot */}
      <div
        className="fixed pointer-events-none z-[99999] will-change-transform"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${isClicking ? 0.75 : isHovering ? 1.4 : 1})`,
          transition: 'transform 0.08s ease-out, opacity 0.15s ease',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.85)] ring-1 ring-white/50" />
      </div>

      {/* Subtle Micro-Ring */}
      <div
        className="fixed pointer-events-none z-[99998] will-change-transform"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${isClicking ? 0.8 : isHovering ? 1.5 : 1})`,
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
          opacity: isHovering ? 0.9 : 0.35,
        }}
      >
        <div className="w-7 h-7 rounded-full border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]" />
      </div>
    </>
  );
}
