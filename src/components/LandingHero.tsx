import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  ArrowRight,
  Flame,
  Globe,
  Compass,
  Layers,
  FileText,
  Image,
  Scale,
  Sun,
  Droplet,
} from 'lucide-react';
import { sound } from '../lib/audio';
import { FEATURES, APP_NAME, APP_TAGLINE } from '../config/features';

interface LandingHeroProps {
  onSearch: (query: string) => void;
  onOpenPaperToLab: (doi?: string) => void;
  /** Loads the built-in verified free-fall lab instantly (no API call). */
  onQuickStart: (overrides?: Record<string, number>) => void;
  onOpenDiagramToLab: () => void;
  isLoading: boolean;
  loadingStep: string;
  errorMessage?: string | null;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSearch,
  onOpenPaperToLab,
  onQuickStart,
  onOpenDiagramToLab,
  isLoading,
  loadingStep,
  errorMessage,
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

  const DEMO_DOI = '10.1088/1361-6552/aa65da';

  // Chips never call the AI: the first two open the built-in verified lab immediately.
  const sampleSuggestions: { label: string; run: () => void }[] = [
    { label: '⚖️ 진공에서 깃털과 볼링공', run: () => onQuickStart() },
    { label: '🌬️ 공기저항이 있으면 무거운 공이 먼저 떨어질까?', run: () => onQuickStart({ airDensity: 1.2 }) },
    { label: '📄 논문으로 시작: Ferreira et al. (2017)', run: () => onOpenPaperToLab(DEMO_DOI) },
  ];

  const featuredCards = [
    {
      title: '갈릴레오-뉴턴 자유 낙하 실험실',
      desc: '진공과 공기 저항 환경에서 깃털, 볼링공의 낙하를 비교하고 종단 속도와 등가속도 운동을 검증합니다.',
      icon: Scale,
      color: 'from-cyan-500 to-blue-600',
      tag: '결정론적 역학',
      query: '진공에서 깃털과 볼링공의 자유 낙하',
      instant: true,
    },
    ...(FEATURES.otherLabs
      ? [
          { title: '스넬의 법칙 & 전반사 광학 벤치', desc: '입사각과 매질 굴절률을 조절하며 굴절각, 임계각 초과 시의 전반사를 관측합니다.', icon: Sun, color: 'from-indigo-500 to-purple-600', tag: '기하 광학', query: '스넬의 법칙과 전반사 임계각', instant: false },
          { title: '비혼화성 유체 밀도 기둥 실험실', desc: '밀도 차이에 의한 자연 성층화와 교반 후 분리를 분석합니다.', icon: Droplet, color: 'from-amber-500 to-orange-600', tag: '유체 정역학', query: '비혼화성 유체 성층화 및 밀도 기둥', instant: false },
          { title: '화산 마그마 열역학 실험실', desc: '마그마 방 압력과 가스 함량을 조절해 분화를 유도합니다.', icon: Flame, color: 'from-rose-500 to-red-600', tag: '지구물리학', query: '화산은 왜 폭발할까?', instant: false },
          { title: '태양계 천체 궤도 실험실', desc: '중력 상수와 공전 속도를 조절하며 기조력을 탐구합니다.', icon: Globe, color: 'from-blue-500 to-cyan-500', tag: '천문학', query: '태양계에서 지구와 달의 움직임', instant: false },
        ]
      : []),
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-5 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{APP_NAME} · {APP_TAGLINE}</span>
        </div>

        {/* Vision Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-3 leading-tight break-keep">
          논문에서 실험으로,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
            검증 가능한 AI 과학 실험실
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mb-6 font-normal leading-relaxed break-keep">
          실제 논문(DOI)이나 과학 질문을 입력하면 Crossref·OpenAlex에서 근거를 확인하고,
          자동 검증을 통과한 자유 낙하 실험실을 만들어 드립니다.
        </p>

        {/* Mode Switcher Buttons: Question vs Paper vs Diagram */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              sound.playClick();
              onOpenPaperToLab();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Paper-to-Lab (논문 변환)</span>
          </button>

{FEATURES.diagramToLab && (          <button
            onClick={() => {
              sound.playClick();
              onOpenDiagramToLab();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Image className="w-4 h-4 text-cyan-400" />
            <span>Diagram-to-Lab (도판 복원)</span>
          </button>)}
        </div>

        {/* Central Search Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl relative mb-4 group"
        >
          <div className="relative flex items-center rounded-2xl bg-slate-900/90 border border-cyan-500/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30 shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl transition duration-200 p-2">
            <div className="pl-3 pr-2 text-cyan-400">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과학 질문 또는 논문 DOI (예: 공기저항이 있으면 무거운 공이 먼저 떨어질까?)"
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base outline-none px-2 py-2"
            />

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <span>실험실 건설</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Loading status panel if generating */}
        {isLoading && (
          <div className="w-full max-w-xl mx-auto p-4 mb-6 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-cyan-300 font-mono text-sm">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>{loadingStep || 'AI 실험 아키텍트가 가상 연구실을 설계 중입니다...'}</span>
            </div>
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="w-full max-w-xl mx-auto p-3 mb-6 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm text-center">
            {errorMessage}
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-3xl">
          <span className="text-xs text-slate-400 font-medium mr-1">바로 시작:</span>
          {sampleSuggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                sound.playClick();
                item.run();
              }}
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
            <span>검증된 실험실</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {featuredCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  onClick={() => {
                    sound.playClick();
                    if (card.instant) onQuickStart();
                    else onSearch(card.query);
                  }}
                  className="group relative p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 backdrop-blur-xl transition duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-cyan-950/40"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-slate-950 shadow-md`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-slate-700">
                        {card.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">
                      {card.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>실험실 입장</span>
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
