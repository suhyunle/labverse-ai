import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Sparkles, ArrowRight, Flame, Globe, Droplets, Atom, Compass, Layers, CheckCircle } from 'lucide-react';
import { sound } from '../lib/audio';

interface LandingHeroProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  loadingStep: string;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSearch,
  isLoading,
  loadingStep,
}) => {
  const [query, setQuery] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Background 3D Floating Relic/Atom Universe
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Three atomic gimbal rings
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(3.6 + i * 0.9, 0.04, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00f0ff : i === 1 ? 0x818cf8 : 0xa855f7,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = (i * Math.PI) / 3;
      ring.rotation.y = (i * Math.PI) / 4;
      scene.add(ring);
      rings.push(ring);
    }

    // Orbital particles
    const pCount = 300;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const r = 4.5 + Math.random() * 4.5;
      pPos[i * 3 + 0] = r * Math.cos(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi);
      pPos[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      core.rotation.y += 0.005;
      core.rotation.x += 0.003;
      rings[0].rotation.z += 0.008;
      rings[1].rotation.x += 0.006;
      rings[2].rotation.y += 0.007;
      particles.rotation.y -= 0.003;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    sound.playClick();
    onSearch(query.trim());
  };

  const handleChipClick = (suggestion: string) => {
    sound.playClick();
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const sampleSuggestions = [
    { label: '🌋 화산은 왜 폭발할까?', query: '화산은 왜 폭발할까? 마그마 압력과 가스 분출' },
    { label: '🪐 태양계에서 지구와 달의 움직임', query: '태양계에서 지구와 달의 움직임을 보고 싶어' },
    { label: '⚖️ 물체가 물에 뜨고 가라앉는 원리', query: '물체가 물에 뜨고 가라앉는 원리는? 아르키메데스 부력' },
    { label: '🌌 지구의 중력이 절반으로 줄어들면?', query: '지구의 중력이 절반으로 줄어들면 행성 궤도는 어떻게 변해?' },
    { label: '🧪 식초와 베이킹소다가 반응하면?', query: '식초와 베이킹소다가 만나면 왜 거품이 일어날까?' },
  ];

  const featuredCards = [
    {
      title: '화산 마그마 역학 실험실',
      desc: '지하 마그마 방 압력, 휘발성 가스 함량, 화도 저항을 조절하여 플리니식 대폭발과 30km 분연주를 유도하세요.',
      icon: Flame,
      color: 'from-orange-500 to-rose-600',
      tag: '지구과학 · 열역학',
      query: '화산은 왜 폭발할까?',
    },
    {
      title: '태양계 천체 궤도 실험실',
      desc: '케플러 궤도 역학을 기반으로 중력 상수, 지구 공전 속도, 달 거리를 조절하며 기조력과 사계절을 탐구하세요.',
      icon: Globe,
      color: 'from-blue-500 to-cyan-500',
      tag: '천문학 · 만유인력',
      query: '태양계에서 지구와 달의 움직임을 보고 싶어.',
    },
    {
      title: '아르키메데스 부력 실험실',
      desc: '유체(수은, 물, 기름)와 물체 밀도를 조절하고 중력 가속도를 바꾸며 부력 벡터와 침수율을 계산하세요.',
      icon: Droplets,
      color: 'from-emerald-500 to-teal-500',
      tag: '물리학 · 유체역학',
      query: '물체가 물에 뜨고 가라앉는 원리는?',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-12 overflow-hidden bg-slate-950 text-white">
      {/* 3D Floating Relic Canvas Background */}
      <div
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-40 md:opacity-60 z-0"
      />

      {/* Radial soft background lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>DEEPMIND AI HACKATHON · INTERACTIVE SCIENCE ENGINE</span>
        </div>

        {/* Vision Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
          상상하는 모든 과학적 호기심,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
            AI가 3D 실험실을 건설합니다.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-8 font-normal leading-relaxed">
          &ldquo;화산은 왜 폭발할까?&rdquo;, &ldquo;중력이 절반이라면?&rdquo; 무엇이든 물어보세요.
          <br className="hidden sm:inline" />
          Gemini 3.8 / 4 가 즉시 물리 법칙과 변수를 계산하여 인터랙티브 3D 세계를 생성합니다.
        </p>

        {/* Central Search Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl relative mb-6 group"
        >
          <div className="relative flex items-center rounded-2xl bg-slate-900/90 border border-cyan-500/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30 shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl transition duration-200 p-2">
            <div className="pl-3 pr-2 text-cyan-400">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="오늘은 무엇을 실험해 볼까? (예: 화산은 왜 폭발할까?)"
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base outline-none px-2 py-2"
            />

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <span>실험 생성</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Loading status panel if generating */}
        {isLoading && (
          <div className="w-full max-w-xl mx-auto p-4 mb-8 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-cyan-300 font-mono text-sm">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>{loadingStep || 'AI 실험 아키텍트가 가상 연구실을 설계 중입니다...'}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-3xl">
          <span className="text-xs text-slate-400 font-medium mr-1">추천 탐구 질문:</span>
          {sampleSuggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(item.query)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-900/70 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition cursor-pointer backdrop-blur-md"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Featured Deep-Dive Lab Cards */}
        <div className="w-full text-left">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 px-1 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>대표 3D 과학 실험실 둘러보기</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  onClick={() => handleChipClick(card.query)}
                  className="group relative p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 backdrop-blur-xl transition duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-cyan-950/40"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-slate-950 shadow-md`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-slate-700">
                        {card.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                      {card.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>실험실 입장하기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
