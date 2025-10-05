"use client";

import { useState } from "react";
import { Box, Button, Stack } from "@mui/material";

import MainView from "../components/mainView";
import TimeScaledTimeline from "../components/SimpleTimeline";

import summary from "../components/summary.json";
import TeamTitle from "../components/TeamTitle";

export default function Home() {
  const [view, setView] = useState<"results" | "timeline">("results");

  return (
    <>
    <TeamTitle teamName="SPIKE" exclamations={3} />

    <MainView />
    </>
  );
}
