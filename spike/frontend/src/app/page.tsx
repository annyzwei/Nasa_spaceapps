"use client";

import { useState } from "react";
import { Box, Button, Stack } from "@mui/material";

import MainView from "../components/mainView";
import TimeScaledTimeline from "../components/SimpleTimeline";

import summary from "../components/summary.json";

export default function Home() {
  const [view, setView] = useState<"results" | "timeline">("results");

  return (
    <Box sx={{ p: 2 }}>
      {/* Toggle buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={view === "results" ? "contained" : "outlined"}
          onClick={() => setView("results")}
        >
          Results
        </Button>
        <Button
          variant={view === "timeline" ? "contained" : "outlined"}
          onClick={() => setView("timeline")}
        >
          Timeline
        </Button>
      </Stack>

      {/* Conditional rendering */}
      {view === "results" && <MainView />}
      {view === "timeline" && <TimeScaledTimeline items={summary} />}
    </Box>
  );
}
