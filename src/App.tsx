import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { VariableControls } from './components/VariableControls';
import { TelemetryDisplay } from './components/TelemetryDisplay';
import { ScientistCompanion } from './components/ScientistCompanion';
import { GuidedSteps } from './components/GuidedSteps';
import { LabNotebookModal } from './components/LabNotebookModal';
import { ParallelUniverseMode } from './components/ParallelUniverseMode';
import { HypothesisArena } from './components/HypothesisArena';
import { EvidenceLens } from './components/EvidenceLens';
import { ResearchTree } from './components/ResearchTree';
import { PaperToLabModal } from './components/PaperToLabModal';
import { DiagramToLabModal } from './components/DiagramToLabModal';

import { GravitySimulation } from './simulations/GravitySimulation';
import { OpticsSimulation } from './simulations/OpticsSimulation';
import { FluidSimulation } from './simulations/FluidSimulation';
import { VolcanoSimulation } from './simulations/VolcanoSimulation';
import { SolarSystemSimulation } from './simulations/SolarSystemSimulation';
import { BuoyancySimulation } from './simulations/BuoyancySimulation';
import { ConceptualSimulation } from './simulations/ConceptualSimulation';

import { ExperimentSpec, ExperimentSnapshot, ResearchTreeNode, LearningLevel } from './types';
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
  const [learningLevel, setLearningLevel] = useState<LearningLevel>('intermediate');

  // Modals state
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isParallelUniverseOpen, setIsParallelUniverseOpen] = useState<boolean>(false);
  const [isHypothesisArenaOpen, setIsHypothesisArenaOpen] = useState<boolean>(false);
  const [isEvidenceLensOpen, setIsEvidenceLensOpen] = useState<boolean>(false);
  const [isResearchTreeOpen, setIsResearchTreeOpen] = useState<boolean>(false);
  const [isPaperToLabOpen, setIsPaperToLabOpen] = useState<boolean>(false);
  const [isDiagramToLabOpen, setIsDiagramToLabOpen] = useState<boolean>(false);

  // Snapshots
  const [snapshots, setSnapshots] = useState<ExperimentSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('genesis_lab_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Research Branching Tree
  const [researchNodes, setResearchNodes] = useState<ResearchTreeNode[]>(() => {
    try {
      const saved = localStorage.getItem('genesis_lab_research_nodes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('genesis_lab_snapshots', JSON.stringify(snapshots));
    } catch {}
  }, [snapshots]);

  useEffect(() => {
    try {
      localStorage.setItem('genesis_lab_research_nodes', JSON.stringify(researchNodes));
    } catch {}
  }, [researchNodes]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Plan or synthesize experiment
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

      loadExperimentSpec(data.experiment);
    } catch (err) {
      console.error('Experiment planning error:', err);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const loadExperimentSpec = (exp: ExperimentSpec) => {
    const initialVars: Record<string, number> = {};
    exp.variables.forEach((v) => {
      initialVars[v.id] = v.default;
    });

    setCurrentExperiment(exp);
    setVariables(initialVars);
    setLiveMetrics({});
    setCameraPreset(exp.sceneType === 'volcano' ? 'cross_section' : 'default');
    setShowCrossSection(true);

    // Create Root Research Tree Node if tree is empty or new topic
    const newNode: ResearchTreeNode = {
      id: `node-${Date.now()}`,
      parentId: currentNodeId,
      label: exp.title,
      sceneType: exp.sceneType,
      variables: initialVars,
      metrics: {},
      timestamp: Date.now(),
    };
    setResearchNodes((prev) => [newNode, ...prev]);
    setCurrentNodeId(newNode.id);

    sound.playEureka();
  };

  const handleChangeVariable = (id: string, value: number) => {
    if (!currentExperiment) return;
    const spec = currentExperiment.variables.find((v) => v.id === id);
    let clamped = value;
    if (spec) {
      clamped = Math.max(spec.min, Math.min(spec.max, value));
    }
    setVariables((prev) => ({ ...prev, [id]: clamped }));
  };

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

  const handleResetVariables = () => {
    if (!currentExperiment) return;
    const defaults: Record<string, number> = {};
    currentExperiment.variables.forEach((v) => {
      defaults[v.id] = v.default;
    });
    setVariables(defaults);
    setCameraPreset(currentExperiment.sceneType === 'volcano' ? 'cross_section' : 'default');
  };

  // Snapshot handling
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

  const handleRestoreSnapshot = (snap: ExperimentSnapshot) => {
    setVariables({ ...snap.variables });
    sound.playClick();
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  // Research Tree Branching
  const handleForkNode = (label: string, hypothesis?: string) => {
    if (!currentExperiment) return;
    const newNode: ResearchTreeNode = {
      id: `node-${Date.now()}`,
      parentId: currentNodeId,
      label,
      sceneType: currentExperiment.sceneType,
      variables: { ...variables },
      metrics: { ...liveMetrics },
      hypothesis,
      timestamp: Date.now(),
    };
    setResearchNodes((prev) => [newNode, ...prev]);
    setCurrentNodeId(newNode.id);
    sound.playEureka();
  };

  const handleSelectTreeNode = (node: ResearchTreeNode) => {
    setVariables({ ...node.variables });
    setCurrentNodeId(node.id);
    sound.playClick();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Header */}
      <Header
        currentExperiment={currentExperiment}
        onNewExperiment={() => setCurrentExperiment(null)}
        onResetVariables={handleResetVariables}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenPaperToLab={() => setIsPaperToLabOpen(true)}
        onOpenParallelUniverse={() => setIsParallelUniverseOpen(true)}
        onOpenHypothesisArena={() => setIsHypothesisArenaOpen(true)}
        onOpenEvidenceLens={() => setIsEvidenceLensOpen(true)}
        onOpenResearchTree={() => setIsResearchTreeOpen(true)}
        snapshotCount={snapshots.length}
        learningLevel={learningLevel}
        onChangeLearningLevel={setLearningLevel}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main View: Landing vs 3D/Canvas Laboratory */}
      {!currentExperiment ? (
        <LandingHero
          onSearch={handlePlanExperiment}
          onOpenPaperToLab={() => setIsPaperToLabOpen(true)}
          onOpenDiagramToLab={() => setIsDiagramToLabOpen(true)}
          isLoading={isLoading}
          loadingStep={loadingStep}
        />
      ) : (
        <main className="relative w-full h-full pt-14">
          {/* Central Active Simulation Canvas */}
          <div className="absolute inset-0 top-14 z-10">
            {currentExperiment.sceneType === 'gravity' && (
              <GravitySimulation
                variables={variables}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

            {currentExperiment.sceneType === 'optics' && (
              <OpticsSimulation
                variables={variables}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

            {currentExperiment.sceneType === 'fluid' && (
              <FluidSimulation
                variables={variables}
                onUpdateMetrics={setLiveMetrics}
              />
            )}

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

          {/* Parallel Universe Modal (Split-Screen) */}
          <ParallelUniverseMode
            isOpen={isParallelUniverseOpen}
            onClose={() => setIsParallelUniverseOpen(false)}
            experimentSpec={currentExperiment}
            currentVariables={variables}
          />

          {/* Hypothesis Arena Modal */}
          <HypothesisArena
            isOpen={isHypothesisArenaOpen}
            onClose={() => setIsHypothesisArenaOpen(false)}
            experimentSpec={currentExperiment}
            currentVariables={variables}
            liveMetrics={liveMetrics}
            onApplyFollowUpVariables={handleApplyVariableUpdates}
          />

          {/* Evidence Lens Modal */}
          <EvidenceLens
            isOpen={isEvidenceLensOpen}
            onClose={() => setIsEvidenceLensOpen(false)}
            evidenceItems={currentExperiment.evidenceItems}
          />

          {/* Branching Research Tree Modal */}
          <ResearchTree
            nodes={researchNodes}
            currentNodeId={currentNodeId}
            isOpen={isResearchTreeOpen}
            onClose={() => setIsResearchTreeOpen(false)}
            onForkNode={handleForkNode}
            onSelectNode={handleSelectTreeNode}
          />

          {/* Paper-to-Lab Modal */}
          <PaperToLabModal
            isOpen={isPaperToLabOpen}
            onClose={() => setIsPaperToLabOpen(false)}
            onSynthesizeExperiment={loadExperimentSpec}
          />

          {/* Diagram-to-Lab Modal */}
          <DiagramToLabModal
            isOpen={isDiagramToLabOpen}
            onClose={() => setIsDiagramToLabOpen(false)}
            onSynthesizeExperiment={loadExperimentSpec}
          />
        </main>
      )}
    </div>
  );
}
