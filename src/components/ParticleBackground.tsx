import { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  emotion: string;
  intensity: number;
}

export default function ParticleBackground({ emotion, intensity }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- Emoji Mapping based on Emotion ---
    const emotionEmojis: Record<string, string[]> = {
      calm: ['🌊', '☁️', '🍃'],
      tense: ['⚡', '💥', '🔥'],
      exciting: ['✨', '🎉', '🚀'],
      sad: ['💧', '🌧️', '🌑'],
      joyful: ['☀️', '🌸', '🎈'],
      mysterious: ['🔮', '🌌', '👁️'],
      neutral: ['⚪', '🔘', '🌫️']
    };

    const emojis = emotionEmojis[emotion] || emotionEmojis.neutral;
    const particleCount = Math.floor(20 + intensity * 30); // Reduced count for performance with text

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      emoji: string;
      fontSize: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (0.5 + intensity * 2),
        vy: (Math.random() - 0.5) * (0.5 + intensity * 2),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        fontSize: Math.random() * 20 + 10 + intensity * 10,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Move particle
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // --- DRAW EMOJI ---
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.font = `${particle.fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Intensity affects "glow" or opacity
        ctx.globalAlpha = 0.4 + (intensity * 0.4); 
        ctx.fillText(particle.emoji, 0, 0);
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [emotion, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }} // Ensure it stays behind the text but above the background
    />
  );
}
