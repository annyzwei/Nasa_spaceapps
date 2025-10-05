"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCw, FileDown, Loader2, TriangleAlert } from "lucide-react";
import { Typography } from "@mui/material";
import { stringify } from "querystring";
import summaryData from "./summary.json";

function getLinkFromTitle(title: string): string | null {
  const entry = summaryData.find((item) => item.Title === title);
  return entry?.Link ?? null;
}

export type SummaryData = {
  summary?: string;
  key_findings?: string[];
  limitations?: string[];
  future_directions?: string[];
  [k: string]: unknown;
};

export type SummaryViewerProps = {
  src?: string;
  data?: SummaryData;
  msPerChar?: number;
  autoScroll?: boolean;
  className?: string;
  title?: string;
  controls?: boolean;      // off by default
  speedControl?: boolean;  // off by default
  footerTip?: boolean;     // off by default
};

const prettyTitle = (k: string): string => {
  const map: Record<string, string> = {
    key_findings: "Key Findings",
    limitations: "Limitations",
    future_directions: "Future Directions",
    discussion: "Discussion",
    results: "Results",
    methods: "Methods",
    introduction: "Introduction",
    conclusion: "Conclusion",
  };
  return map[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

// ---- Typewriter
function useTypewriter(fullText: string, msPerChar: number, playing: boolean) {
  const [cursor, setCursor] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const done = cursor >= fullText.length;
  const slice = fullText.slice(0, cursor);

  useEffect(() => {
    if (!playing || done) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setCursor((c) => Math.min(c + 1, fullText.length));
    }, Math.max(1, msPerChar));
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [playing, msPerChar, fullText, done]);

  const reset = () => setCursor(0);
  const finish = () => setCursor(fullText.length);
  return { text: slice, done, reset, finish };
}

const asStringArray = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;

// ---- Small UI pieces (no Tailwind required for color)
const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      border: "1px solid #222",
      background: "#000",
      borderRadius: 16,
      padding: 20,
      boxShadow: "inset 0 0 0 rgba(0,0,0,0)",
      color: "#fff",
    }}
  >
    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{title}</h2>
    <div style={{ fontSize: 16, lineHeight: 1.7, color: "#fff" }}>{children}</div>
  </div>
);

const ControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...rest }) => (
  <button
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      padding: "8px 12px",
      border: "1px solid #444",
      background: "#111",
      color: "#fff",
    }}
    {...rest}
  >
    {children}
  </button>
);

// ---- A single bullet that types, then calls onDone
const BulletTyper: React.FC<{
  text: string;
  speed: number;
  playing: boolean;
  onDone: () => void;
}> = ({ text, speed, playing, onDone }) => {
  const { text: typed, done } = useTypewriter(text, speed, playing);
  const signaledRef = useRef(false);
  useEffect(() => {
    if (done && !signaledRef.current) {
      signaledRef.current = true;
      onDone();
    }
  }, [done, onDone]);
  return <>{typed}{!done && <span style={{ display: "inline-block", width: 6, height: 20, background: "#888", marginLeft: 0 }} />}</>;
};



