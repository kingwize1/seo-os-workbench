import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SEO_OS_THEMES, SPECIALIST_DESK_BLUEPRINTS } from '@shared/constants';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import type { BrainNode, Coworker, Task, ThemeId } from '@shared/types';

interface ProjectedLabel {
  id: string;
  kind: 'ORCHESTRATOR' | 'SPECIALIST' | 'COWORKER' | 'BRAIN';
  label: string;
  sublabel: string;
  statusColor: string;
  x: number;
  y: number;
  visible: boolean;
}

interface SeoOsScene3DProps {
  theme: ThemeId;
  reducedMotion: boolean;
  tasks: Task[];
  coworkers: Coworker[];
  brainNodes: BrainNode[];
  onSelectOrchestrator: () => void;
  onSelectSpecialist: (deskKey: string) => void;
  onSelectCoworker: (coworkerId: string) => void;
  onSelectBrainNode: (nodeId: string) => void;
}

export function SeoOsScene3D({
  theme,
  reducedMotion,
  tasks,
  coworkers,
  brainNodes,
  onSelectOrchestrator,
  onSelectSpecialist,
  onSelectCoworker,
  onSelectBrainNode,
}: SeoOsScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Store latest callbacks/data in refs so animation loop doesn't recreate WebGL context on minor updates
  const callbacksRef = useRef({
    onSelectOrchestrator,
    onSelectSpecialist,
    onSelectCoworker,
    onSelectBrainNode,
  });
  callbacksRef.current = {
    onSelectOrchestrator,
    onSelectSpecialist,
    onSelectCoworker,
    onSelectBrainNode,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglError(true);
      return;
    }

    const themeCfg = SEO_OS_THEMES[theme];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeCfg.bgHex);
    scene.fog = new THREE.FogExp2(themeCfg.fogHex, 0.042);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    let orbitTheta = 0.05;
    let orbitPhi = 0.92;
    let orbitRadius = 13.5;

    const updateCamera = () => {
      camera.position.set(
        orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta),
        orbitRadius * Math.cos(orbitPhi) + 1.2,
        orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta)
      );
      camera.lookAt(0, 1.3, -0.4);
    };
    updateCamera();

    // Lighting
    scene.add(new THREE.AmbientLight(themeCfg.ambientHex, 0.65));
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.9);
    dirLight.position.set(8, 16, 10);
    scene.add(dirLight);
    const accentLight = new THREE.PointLight(themeCfg.accentHex, 2.2, 24);
    accentLight.position.set(0, 5.5, 0);
    scene.add(accentLight);
    const secondaryLight = new THREE.PointLight(themeCfg.secondaryHex, 1.5, 22);
    secondaryLight.position.set(-6, 4, -5);
    scene.add(secondaryLight);

    // Floor & Spatial Grid
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: themeCfg.floorHex,
      roughness: 0.78,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, themeCfg.accentHex, themeCfg.gridHex);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Interactive Clickables & Label Anchors
    const clickTargets: THREE.Object3D[] = [];
    const labelAnchors: {
      id: string;
      kind: ProjectedLabel['kind'];
      label: string;
      sublabel: string;
      statusColor: string;
      pos: THREE.Vector3;
    }[] = [];

    // 1. Central Orchestrator Dais
    const daisGroup = new THREE.Group();
    const daisBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.85, 0.36, 8),
      new THREE.MeshStandardMaterial({
        color: '#111827',
        emissive: themeCfg.accentHex,
        emissiveIntensity: 0.22,
        metalness: 0.6,
        roughness: 0.3,
      })
    );
    daisBase.position.y = 0.18;
    daisBase.userData = { kind: 'ORCHESTRATOR', id: 'orchestrator' };
    daisGroup.add(daisBase);
    clickTargets.push(daisBase);

    const holoRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.045, 12, 48),
      new THREE.MeshBasicMaterial({ color: themeCfg.accentHex })
    );
    holoRing.rotation.x = Math.PI / 2;
    holoRing.position.y = 0.48;
    daisGroup.add(holoRing);

    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: themeCfg.accentHex,
        emissive: themeCfg.accentHex,
        emissiveIntensity: 0.75,
        wireframe: false,
      })
    );
    coreCrystal.position.y = 1.45;
    coreCrystal.userData = { kind: 'ORCHESTRATOR', id: 'orchestrator' };
    daisGroup.add(coreCrystal);
    clickTargets.push(coreCrystal);
    scene.add(daisGroup);

    labelAnchors.push({
      id: 'orchestrator',
      kind: 'ORCHESTRATOR',
      label: 'Central Orchestrator',
      sublabel: 'Dispatch Outcomes',
      statusColor: themeCfg.accentHex,
      pos: new THREE.Vector3(0, 2.2, 0),
    });

    // 2. 9 Specialist SEO Desks
    const taskByDesk = new Map<string, Task>();
    for (const t of tasks) {
      if (!taskByDesk.has(t.deskKey)) taskByDesk.set(t.deskKey, t);
    }

    const pulsingBeacons: { mesh: THREE.Mesh; speed: number }[] = [];

    for (const bp of SPECIALIST_DESK_BLUEPRINTS) {
      const task = taskByDesk.get(bp.deskKey);
      const statusMeta = STATUS_VISUAL_META[task?.status ?? 'QUEUED'];
      const [px, , pz] = bp.position;

      const deskGroup = new THREE.Group();
      deskGroup.position.set(px, 0, pz);
      deskGroup.lookAt(0, 0, 0);

      // Desk surface
      const deskMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.12, 0.85),
        new THREE.MeshStandardMaterial({
          color: '#162033',
          metalness: 0.45,
          roughness: 0.4,
        })
      );
      deskMesh.position.y = 0.72;
      deskMesh.userData = { kind: 'SPECIALIST', id: bp.deskKey };
      deskGroup.add(deskMesh);
      clickTargets.push(deskMesh);

      // Desk legs
      const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.7);
      const legMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.6, roughness: 0.4 });
      const legL = new THREE.Mesh(legGeo, legMat);
      legL.position.set(-0.72, 0.36, 0);
      const legR = new THREE.Mesh(legGeo, legMat);
      legR.position.set(0.72, 0.36, 0);
      deskGroup.add(legL, legR);

      // Glowing monitor
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.48, 0.05),
        new THREE.MeshStandardMaterial({
          color: statusMeta.dotColor,
          emissive: statusMeta.dotColor,
          emissiveIntensity: task?.status === 'SKIPPED' ? 0.18 : 0.65,
        })
      );
      screen.position.set(0, 1.08, 0.18);
      screen.userData = { kind: 'SPECIALIST', id: bp.deskKey };
      deskGroup.add(screen);
      clickTargets.push(screen);

      // Floating status beacon orb
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshBasicMaterial({ color: statusMeta.dotColor })
      );
      beacon.position.set(0, 1.56, 0.18);
      deskGroup.add(beacon);

      if (task?.status === 'RUNNING' || task?.status === 'REVIEW' || task?.status === 'FAILED') {
        pulsingBeacons.push({ mesh: beacon, speed: task.status === 'FAILED' ? 5.5 : 3.0 });
      }

      // Connector filament to central orchestrator
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(px, 0.06, pz),
        new THREE.Vector3(0, 0.06, 0),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: statusMeta.dotColor,
        transparent: true,
        opacity: task?.status === 'SKIPPED' ? 0.14 : 0.4,
      });
      scene.add(new THREE.Line(lineGeo, lineMat));

      scene.add(deskGroup);

      labelAnchors.push({
        id: bp.deskKey,
        kind: 'SPECIALIST',
        label: bp.shortLabel,
        sublabel: statusMeta.label,
        statusColor: statusMeta.dotColor,
        pos: new THREE.Vector3(px, 1.92, pz),
      });
    }

    // 3. Business AI Coworker Pods (Right Executive Wing)
    const bizCoworkers = coworkers.filter((c) => c.kind === 'COWORKER').slice(0, 5);
    bizCoworkers.forEach((cw, idx) => {
      const z = -1.6 + idx * 1.6;
      const x = 7.4;
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.65, 0.9, 6),
        new THREE.MeshStandardMaterial({
          color: '#172038',
          emissive: cw.accentColor,
          emissiveIntensity: cw.status === 'AWAITING_APPROVAL' ? 0.55 : 0.25,
          metalness: 0.5,
          roughness: 0.35,
        })
      );
      pod.position.set(x, 0.45, z);
      pod.userData = { kind: 'COWORKER', id: cw.id };
      scene.add(pod);
      clickTargets.push(pod);

      labelAnchors.push({
        id: cw.id,
        kind: 'COWORKER',
        label: `${cw.avatarEmoji} ${cw.name}`,
        sublabel: cw.role,
        statusColor: cw.status === 'AWAITING_APPROVAL' ? '#fbbf24' : cw.accentColor,
        pos: new THREE.Vector3(x, 1.45, z),
      });
    });

    // 4. Overhead 3D Knowledge Brain Chandelier
    const chandelierGroup = new THREE.Group();
    const nodePosMap = new Map<string, THREE.Vector3>();
    const catColors: Record<string, string> = {
      TECHNICAL: '#38bdf8',
      KEYWORD: '#a78bfa',
      CONTENT: '#22d3ee',
      COMPETITOR: '#fb7185',
      SCHEMA: '#f59e0b',
      GEO_AI: '#c084fc',
      ANALYTICS: '#34d399',
    };

    for (const node of brainNodes) {
      const pos = new THREE.Vector3(node.x, node.y + 0.4, node.z);
      nodePosMap.set(node.id, pos);
      const color = catColors[node.category] ?? themeCfg.accentHex;
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.24, 1),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.85,
          roughness: 0.2,
        })
      );
      orb.position.copy(pos);
      orb.userData = { kind: 'BRAIN', id: node.id };
      chandelierGroup.add(orb);
      clickTargets.push(orb);

      labelAnchors.push({
        id: node.id,
        kind: 'BRAIN',
        label: node.label.slice(0, 26),
        sublabel: `${node.category} · Brain`,
        statusColor: color,
        pos: pos.clone().add(new THREE.Vector3(0, 0.35, 0)),
      });
    }

    // Chandelier filament edges
    for (const node of brainNodes) {
      const p1 = nodePosMap.get(node.id);
      if (!p1) continue;
      for (const connId of node.connections) {
        const p2 = nodePosMap.get(connId);
        if (!p2) continue;
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const edgeMat = new THREE.LineBasicMaterial({
          color: themeCfg.secondaryHex,
          transparent: true,
          opacity: 0.45,
        });
        chandelierGroup.add(new THREE.Line(edgeGeo, edgeMat));
      }
    }
    scene.add(chandelierGroup);

    // Pointer Orbit, Zoom & Raycast Clicking
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let dragMoved = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
        orbitTheta -= dx * 0.0065;
        orbitPhi = Math.max(0.38, Math.min(1.38, orbitPhi - dy * 0.0055));
        lastX = e.clientX;
        lastY = e.clientY;
        updateCamera();
      } else {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickTargets, false);
        const hitId = hits[0]?.object?.userData?.id ?? null;
        renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
        setHoveredId(hitId);
      }
    };

    const onPointerUp = () => {
      if (!dragMoved) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickTargets, false);
        const target = hits[0]?.object?.userData as { kind?: string; id?: string } | undefined;
        if (target?.kind === 'ORCHESTRATOR') callbacksRef.current.onSelectOrchestrator();
        else if (target?.kind === 'SPECIALIST' && target.id) callbacksRef.current.onSelectSpecialist(target.id);
        else if (target?.kind === 'COWORKER' && target.id) callbacksRef.current.onSelectCoworker(target.id);
        else if (target?.kind === 'BRAIN' && target.id) callbacksRef.current.onSelectBrainNode(target.id);
      }
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRadius = Math.max(7.5, Math.min(20, orbitRadius + e.deltaY * 0.01));
      updateCamera();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop + 2D HUD Label Projection
    let animId = 0;
    let frame = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!reducedMotion) {
        holoRing.rotation.z = t * 0.35;
        coreCrystal.rotation.y = t * 0.7;
        coreCrystal.position.y = 1.45 + Math.sin(t * 1.8) * 0.1;
        chandelierGroup.rotation.y = Math.sin(t * 0.22) * 0.12;
        for (const b of pulsingBeacons) {
          const s = 1 + Math.sin(t * b.speed) * 0.24;
          b.mesh.scale.set(s, s, s);
        }
      }

      renderer.render(scene, camera);

      // Project labels every 4th frame for crisp overlays at low CPU cost
      frame += 1;
      if (frame % 4 === 1) {
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        const projected: ProjectedLabel[] = labelAnchors.map((a) => {
          const worldPos = a.pos.clone();
          if (a.kind === 'BRAIN') {
            worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), chandelierGroup.rotation.y);
          }
          const v = worldPos.project(camera);
          return {
            id: a.id,
            kind: a.kind,
            label: a.label,
            sublabel: a.sublabel,
            statusColor: a.statusColor,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible: v.z < 1 && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05,
          };
        });
        setLabels(projected);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [theme, reducedMotion, tasks, coworkers, brainNodes]);

  if (webglError) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-950/70 p-6 text-center text-sm text-slate-300">
        WebGL is unavailable in this browser environment. Switch to the Accessible 2D Desk view in the top bar.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[500px] w-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive 3D SEO OS Spatial Office" />

      {/* Projected crisp desk & chandelier labels */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((lbl) => {
          if (!lbl.visible) return null;
          const isHovered = hoveredId === lbl.id;
          return (
            <button
              key={`${lbl.kind}_${lbl.id}`}
              type="button"
              onClick={() => {
                if (lbl.kind === 'ORCHESTRATOR') onSelectOrchestrator();
                else if (lbl.kind === 'SPECIALIST') onSelectSpecialist(lbl.id);
                else if (lbl.kind === 'COWORKER') onSelectCoworker(lbl.id);
                else if (lbl.kind === 'BRAIN') onSelectBrainNode(lbl.id);
              }}
              style={{
                left: `${lbl.x}px`,
                top: `${lbl.y}px`,
                transform: 'translate(-50%, -100%)',
                borderColor: isHovered ? lbl.statusColor : 'rgba(148,163,184,0.22)',
              }}
              className={`pointer-events-auto absolute flex items-center gap-1.5 rounded-lg border bg-slate-950/85 px-2 py-1 text-left shadow-lg backdrop-blur transition-transform hover:scale-105 ${
                lbl.kind === 'BRAIN' ? 'opacity-85 hover:opacity-100' : ''
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lbl.statusColor, boxShadow: `0 0 8px ${lbl.statusColor}` }}
              />
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold text-slate-100 whitespace-nowrap">
                  {lbl.label}
                </span>
                <span className="block text-[9px] font-mono-tech uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  {lbl.sublabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom-left subtle camera hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur">
        Drag to orbit · Scroll to zoom · Click any Specialist Desk, Coworker Pod, or overhead Brain Chandelier node
      </div>
    </div>
  );
}
