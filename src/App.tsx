import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { VariableControls } from './components/VariableControls';
import { TelemetryDisplay } from './components/TelemetryDisplay';
import { ScientistCompanion } from './components/ScientistCompanion';
import { GuidedSteps } from './components/GuidedSteps';
import { LabNotebookModal } from './components/LabNotebookModal';
import { VolcanoSimulation } from './simulations/VolcanoSimulation';
import { SolarSystemSimulation } from './simulations/SolarSystemSimulation';
import { BuoyancySimulation } from './simulations/BuoyancySimulation';
import { ConceptualSimulation } from './simulations/ConceptualSimulation';
import { ExperimentSpec, ExperimentSnapshot } from './types';
import { sound } from './lib/audio';

export default function App() {
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentSpec | null>(null);
  const [variables, setVariables] = useState<Record<string, number>>({});
  const [liveMetrics, setLiveMetrics] = useState<Record<string, number | string>>({});
  const [cameraPreset, setCameraPreset] = useState<string>('default');
  const [showCrossSection, setShowCrossSection] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const [snapshots, setSnapshots] = useState<ExperimentSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('science_universe_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync snapshot changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('science_universe_snapshots', JSON.stringify(snapshots));
    } catch {}
  }, [snapshots]);

  // Audio mute toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // 1. AI Experiment Planner action
  const handlePlanExperiment = async (query: string) => {
    setIsLoading(true);
    setLoadingStep('1. 질문 의도 및 물리 법칙 해석 중...');

    const timer1 = setTimeout(() => {
      setLoadingStep('2. 3D 실험 환경 모델 및 조작 변인 산출 중...');
    }, 600);

    const timer2 = setTimeout(() => {
      setLoadingStep('3. 렌더링 파이프라인 및 인터랙티브 셰이더 구축 중...');
    }, 1200);

    try {
      const res = await fetch('/api/plan-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!data.experiment) throw new Error('Invalid experiment specification');

      const exp: ExperimentSpec = data.experiment;

      // Initialize variables from spec defaults
      const initialVars: Record<string, number> = {};
      exp.variables.forEach((v) => {
        initialVars[v.id] = v.default;
      });

      setCurrentExperiment(exp);
      setVariables(initialVars);
      setLiveMetrics({});
      setCameraPreset(exp.sceneType === 'volcano' ? 'cross_section' : 'default');
      setShowCrossSection(true);

      sound.playEureka();
    } catch (err) {
      console.error('Experiment planning error:', err);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // 2. Change a single variable with bounds check
  const handleChangeVariable = (id: string, value: number) => {
    if (!currentExperiment) return;
    const spec = currentExperiment.variables.find((v) => v.id === id);
    let clamped = value;
    if (spec) {
      clamped = Math.max(spec.min, Math.min(spec.max, value));
    }
    setVariables((prev) => ({ ...prev, [id]: clamped }));
  };

  // 3. Batch apply variables from Dr. Nova AI Scientist
  const handleApplyVariableUpdates = (updates: Record<string, number>) => {
    if (!currentExperiment) return;
    setVariables((prev) => {
      const next = { ...prev };
      Object.entries(updates).forEach(([id, val]) => {
        const spec = currentExperiment.variables.find((v) => v.id === id);
        if (spec) {
          next[id] = Math.max(spec.min, Math.min(spec.max, val));
        } else {
          next[id] = val;
        }
      });
      return next;
    });
  };

  // 4. Reset variables to defaults
  const handleResetVariables = () => {
    if (!currentExperiment) return;
    const defaults: Record<string, number> = {};
    currentExperiment.variables.forEach((v) => {
      defaults[v.id] = v.default;
    });
    setVariables(defaults);
    setCameraPreset(currentExperiment.sceneType === 'volcano' ? 'cross_section' : 'default');
  };

  // 5. Take Snapshot
  const handleTakeSnapshot = (label?: string) => {
    if (!currentExperiment) return;
    const newSnapshot: ExperimentSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      label: label || `${currentExperiment.title.slice(0, 15)} - ${new Date().toLocaleTimeString()}`,
      variables: { ...variables },
      metrics: { ...liveMetrics },
    };
    setSnapshots((prev) => [newSnapshot, ...prev]);
    sound.playEureka();
  };

  // 6. Restore Snapshot
  const handleRestoreSnapshot = (snap: ExperimentSnapshot) => {
    setVariables({ ...snap.variables });
    sound.playClick();
  };

  // 7. Delete Snapshot
  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  // 8. Go back to Landing
  const handleNewExperiment = () => {
    setCurrentExperiment(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Header */}
      <Header
        currentExperiment={currentExperiment}
        onNewExperiment={handleNewExperiment}
        onResetVariables={handleResetVariables}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        snapshotCount={snapshots.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main View: Landing vs 3D Laboratory */}
      {!currentExperiment ? (
        <LandingHero
          onSearch={handlePlanExperiment}
          isLoading={isLoading}
          loadingStep={loadingStep}
        />
      ) : (
        <main className="relative w-full h-full pt-14">
          {/* Central 3D Simulation Canvas */}
          <div className="absolute inset-0 top-14 z-10">
            {currentExperiment.sceneType === 'volcano' && (
              <VolcanoSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                showCrossSection={showCrossSection}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

            {currentExperiment.sceneType === 'solar_system' && (
              <SolarSystemSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

            {currentExperiment.sceneType === 'buoyancy' && (
              <BuoyancySimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

            {currentExperiment.sceneType === 'conceptual' && (
              <ConceptualSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={setLiveMetrics}
              />
            )}
          </div>

          {/* Real-time Telemetry HUD (Top-right) */}
          <TelemetryDisplay
            metrics={liveMetrics}
            observableSpecs={currentExperiment.observableOutputs}
            principles={currentExperiment.scientificPrinciples}
            safetyNotes={currentExperiment.safetyNotes}
          />

          {/* AI Scientist Companion (Dr. Nova) */}
          <ScientistCompanion
            experimentSpec={currentExperiment}
            currentVariables={variables}
            liveMetrics={liveMetrics}
            onApplyVariableUpdates={handleApplyVariableUpdates}
          />

          {/* Guided Steps & Learning Objectives (Bottom-left) */}
          <GuidedSteps
            learningObjectives={currentExperiment.learningObjectives}
            guidedSteps={currentExperiment.guidedSteps}
            currentVariables={variables}
          />

          {/* Sleek Collapsible Variable Control Dock (Bottom-center) */}
          <VariableControls
            variables={currentExperiment.variables}
            values={variables}
            sceneType={currentExperiment.sceneType}
            onChangeVariable={handleChangeVariable}
            cameraPreset={cameraPreset}
            onSelectCameraPreset={setCameraPreset}
            showCrossSection={showCrossSection}
            onToggleCrossSection={() => setShowCrossSection(!showCrossSection)}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />

          {/* Lab Notebook & Snapshot Comparator Modal */}
          <LabNotebookModal
            isOpen={isNotebookOpen}
            onClose={() => setIsNotebookOpen(false)}
            snapshots={snapshots}
            onTakeSnapshot={handleTakeSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
        </main>
      )}
    </div>
  );
}