const SummaryViewer: React.FC<SummaryViewerProps> = ({
  src,
  data,
  msPerChar = 18,
  autoScroll = true,
  className = "",
  title,
  controls = false,
  speedControl = false,
  footerTip = false,
}) => {
  const [payload, setPayload] = useState<SummaryData | null>(data ?? null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(msPerChar);
  const [link, setLink] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  let response_working = {};
  useEffect(() => { setSpeed(msPerChar); }, [msPerChar]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // fetch if needed
  useEffect(() => {
    let cancelled = false;
    if (!data && src) {
      setLoading(true);
      fetch(src)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = (await r.json()) as SummaryData;
          if (!cancelled) setPayload(j);
        })
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }
    return () => { cancelled = true; };
  }, [src, data]);

  useEffect(() => {
    if (!title) return;

    let cancelled = false;
    setLoading(true);   // show loader immediately
    setError(null);     // reset previous errors
    setPayload(null);   // clear old data while loading

    fetch(`http://127.0.0.1:5000/get_summary/${title}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as SummaryData;
        if (!cancelled) setPayload(j); // update payload once loaded
      })
      .catch((e) => {
        if (!cancelled) setError(e.message); // show error if fetch fails
      })
      .finally(() => {
        if (!cancelled) setLoading(false); // hide loader
      });

      const dynamicLink = getLinkFromTitle(title);
      setLink(dynamicLink ?? "https://scholar.google.com");
    return () => {
      cancelled = true;
    };
  }, [title]);

  const [bookmarked, setBookmarked] = useState<boolean>(false);

  const toggleBookmark = () => {
    setBookmarked((b) => !b);
    // Optional: persist bookmark in localStorage or call API
  };

  // type summary
  const summaryText = (payload?.summary ?? "").toString();
  const { text: typedSummary, done: summaryDone, reset: resetSummary } = useTypewriter(summaryText, speed, playing);

  // scroll on progress
  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [typedSummary, autoScroll]);

  // assemble sections
  const listSections = useMemo(() => {
    if (!payload) return [] as { key: string; title: string; items: string[] }[];
    const preferredOrder = ["key_findings", "limitations", "future_directions"];
    const keys = Object.keys(payload).filter((k) => k !== "summary");
    keys.sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      const da = ia === -1 ? Number.POSITIVE_INFINITY : ia;
      const db = ib === -1 ? Number.POSITIVE_INFINITY : ib;
      return da - db || a.localeCompare(b);
    });
    const out: { key: string; title: string; items: string[] }[] = [];
    for (const k of keys) {
      const arr = asStringArray((payload as any)[k]);
      if (arr && arr.length) out.push({ key: k, title: prettyTitle(k), items: arr });
    }
    return out;
  }, [payload]);

  // global bullet sequence
  const [bulletIndex, setBulletIndex] = useState(0);
  useEffect(() => { if (!summaryDone) setBulletIndex(0); }, [summaryDone]);
  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bulletIndex, autoScroll]);

  const resetAll = () => {
    resetSummary();
    setBulletIndex(0);
    setPlaying(true);
  };

  const downloadJSON = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI_SUM.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // render bullets per section while sequencing
  let globalOffset = 0;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        minHeight: "50vh",
        maxWidth: 960,
        margin: "0 auto",
        padding: "16px 24px",
        background: "#000",    // <- black viewer background
        color: "#fff",         // <- white text by default
        boxSizing: "border-box",
      }}
    >
      {/* Title + Bookmark */}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", marginBottom: 10}}>
        <button
          onClick={toggleBookmark}
          style={{
            background: "transparent",
            border: "2px solid #fff",
            borderRadius: 8,
            padding: "6px 12px",
            color: bookmarked ? "#ffd700" : "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
        </button>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>{title || "AI Summary"}</h1>

      {/* Optional controls */}
      {controls && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <ControlButton onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play"}
          </ControlButton>
          <ControlButton onClick={resetAll}>
            <RotateCw size={16} /> Replay
          </ControlButton>
          <ControlButton onClick={downloadJSON}>
            <FileDown size={16} /> JSON
          </ControlButton>
        </div>
      )}

      {/* Optional speed slider */}
      {speedControl && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#bbb" }}>Speed</label>
          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            title={`${speed} ms/char`}
          />
          <span style={{ fontSize: 12, color: "#bbb" }}>{speed} ms/char</span>
        </div>
      )}

      {/* Scroll container */}
      <div
        ref={containerRef}
        style={{
          border: "1px solid #222",
          background: "#000",
          borderRadius: 20,
          padding: 20,
          maxHeight: "78vh",
          overflow: "auto",
          boxShadow: "inset 0 0 0 rgba(0,0,0,0)",
        }}
      >
        {/* States */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff6b6b" }}>
            <TriangleAlert size={16} /> Failed to load: {error}
          </div>
        )}

        {/* Content */}
        {payload && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Summary */}
            {payload.summary && (
              <SectionCard title="Summary">
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {typedSummary}
                  {!summaryDone && <span style={{ display: "inline-block", width: 6, height: 20, background: "#888", marginLeft: 4 }} />}
                </p>
              </SectionCard>
            )}

            {/* Lists (typed after summary) */}
            {listSections.map((s) => {
              const items = s.items.map((item, i) => {
                const globalIdx = globalOffset + i;

                if (!summaryDone) return null; // wait until summary done

                if (globalIdx < bulletIndex) {
                  return <li key={i} style={{ lineHeight: 1.7 }}>{item}</li>; // already typed
                }

                if (globalIdx === bulletIndex) {
                  return (
                    <li key={i} style={{ lineHeight: 1.7 }}>
                      <BulletTyper
                        text={item}
                        speed={speed}
                        playing={playing}
                        onDone={() => setBulletIndex(globalIdx + 1)}
                      />
                    </li>
                  );
                }

                return null; // not yet reached
              });

              globalOffset += s.items.length;

              const hasVisible = items.some((el) => el !== null);
              if (!hasVisible) return null;

              return (
                <SectionCard key={s.key} title={s.title}>
                  <ul style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 8, listStyleType: "disc" }}>{items}</ul>
                </SectionCard>
              );
            })}

            {/* Any extra string fields */}
            {payload &&
              Object.entries(payload)
                .filter(([k]) => k !== "summary" && !asStringArray((payload as any)[k]))
                .filter(([, v]) => typeof v === "string")
                .map(([k, v]) => (
                  <SectionCard key={k} title={prettyTitle(k)}>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{String(v)}</p>
                  </SectionCard>
                ))}
              {/* Fixed bottom button */}
      {title && (
        <a
          href={link} // use the link here
          target="_blank"
          rel="noopener noreferrer"
          style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      padding: "12px 20px",
      background: "#fff",    // white background
      color: "#000",         // black text
      borderRadius: 12,
      textDecoration: "none",
      fontWeight: 600,
      boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
    }}
        >
          Open Article
        </a>
      )}
          </div>
        )}
        

        <div ref={containerRef} style={{ maxHeight: "78vh", overflow: "auto" }}>
          {/* Initial state */}
          {!title && !loading && !payload && !error && (
            <div style={{ color: "#888", fontStyle: "italic" }}>
              Select an article to summarize!
            </div>
          )}
          
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ccc" }}>
            <Loader2
              size={16}
              style={{ 
                animation: "spin 1s linear infinite" 
              }}
            />
            Loading summary...    
          </div>
        )}

        {!loading && error && (
          <div style={{ color: "#ff6b6b" }}>Error: {error}</div>
        )}

        {!loading && payload && (
          <div>
            {/* render your summary and bullets here */}
          </div>
        )}
        
</div>

      </div>

    

      {/* Optional footer */}
      {footerTip && (
        <p style={{ marginTop: 12, fontSize: 12, color: "#aaa" }}>
          Tip: put <code>AI_SUM.json</code> in <code>/public</code> and use <code>&lt;SummaryViewer src="/AI_SUM.json" /&gt;</code>.
          Or pass the object via <code>data</code>.
        </p>
      )}
    </div>
  );
};

export default SummaryViewer;
