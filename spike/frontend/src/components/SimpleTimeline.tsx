import * as React from "react";
import { Box, Typography, Popper, Paper, Divider } from "@mui/material";

// Input: ISO dates recommended (YYYY-MM-DD or full ISO)
export type Item = { Title: string; Link: string; pmc_id: string; pmid: string; AU: string; DP: string; AB: string; };

type Props = {
  items: Item[];
  pxPerDay?: number;          // horizontal scale (pixels per day)
  minWidth?: number;          // clamp small ranges
  maxWidth?: number;          // clamp huge ranges
  padX?: number;              // left/right padding inside the rail
  dotSize?: number;           // diameter of event dots
  alternateLabels?: boolean;  // put labels above/below alternating
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Parse YYYY-MM-DD as midnight UTC; otherwise fall back to Date constructor (ISO-safe)
const parseDateStable = (s: string) => {
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  if (m) {
    const [y, mo, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1, d));
  }
  return new Date(s);
};

// Fixed-locale/timezone formatter → deterministic for SSR/CSR
const fmtDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

// Horizontal, time-scaled timeline with a hover card (Popper) on each point
export default function HorizontalTimeScaledTimeline({
  items,
  pxPerDay = 24,
  minWidth = 640,
  maxWidth = 2400,
  padX = 32,
  dotSize = 10,
  alternateLabels = true,
}: Props) {
  // normalize + sort
  const data = React.useMemo(
    () =>
      [...items]
        .map((i) => ({ ...i, date: parseDateStable(i.DP) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [items]
  );

  const { spanDays, contentWidth } = React.useMemo(() => {
    if (data.length === 0) return { spanDays: 1, contentWidth: minWidth };
    const t0 = data[0].date.getTime();
    const t1 = data[data.length - 1].date.getTime();
    const days = Math.max(1, (t1 - t0) / 86_400_000);
    const width = clamp(Math.round(days * pxPerDay) + padX * 2, minWidth, maxWidth);
    return { spanDays: days, contentWidth: width };
  }, [data, pxPerDay, padX, minWidth, maxWidth]);

  // compute x positions
  const positions = React.useMemo(() => {
    if (data.length === 0) return [] as number[];
    const t0 = data[0].date.getTime();
    const rail = contentWidth - padX * 2;
    if (spanDays <= 0) {
      // equal spacing if all dates identical
      return data.map((_, i) => padX + (rail * i) / Math.max(1, data.length - 1));
    }
    return data.map((d) => {
      const elapsedDays = (d.date.getTime() - t0) / 86_400_000;
      return padX + (elapsedDays / spanDays) * rail;
    });
  }, [data, spanDays, contentWidth, padX]);

  // Hover card state
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const open = hoverIndex !== null && !!anchorEl;

  const handleEnter =
    (i: number) =>
    (e: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(e.currentTarget);
      setHoverIndex(i);
    };

  const handleLeave = () => {
    setHoverIndex(null);
    setAnchorEl(null);
  };

  const labelOffset = 18; // px from rail to label group

  return (
    <Box sx={{ overflowX: "auto", py: 3 }} onMouseLeave={handleLeave}>
      <Box
        sx={{
          position: "relative",
          height: 140,                 // overall lane height (adjust as needed)
          minWidth: contentWidth,      // enables horizontal scroll for large ranges
        }}
      >
        {/* Rail */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 2,
            bgcolor: "divider",
            transform: "translateY(-50%)",
          }}
        />

        {/* Events */}
        {data.map((it, i) => {
          const x = positions[i] ?? 0;
          const above = !alternateLabels ? true : i % 2 === 0;

          return (
            <Box
              key={`${it.pmc_id}-${i}`}
              sx={{
                position: "absolute",
                left: x,
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Hover target (dot) */}
              <Box
                onMouseEnter={handleEnter(i)}
                onMouseLeave={handleLeave}
                sx={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  bgcolor: "text.primary",
                  boxShadow: 1,
                  cursor: "pointer",
                }}
              />

              {/* Labels (static) */}
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  ...(above ? { bottom: labelOffset } : { top: labelOffset }),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.2 }}
                >
                  {/* hydration-safe */}
                  <span suppressHydrationWarning>{fmtDate.format(it.date)}</span>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {it.pmc_id}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {/* Hover Card (single Popper, content from hovered item) */}
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="top"
          modifiers={[
            { name: "offset", options: { offset: [0, 12] } }, // shift above the dot
            { name: "preventOverflow", options: { padding: 8 } },
          ]}
        >
          {hoverIndex !== null && (
            <Paper
              elevation={8}
              onMouseEnter={() => {/* keep open if moving onto card (optional) */}}
              onMouseLeave={handleLeave}
              sx={{
                p: 1.25,
                minWidth: 240,
                maxWidth: 320,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                <span suppressHydrationWarning>
                  {fmtDate.format(data[hoverIndex].date)}
                </span>
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {data[hoverIndex].Title}
              </Typography>
            </Paper>
          )}
        </Popper>
      </Box>
    </Box>
  );
}
