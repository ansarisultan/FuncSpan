import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useStore } from '../../store/useStore';

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { isFullscreen, themeMode } = useStore();

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        color: ['rgba(34,211,238,0.15)', 'rgba(59,130,246,0.12)', 'rgba(99,102,241,0.15)'][Math.floor(Math.random() * 3)]
      });
    }

    let mouse = { x: null, y: null };
    const handleGlobalMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connect to other nearby particles
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.07;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Connect to mouse
        if (mouse.x !== null && mouse.y !== null) {
          const mouseDist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (mouseDist < 200) {
            const alpha = (1 - mouseDist / 200) * 0.1;
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`flex h-screen overflow-hidden relative select-none transition-colors duration-700 ${
        themeMode === 'obsidian' 
          ? 'bg-[#000000] theme-obsidian' 
          : themeMode === 'glass' 
          ? 'bg-[#090e25] theme-glass' 
          : 'bg-[#050816] theme-midnight'
      }`}
      style={{ '--mouse-x': `${mousePosition.x}%`, '--mouse-y': `${mousePosition.y}%` }}
    >
      {/* Network Particle Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" />

      {/* Dynamic Ambient Glow lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {themeMode === 'glass' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] h-[45vh] rounded-full bg-gradient-to-b from-[#3b82f6]/18 via-[#6366f1]/6 to-transparent blur-[130px] pointer-events-none" />
        )}
        <div 
          className="absolute w-[50vw] h-[50vw] rounded-full blur-3xl transition-all duration-1000 opacity-70"
          style={{
            background: themeMode === 'glass' 
              ? 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)'
              : 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)',
            top: `${mousePosition.y * 0.3}%`,
            left: `${mousePosition.x * 0.3}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div 
          className="absolute w-[45vw] h-[45vw] rounded-full blur-3xl transition-all duration-700 opacity-55"
          style={{
            background: themeMode === 'glass'
              ? 'radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
            bottom: `${100 - mousePosition.y * 0.2}%`,
            right: `${100 - mousePosition.x * 0.2}%`,
            transform: 'translate(50%, 50%)',
          }}
        />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      {!isFullscreen && (
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64
          transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          lg:relative lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar onClose={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        {!isFullscreen && <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />}
        <main className={`flex-1 relative ${isFullscreen ? 'p-0 overflow-hidden h-screen' : 'p-4 lg:p-6 overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-3.5rem)]'}`}>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#050816]/50" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
