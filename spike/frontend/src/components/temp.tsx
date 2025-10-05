// SubjectTreeHorizontalArrows.tsx
import * as React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Map depth → 0..1 (cap at 6 levels; tweak as you like)
const depthT = (depth: number) => Math.min(1, depth / 6);

// Green (≈130°) → Purple (≈290°)
function depthHue(depth: number) {
  const t = depthT(depth);
  return lerp(130, 290, t); // 130=green, 290=purple
}

export function depthBg(depth: number, isArticle = false) {
  const h = depthHue(depth);
  const s = 80;                      // saturation %
  const baseL = isArticle ? 96 : 92; // slightly lighter for PMC leaves
  const l = Math.max(70, baseL - depth * 2); // gentle darken by depth
  return `hsl(${h} ${s}% ${l}%)`;
}

// ---------- Types ----------
type TreeNode = {
  label: string;
  count: number;
  is_article?: boolean;
  children?: TreeNode[];
};

type Props = {
  data: TreeNode | TreeNode[];
  defaultOpenDepth?: number; // auto-open levels
  gapX?: number;             // horizontal spacing between levels (px)
  gapY?: number;             // vertical spacing between siblings (px)
  cardMinWidth?: number;     // optional min width for cards
};

// ---------- Small UI bits ----------
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        transition: "transform .15s ease",
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

// ---------- Arrow layer context ----------
type Pos = { x: number; y: number; w: number; h: number };
type Edge = { fromId: number; toId: number };

type ArrowCtxType = {
  register: (id: number, el: HTMLElement | null) => void;
  addEdge: (fromId: number, toId: number) => void;
  requestMeasure: () => void;
};
const ArrowCtx = React.createContext<ArrowCtxType | null>(null);

// global id counter for nodes
let NEXT_ID = 1;

// ---------- Main component ----------
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
  const edgesRef = React.useRef<Edge[]>([]);
  const [, force] = React.useReducer((x) => x + 1, 0);

  const register = React.useCallback((id: number, el: HTMLElement | null) => {
    elRef.current.set(id, el);
  }, []);

  const addEdge = React.useCallback((fromId: number, toId: number) => {
    edgesRef.current.push({ fromId, toId });
  }, []);

  const measure = React.useCallback(() => {
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
  }, []);

  // Re-measure on layout changes
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

  // Reset edges before (re)rendering the tree
  edgesRef.current = [];

  const ctx: ArrowCtxType = { register, addEdge, requestMeasure: measure };

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
      }}
    >
      <ArrowCtx.Provider value={ctx}>
        {forest.map((n, i) => (
          <Node
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

      {/* SVG arrows overlay */}
      <SvgArrows positions={posRef.current} edges={edgesRef.current} />
    </Box>
  );
}

// ---------- Node (recursive) ----------
function Node({
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
  const { register, addEdge, requestMeasure } = ctx;

  const hasKids = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = React.useState(depth < defaultOpenDepth);

  // assign id and register DOM element
  const id = React.useMemo(() => NEXT_ID++, []);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    register(id, cardRef.current);
    requestMeasure();
  }, [id, register, requestMeasure, open]);

  // add edge from parent → this node (after first mount)
  React.useEffect(() => {
    if (parentId != null) {
      addEdge(parentId, id);
      requestMeasure();
    }
  }, [parentId, id, addEdge, requestMeasure]);

  // Article leaf → simple link card
  if (node.is_article) {
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
          bgcolor: "background.paper",
          minHeight: 26,
          ...(cardMinWidth ? { minWidth: cardMinWidth, justifyContent: "flex-start" } : {}),
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
    <Box 
        sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "flex-start", 
            p: 1}}>
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
          width: 200,
          ...(cardMinWidth ? { minWidth: cardMinWidth, justifyContent: "center", textAlign: "center" } : {}),
        }}
      >
        {hasKids && (
          <IconButton size="small" onClick={() => setOpen((v) => !v)} sx={{ p: 0.25, mr: 0.5 }}>
            <Chevron open={open} />
          </IconButton>
        )}
        <span>{node.label || "(root)"}</span>
        <Badge>{node.count}</Badge>
      </Box>

      {/* Children column to the right */}
      {hasKids && open && (
        <Box
          sx={{
            ml: `${gapX}px`,
            display: "flex",
            flexDirection: "column",
            gap: `${gapY}px`,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          {node.children!.map((child, idx) => (
            <Node
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

// ---------- SVG overlay that draws the arrows ----------
function SvgArrows({ positions, edges }: { positions: Map<number, Pos>; edges: Edge[] }) {
  // compute size
  let maxX = 0,
    maxY = 0;
  positions.forEach((p) => {
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  });

  return (
    <svg
      width={Math.ceil(maxX)}
      height={Math.ceil(maxY)}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#9AA0A6" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = positions.get(e.fromId);
        const b = positions.get(e.toId);
        if (!a || !b) return null;

        // from right-middle of parent to left-middle of child
        const x1 = a.x + a.w;
        const y1 = a.y + a.h / 2;
        const x2 = b.x;
        const y2 = b.y + b.h / 2;

        const dx = Math.max(24, (x2 - x1) * 0.45);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        return <path key={i} d={d} stroke="#9AA0A6" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />;
      })}
    </svg>
  );
}
