// SimpleTimeline.tsx
import * as React from "react";
import { Box, Typography, IconButton, Paper } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
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
  pxPerDay?: number;
  minHeight?: number;
  maxHeight?: number;
  padY?: number;
  gutter?: number;
  dotSize?: number;
  alternateLabels?: boolean;
  align?: "left" | "center" | "right";
  plUnits?: number;
  offsetPx?: number;
  minGapPx?: number;
  labelBlockPx?: number;
  heightPx?: number;
  onClick?: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
  labelBlockPx = 80,
  heightPx,
}: Props) {
  const data = React.useMemo(
    () =>
      [...items]
        .map((i) => ({ ...i, date: parseDateStable(i.DP) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [items]
  );

  const { spanDays, contentHeight } = React.useMemo(() => {
    if (!data.length) return { spanDays: 1, contentHeight: heightPx ?? minHeight };
    const t0 = data[0].date.getTime();
    const t1 = data[data.length - 1].date.getTime();
    const days = Math.max(1, (t1 - t0) / 86_400_000);

    if (typeof heightPx === "number") return { spanDays: days, contentHeight: heightPx };

    const auto = Math.round(days * pxPerDay) + padY * 2;
    return { spanDays: days, contentHeight: clamp(auto, minHeight, maxHeight) };
  }, [data, pxPerDay, padY, minHeight, maxHeight, heightPx]);

  const positions = React.useMemo(() => {
    if (!data.length) return [] as number[];
    const railSpan = contentHeight - padY * 2;
    const t0 = data[0].date.getTime();
    let ys =
      spanDays <= 0
        ? data.map((_, i) => padY + (railSpan * i) / Math.max(1, data.length - 1))
        : data.map(
            (d) => padY + (((d.date.getTime() - t0) / 86_400_000) / spanDays) * railSpan
          );

    const requiredGap = Math.max(minGapPx, labelBlockPx);
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < requiredGap) ys[i] = ys[i - 1] + requiredGap;
    }

    const end = padY + railSpan;
    if ((ys[ys.length - 1] ?? padY) > end && ys.length > 1) {
      const y0 = ys[0];
      const yN = ys[ys.length - 1];
      const denom = Math.max(1, yN - y0);
      for (let i = 0; i < ys.length; i++) {
        const t = (ys[i] - y0) / denom;
        ys[i] = padY + t * railSpan;
      }
    }
    return ys;
  }, [data, spanDays, contentHeight, padY, minGapPx, labelBlockPx]);

  const justify =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <Box sx={{ display: "flex", justifyContent: justify, pl: plUnits, py: 3 }}>
      <Box
        sx={{
          position: "relative",
          width: 720,
          maxWidth: "100%",
          height: contentHeight,
          left: offsetPx,
        }}
      >
        {/* Rail */}
        <Box sx={{ position: "absolute", top: 0, bottom: 0, width: 2, bgcolor: "divider" }} />

        {/* Events */}
        {data.map((it, i) => {
          const y = positions[i] ?? 0;
          const placeLeft = alternateLabels && i % 2 === 1;
          const boxSide = placeLeft ? "left" : "right";
          const labelX = placeLeft ? gutter - 12 : gutter + 12;
          const labelTransform = placeLeft ? "translate(-100%, -50%)" : "translateY(-50%)";

          return (
            <React.Fragment key={`${it.pmc_id}-${i}`}>
              {/* Dot */}
              <Box
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
                }}
              />

              {/* Label Box */}
              <Paper
                variant="outlined"
                sx={{
                  position: "absolute",
                  left: labelX,
                  top: y,
                  transform: labelTransform,
                  p: 1.2,
                  pr: 2.2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? theme.palette.grey[900]
                      : theme.palette.grey[100],
                  borderColor: "divider",
                  borderRadius: 2,
                  minWidth: 220,
                  maxWidth: 400,
                  boxShadow: 1,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    [boxSide]: "-8px",
                    width: 0,
                    height: 0,
                    borderTop: "6px solid transparent",
                    borderBottom: "6px solid transparent",
                    borderRight: placeLeft ? "8px solid" : undefined,
                    borderLeft: !placeLeft ? "8px solid" : undefined,
                    borderRightColor: placeLeft ? "divider" : undefined,
                    borderLeftColor: !placeLeft ? "divider" : undefined,
                    transform: "translateY(-50%)",
                  },
                }}
              >
                {/* Date */}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  <span suppressHydrationWarning>{fmtDate.format(it.date)}</span>
                </Typography>

                {/* Title + Link */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#ffffff", // white title text
                      flexGrow: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={it.Title}
                  >
                    {it.Title}
                  </Typography>
                  {it.Link && (
                    <IconButton
                      size="small"
                      href={it.Link}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ color: "primary.main" }}
                    >
                      <LinkIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {/* Authors */}
                {it.AU && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={it.AU}
                  >
                    {it.AU}
                  </Typography>
                )}
              </Paper>
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
