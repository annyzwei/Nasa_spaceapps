"use client";

import Image from "next/image";
import styles from "./page.module.css";
import {Box, Button, Input, TextField, Typography} from "@mui/material";
import { useEffect, useState } from "react";

import ThreeScene from "../components/componentJs.jsx"
import MainView from "../components/mainView";
import TimeScaledTimeline from "../components/SimpleTimeline";
import summary from "../components/summary.json";
import tree from "../components/subjects_tree.json";
import SubjectTree from "../components/SubjectTree";
import SummaryViewer from "../components/SummaryViewer";
import AI_SUM from "../components/AI_SUM.json";


export default function Home() {

  const [msg, setMsg] = useState("");
  const [search, setSearchVal] = useState("");
  const [color, setColor] = useState("red");

  const items = [
      { when: "2025-01-10", title: "Plan" },
      { when: "2025-02-02", title: "Design" },
      { when: "2025-03-12", title: "Build" },
      { when: "2025-04-20", title: "Launch" },
    ];

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/hello")
      .then(res => res.json())
      .then(data => setMsg(data.msg));
  }, []);

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
    <MainView/>
    <TimeScaledTimeline items={summary}/>
    <ThreeScene/>
    <SubjectTree data={tree} defaultOpenDepth={1} />
  </>
  );
}
