"use client";

import { useState } from "react";
import { Box, Button, Stack } from "@mui/material";

import MainView from "../components/mainView";
import TimeScaledTimeline from "../components/SimpleTimeline";
import summary from "../components/summary.json";
import tree from "../components/subjects_tree.json";
import SubjectTree from "../components/SubjectTree";
import TeamTitle from "../components/TeamTitle";
import PrettyGlobe from "../components/PrettyGlobe";
import SummaryViewer from "../components/SummaryViewer";
import AI_SUM from "../components/AI_SUM.json";

export default function Home() {
  const [view, setView] = useState<"results" | "timeline">("results");

  return (
    <>
    {/* <div className={styles.page} style={{backgroundColor: color}}>
      <Typography variant="h1">SPIKE!</Typography>
      <Typography variant="h5">{msg + search}</Typography>
      <TextField
        label="search"
        value={search}
        onChange={(e) => setSearchVal(e.target.value)}
        fullWidth
      />
      <Button onClick={() => {if (color == "red") setColor("green"); else setColor("red")}} sx={{backgroundColor: "white"}}></Button>
    </div> */}
    <TeamTitle teamName="SPIKE" exclamations={3} />
    <MainView/>
    <TimeScaledTimeline items={summary}/>
    <PrettyGlobe/>
    <SubjectTree data={tree} defaultOpenDepth={1} />
  </>
  );
}
