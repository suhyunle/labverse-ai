import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

import { GravitySimulation, GravityRunResult } from './simulations/GravitySimulation';
import { OpticsSimulation } from './simulations/OpticsSimulation';
import { FluidSimulation } from './simulations/FluidSimulation';
import { VolcanoSimulation } from './simulations/VolcanoSimulation';
import { SolarSystemSimulation } from './simulations/SolarSystemSimulation';
import { BuoyancySimulation } from './simulations/BuoyancySimulation';
import { ConceptualSimulation } from './simulations/ConceptualSimulation';

import { ExperimentSpec, ExperimentSnapshot, ResearchTreeNode, LearningLevel } from './types';
import { sound } from './lib/audio';
import { verifyExperimentSpec } from './verification';
import { planExperiment, describePlanEvent } from './lib/planExperiment';

export default function App() {
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentSpec | null>(null);
  const [variables, setVariables] = useState<Record<string, number>>({});
  const [liveMetrics, setLiveMetrics] = useState<Record<string, number | string>>({});
  const [cameraPreset, setCameraPreset] = useState<string>('default');
  const [showCrossSection, setShowCrossSection] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [planError, setPlanError] = useState<string | null>(null);
  const [labNotice, setLabNotice] = useState<string | null>(null);
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

  // Simulations report metrics from effects; bail out when nothing changed so a
  // re-render cannot feed back into setState (root cause of "Maximum update depth").
  const handleUpdateMetrics = useCallback((next: Record<string, number | string>) => {
    setLiveMetrics((prev) => {
      const keys = Object.keys(next);
      if (keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])) return prev;
      return next;
    });
  }, []);

  const handleGravityRunComplete = useCallback((r: GravityRunResult) => {
    const [a, b] = r.bodies;
    setLiveMetrics({
      '물체 A 착지 시간': `${a.simLandingTime.toFixed(3)} 초`,
      '물체 B 착지 시간': `${b.simLandingTime.toFixed(3)} 초`,
      '물체 A 착지 속도': `${a.impactVelocity.toFixed(2)} m/s`,
      '물체 B 착지 속도': `${b.impactVelocity.toFixed(2)} m/s`,
      '진공 이론 낙하 시간': `${r.vacuumLandingTime.toFixed(3)} 초`,
    });
  }, []);

  // Real verification of the active experiment against the current variable values.
  const verification = useMemo(
    () => (currentExperiment?.sceneType === 'gravity' ? verifyExperimentSpec(currentExperiment, variables) : null),
    [currentExperiment, variables],
  );

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Plan an experiment: the server streams real progress (generate -> verify -> retry).
  const handlePlanExperiment = async (query: string) => {
    setIsLoading(true);
    setPlanError(null);
    setLoadingStep('요청을 서버로 보내는 중...');
    try {
      const result = await planExperiment({ query }, (e) => {
        const text = describePlanEvent(e);
        if (text) setLoadingStep(text);
      });
      setLoadingStep('실험실을 렌더링하는 중');
      loadExperimentSpec(result.experiment, result.notice);
    } catch (err: any) {
      console.error('Experiment planning error:', err);
      setPlanError(err?.message || '실험 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const loadExperimentSpec = (exp: ExperimentSpec, notice?: string) => {
    setLabNotice(notice ?? null);
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
          errorMessage={planError}
        />
      ) : (
        <main className="relative w-full h-full pt-14">
          {/* Central Active Simulation Canvas */}
          <div className="absolute inset-0 top-14 z-10">
            {currentExperiment.sceneType === 'gravity' && (
              <GravitySimulation
                variableSpecs={currentExperiment.variables}
                uiComponents={currentExperiment.uiComponents}
                notice={labNotice}
                variables={variables}
                verification={verification}
                onChangeVariable={handleChangeVariable}
                onRunComplete={handleGravityRunComplete}
              />
            )}

            {currentExperiment.sceneType === 'optics' && (
              <OpticsSimulation
                variables={variables}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}

            {currentExperiment.sceneType === 'fluid' && (
              <FluidSimulation
                variables={variables}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}

            {currentExperiment.sceneType === 'volcano' && (
              <VolcanoSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                showCrossSection={showCrossSection}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}

            {currentExperiment.sceneType === 'solar_system' && (
              <SolarSystemSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}

            {currentExperiment.sceneType === 'buoyancy' && (
              <BuoyancySimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}

            {currentExperiment.sceneType === 'conceptual' && (
              <ConceptualSimulation
                variables={variables}
                cameraPreset={cameraPreset}
                onUpdateMetrics={handleUpdateMetrics}
              />
            )}
          </div>

          {/* Real-time Telemetry HUD (Top-right) */}
          {currentExperiment.sceneType !== 'gravity' && (
          <TelemetryDisplay
            metrics={liveMetrics}
            observableSpecs={currentExperiment.observableOutputs}
            principles={currentExperiment.scientificPrinciples}
            safetyNotes={currentExperiment.safetyNotes}
          />
          )}

          {/* AI Scientist Companion (Dr. Nova) */}
          <ScientistCompanion
            experimentSpec={currentExperiment}
            currentVariables={variables}
            liveMetrics={liveMetrics}
            onApplyVariableUpdates={handleApplyVariableUpdates}
          />

          {/* Guided Steps & Learning Objectives (Bottom-left) */}
          {currentExperiment.sceneType !== 'gravity' && (
          <GuidedSteps
            learningObjectives={currentExperiment.learningObjectives}
            guidedSteps={currentExperiment.guidedSteps}
            currentVariables={variables}
          />
          )}

          {/* Sleek Collapsible Variable Control Dock (Bottom-center) */}
          {currentExperiment.sceneType !== 'gravity' && (
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
          )}

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

        </main>
      )}

      {/* Modals usable from the landing screen as well */}
      <PaperToLabModal
        isOpen={isPaperToLabOpen}
        onClose={() => setIsPaperToLabOpen(false)}
        onSynthesizeExperiment={loadExperimentSpec}
      />
      <DiagramToLabModal
        isOpen={isDiagramToLabOpen}
        onClose={() => setIsDiagramToLabOpen(false)}
        onSynthesizeExperiment={loadExperimentSpec}
      />
    </div>
  );
}
