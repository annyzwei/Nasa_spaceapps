// SubjectTreeHorizontalArrows_XYFlow.tsx
import * as React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";

import {
  ReactFlow,
  Background,
  MarkerType,
  type Node as RFNode,
  type Edge as RFEdge,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const notWanted = ["Cell Biology", "Cell biology"];

/* ========================= Color by depth (green -> purple) ========================= */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const depthT = (depth: number) => Math.min(1, depth / 6);
const depthHue = (d: number) => lerp(130, 290, depthT(d));
const depthBg = (d: number, isArticle = false) => {
  const h = depthHue(d), s = 80, baseL = isArticle ? 96 : 92;
  const l = Math.max(70, baseL - d * 2);
  return `hsl(${h} ${s}% ${l}%)`;
};

/* ========================= Types ========================= */
type TreeNode = { label: string; count: number; is_article?: boolean; children?: TreeNode[] };
type Props = { data: TreeNode | TreeNode[]; defaultOpenDepth?: number; gapX?: number; gapY?: number; cardMinWidth?: number };

/* ========================= Small UI bits ========================= */
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        transition: "transform .15s",
        transform: `rotate(${open ? 90 : 0}deg)`,
        width: 10,
      }}
    >
      ▶
    </span>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        borderRadius: 999,
        padding: "2px 6px",
        background: "#eef2ff",
        color: "#3730a3",
        marginLeft: 6,
      }}
    >
      {children}
    </span>
  );
}

/* ========================= Measuring & edge registry ========================= */
type Pos = { x: number; y: number; w: number; h: number };

type ArrowCtxType = {
  register: (id: number, el: HTMLElement | null) => void;
  unregister: (id: number) => void;
  link: (fromId: number, toId: number) => void;
  unlink: (fromId: number, toId: number) => void;
  unlinkAllFor: (nodeId: number) => void;
  requestMeasure: () => void;
};
const ArrowCtx = React.createContext<ArrowCtxType | null>(null);

// unique ids for rendered cards
let NEXT_ID = 1;

// visual tweak: pull the anchor slightly inside each card so the arrow "touches"
const EDGE_INSET = 24;

/* ========================= Main component ========================= */
export default function SubjectTree({
  data,
  defaultOpenDepth = 2,
  gapX = 36,
  gapY = 12,
  cardMinWidth = 0,
}: Props) {
  const forest = Array.isArray(data) ? data : [data];

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const elRef = React.useRef<Map<number, HTMLElement | null>>(new Map());
  const posRef = React.useRef<Map<number, Pos>>(new Map());

  // Edge maps (for safe remove on unmount)
  const edgesFromRef = React.useRef<Map<number, Set<number>>>(new Map());
  const edgesToRef = React.useRef<Map<number, Set<number>>>(new Map());

  // bump to re-render overlay when positions/edges change
  const [, force] = React.useReducer((x) => x + 1, 0);

  // -- registry ops
  const register = React.useCallback((id: number, el: HTMLElement | null) => {
    elRef.current.set(id, el);
  }, []);
  const unregister = React.useCallback((id: number) => {
    elRef.current.delete(id);
    posRef.current.delete(id);
    // remove all edges involving this node
    const fromSet = edgesFromRef.current.get(id);
    if (fromSet) {
      fromSet.forEach((to) => {
        const rev = edgesToRef.current.get(to);
        if (rev) {
          rev.delete(id);
          if (!rev.size) edgesToRef.current.delete(to);
        }
      });
      edgesFromRef.current.delete(id);
    }
    const toSet = edgesToRef.current.get(id);
    if (toSet) {
      toSet.forEach((from) => {
        const fwd = edgesFromRef.current.get(from);
        if (fwd) {
          fwd.delete(id);
          if (!fwd.size) edgesFromRef.current.delete(from);
        }
      });
      edgesToRef.current.delete(id);
    }
  }, []);
  const link = React.useCallback((fromId: number, toId: number) => {
    const fwd = edgesFromRef.current.get(fromId) ?? new Set<number>();
    fwd.add(toId);
    edgesFromRef.current.set(fromId, fwd);
    const rev = edgesToRef.current.get(toId) ?? new Set<number>();
    rev.add(fromId);
    edgesToRef.current.set(toId, rev);
  }, []);
  const unlink = React.useCallback((fromId: number, toId: number) => {
    const fwd = edgesFromRef.current.get(fromId);
    if (fwd) {
      fwd.delete(toId);
      if (!fwd.size) edgesFromRef.current.delete(fromId);
    }
    const rev = edgesToRef.current.get(toId);
    if (rev) {
      rev.delete(fromId);
      if (!rev.size) edgesToRef.current.delete(toId);
    }
  }, []);
  const unlinkAllFor = React.useCallback((nodeId: number) => {
    unregister(nodeId);
  }, [unregister]);

  // -- measurement after paint
  const measure = React.useCallback(() => {
    requestAnimationFrame(() => {
      const root = containerRef.current;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      const m = new Map<number, Pos>();
      for (const [id, el] of elRef.current.entries()) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        m.set(id, { x: r.left - rootRect.left, y: r.top - rootRect.top, w: r.width, h: r.height });
      }
      posRef.current = m;
      force();
    });
  }, []);

  React.useEffect(() => {
    measure();
    const obs = new ResizeObserver(measure);
    if (containerRef.current) obs.observe(containerRef.current);
    const onR = () => measure();
    window.addEventListener("resize", onR);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", onR);
    };
  }, [measure]);

  const ctx: ArrowCtxType = { register, unregister, link, unlink, unlinkAllFor, requestMeasure: measure };

  // -- Build XYFlow anchors + edges fresh each render from current maps
  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];
  {
    const positions = posRef.current;
    const usedAnchors = new Set<string>();
    let i = 0;

    const addAnchor = (id: string, x: number, y: number) => {
      if (usedAnchors.has(id)) return;
      usedAnchors.add(id);
      rfNodes.push({
        id,
        position: { x, y },
        draggable: false,
        selectable: false,
        data: {},
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: { width: 1, height: 1, opacity: 0, pointerEvents: "none" },
      });
    };

    edgesFromRef.current.forEach((tos, fromId) => {
      const a = positions.get(fromId);
      if (!a) return;
      tos.forEach((toId) => {
        const b = positions.get(toId);
        if (!b) return;

        // parent right-mid → child left-mid (inset inside cards)
        const ax = a.x + a.w - EDGE_INSET, ay = a.y + a.h / 2 - 10;
        const bx = b.x,       by = b.y + b.h / 2 - 10;

        const aid = `A:${fromId}`, bid = `B:${toId}`;
        addAnchor(aid, ax, ay);
        addAnchor(bid, bx, by);

        rfEdges.push({
          id: `e${i++}:${aid}->${bid}`,
          source: aid,
          target: bid,
          type: "straight", // or "smoothstep" / "bezier"
          style: { strokeWidth: 2, stroke: "#334155", shapeRendering: "geometricPrecision" }, // darker, crisp
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: false,
        });
      });
    });
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: `${gapY}px`,
        width: "100%",
        minHeight: 200,
      }}
    >
      <ArrowCtx.Provider value={ctx}>
        {(Array.isArray(data) ? data : [data]).map((n, i) => (
          <NodeCard
            key={i}
            node={n}
            depth={0}
            defaultOpenDepth={defaultOpenDepth}
            gapX={gapX}
            gapY={gapY}
            cardMinWidth={cardMinWidth}
            parentId={undefined}
          />
        ))}
      </ArrowCtx.Provider>

      {/* XYFlow overlay (edges only, invisible anchor nodes) */}
      <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          fitView={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background gap={24} size={0} />
        </ReactFlow>
      </Box>
    </Box>
  );
}

