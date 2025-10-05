// SimpleTimeline.tsx
import * as React from "react";
import { Box, Typography, Popper, Paper } from "@mui/material";
import { Pub } from "./mainView";

export type Item = {
  Title: string;
  Link: string;
  pmc_id: string;
  pmid: string;
  AU: string;
  DP: string; // YYYY-MM-DD preferred
  AB: string;
};

type Props = {
  items: Pub[];

  /** Auto-height scale (ignored if heightPx is set) */
  pxPerDay?: number;
  /** Min/max height when auto-sized (ignored if heightPx is set) */
  minHeight?: number;
  maxHeight?: number;

  /** Top/bottom padding inside the area */
  padY?: number;

  /** Rail X (px from left inside the block) */
  gutter?: number;

  /** Dot diameter */
  dotSize?: number;

  /** Stagger labels L/R to reduce collisions */
  alternateLabels?: boolean;

  /** Horizontal alignment of the whole block */
  align?: "left" | "center" | "right";
  /** Optional outer left padding in theme spacing units */
  plUnits?: number;
  /** Nudge whole block in px (negative = left) */
  offsetPx?: number;

  /** Base min vertical gap between dots (px) */
  minGapPx?: number;
  /** Approx height (px) of one label block (date + ID) — used to prevent overlap */
  labelBlockPx?: number;

  /** Fixed total height (px). If set, overrides auto height */
  heightPx?: number;
  onClick?: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Parse YYYY-MM-DD as UTC midnight for stable spacing; fallback handles ISO. */
const parseDateStable = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? (() => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d));
      })()
    : new Date(s);

const fmtDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export default function SimpleTimeline({
  items,
  pxPerDay = 16,
  minHeight = 360,
  maxHeight = 2400,
  padY = 32,
  gutter = 24,
  dotSize = 10,
  alternateLabels = false,
  align = "left",
  plUnits = 0,
  offsetPx = 0,
  minGapPx = 28,
  labelBlockPx = 44,   // ~ two text lines (date + ID) with a bit of padding
  heightPx,
  onClick
}: Props) {
  // Normalize + sort by date (oldest → newest)
  const data = React.useMemo(
    () =>
      [...items]
        .map((i) => ({ ...i, date: parseDateStable(i.DP) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [items]
  );

  // Span + height (auto vs fixed)
  const { spanDays, contentHeight } = React.useMemo(() => {
    if (!data.length) return { spanDays: 1, contentHeight: heightPx ?? minHeight };
    const t0 = data[0].date.getTime();
    const t1 = data[data.length - 1].date.getTime();
    const days = Math.max(1, (t1 - t0) / 86_400_000);

    if (typeof heightPx === "number") return { spanDays: days, contentHeight: heightPx };

    const auto = Math.round(days * pxPerDay) + padY * 2;
    return { spanDays: days, contentHeight: clamp(auto, minHeight, maxHeight) };
  }, [data, pxPerDay, padY, minHeight, maxHeight, heightPx]);

  // Y positions with label-aware gap, then fit to railSpan
  const positions = React.useMemo(() => {
    if (!data.length) return [] as number[];
    const railSpan = contentHeight - padY * 2;
    const t0 = data[0].date.getTime();

    // 1) time-based positions within [padY, padY + railSpan]
    let ys =
      spanDays <= 0
        ? data.map((_, i) => padY + (railSpan * i) / Math.max(1, data.length - 1))
        : data.map(
            (d) => padY + (((d.date.getTime() - t0) / 86_400_000) / spanDays) * railSpan
          );

    // 2) enforce a required gap = max(minGapPx, labelBlockPx)
    const requiredGap = Math.max(minGapPx, labelBlockPx);
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < requiredGap) ys[i] = ys[i - 1] + requiredGap;
    }

    // 3) if we overflow the rail span, compress back into it
    const end = padY + railSpan;
    if ((ys[ys.length - 1] ?? padY) > end && ys.length > 1) {
      const y0 = ys[0];
      const yN = ys[ys.length - 1];
      const denom = Math.max(1, yN - y0);
      for (let i = 0; i < ys.length; i++) {
        const t = (ys[i] - y0) / denom;   // 0..1 along stretched space
        ys[i] = padY + t * railSpan;      // remap into available span
      }
    }
    return ys;
  }, [data, spanDays, contentHeight, padY, minGapPx, labelBlockPx]);

  // Hover card state
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const open = hoverIndex !== null && !!anchorEl;
  const enter = (i: number) => (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    setHoverIndex(i);
  };
  const leave = () => {
    setHoverIndex(null);
    setAnchorEl(null);
  };

  const justify =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pl: plUnits, py: 3, }} onMouseLeave={leave}>
      <Box
        sx={{
          position: "relative",
          width: 720,
          maxWidth: "100%",
          height: contentHeight,
          left: 100, // nudge the whole block horizontally
        }}
      >
        {/* Rail */}
        <Box sx={{ position: "absolute", top: 0, bottom: 0, width: 2, bgcolor: "divider" }} />

        {/* Events */}
        {data.map((it, i) => {
          const y = positions[i] ?? 0;
          const placeLeft = alternateLabels && i % 2 === 1;
          const labelX = placeLeft ? gutter - 12 : gutter + 12;
          const labelTransform = placeLeft ? "translate(-100%, -50%)" : "translateY(-50%)";

          return (
            <React.Fragment key={`${it.pmc_id}-${i}`}>
              {/* Dot (hover anchor) */}
              <Box
                onMouseEnter={enter(i)}
                onMouseLeave={leave}
                sx={{
                  position: "absolute",
                  left: gutter,
                  top: y,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  bgcolor: "text.primary",
                  boxShadow: 1,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                }}
              />
              {/* Label block */}
              <Box
                sx={{
                  position: "absolute",
                  left: labelX,
                  top: y,
                  transform: labelTransform,
                  whiteSpace: "nowrap",
                  maxWidth: placeLeft ? gutter - 24 : `calc(100% - ${gutter + 24}px)`,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                  <span suppressHydrationWarning>{fmtDate.format(it.date)}</span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}
                  title={it.pmc_id}
                >
                  {it.pmc_id}
                </Typography>
              </Box>
            </React.Fragment>
          );
        })}

        {/* Hover card */}
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="right"
          modifiers={[
            { name: "offset", options: { offset: [10, 0] } },
            { name: "preventOverflow", options: { padding: 8 } },
          ]}
        >
          {hoverIndex !== null && (
            <Paper
              elevation={8}
              onMouseEnter={() => {}}
              onMouseLeave={leave}
              sx={{ p: 1.25, minWidth: 260, maxWidth: 360, border: 1, borderColor: "divider" }}
            >
              <Typography variant="caption" color="text.secondary">
                <span suppressHydrationWarning>
                  {fmtDate.format(data[hoverIndex].date)}
                </span>
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.25 }} title={data[hoverIndex].Title}>
                {data[hoverIndex].Title}
              </Typography>
              {!!data[hoverIndex].Link && (
                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  <a href={data[hoverIndex].Link} target="_blank" rel="noreferrer">
                    {data[hoverIndex].Link}
                  </a>
                </Typography>
              )}
            </Paper>
          )}
        </Popper>
      </Box>
    </Box>
  );
}