/* ========================= Recursive node renderer ========================= */
function NodeCard({
  node,
  depth,
  defaultOpenDepth,
  gapX,
  gapY,
  cardMinWidth,
  parentId,
}: {
  node: TreeNode;
  depth: number;
  defaultOpenDepth: number;
  gapX: number;
  gapY: number;
  cardMinWidth: number;
  parentId?: number;
}) {
  const ctx = React.useContext(ArrowCtx);
  if (!ctx) throw new Error("Arrow context missing");
  const { register, unregister, link, unlink, unlinkAllFor, requestMeasure } = ctx;

  const hasKids = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = React.useState(depth < defaultOpenDepth);

  // stable id for this card
  const id = React.useMemo(() => NEXT_ID++, []);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  // mount/unmount: register DOM + edges cleanup (NO dependency on "open")
  React.useEffect(() => {
    register(id, cardRef.current);
    requestMeasure();
    const t = setTimeout(requestMeasure, 0);
    return () => {
      // only runs on unmount
      unlinkAllFor(id);
      unregister(id);
      clearTimeout(t);
      requestMeasure();
    };
  }, [id, register, unregister, unlinkAllFor, requestMeasure]);

  // parent→this link (and cleanup when either unmounts)
  React.useEffect(() => {
    if (parentId != null) {
      link(parentId, id);
      requestMeasure();
      return () => {
        unlink(parentId, id);
        requestMeasure();
      };
    }
  }, [parentId, id, link, unlink, requestMeasure]);

  // when toggling open/close, just re-measure (do NOT unregister/relink)
  React.useEffect(() => {
    requestMeasure();
    const t = setTimeout(requestMeasure, 0);
    return () => clearTimeout(t);
  }, [open, requestMeasure]);

  // Article leaf → link card
  if (node.is_article && !notWanted.includes(node.label)) {
    const pmc = node.label;
    const href = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmc}/`;
    return (
      <Box
        ref={cardRef}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          px: 1,
          py: 0.25,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: depthBg(depth + 1, true),
          minHeight: 26,
          ...(cardMinWidth ? { minWidth: cardMinWidth } : {}),
        }}
      >
        <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
          {pmc}
        </a>
      </Box>
    );
  }

  // Subject node
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
      {/* Node card */}
      <Box
        ref={cardRef}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          px: 1,
          py: 0.5,
          bgcolor: depthBg(depth),
          minHeight: 28,
          ...(cardMinWidth ? { minWidth: cardMinWidth, textAlign: "left" } : {}),
        }}
      >
        {hasKids && (
          <IconButton
            size="small"
            onClick={() => setOpen((v) => !v)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            <Chevron open={open} />
          </IconButton>
        )}
        <span>{node.label || "(root)"} </span>
        <Badge>{node.count}</Badge>
      </Box>

      {/* Children column (left-aligned) */}
      {hasKids && open && (
        <Box
          sx={{
            ml: `${gapX}px`,
            display: "flex",
            flexDirection: "column",
            gap: `${gapY}px`,
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          {node.children!.map((child, idx) => (
            <NodeCard
              key={child.label + ":" + idx}
              node={child}
              depth={depth + 1}
              defaultOpenDepth={defaultOpenDepth}
              gapX={gapX}
              gapY={gapY}
              cardMinWidth={cardMinWidth}
              parentId={id}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
