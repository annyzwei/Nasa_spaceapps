"use client";

import Image from "next/image";
import styles from "./page.module.css";
import {Button, Input, TextField, Typography} from "@mui/material";
import { useEffect, useState } from "react";

import ThreeScene from "./../components/componentJs.jsx"

export default function Home() {

  const [msg, setMsg] = useState("");
  const [search, setSearchVal] = useState("");
  const [color, setColor] = useState("red");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/hello")
      .then(res => res.json())
      .then(data => setMsg(data.msg));
  }, []);

  return (
    <>
    <div className={styles.page} style={{backgroundColor: color}}>
      <Typography variant="h1">SPIKE!</Typography>
      <Typography variant="h5">{msg + search}</Typography>
      <TextField
        label="search"
        value={search}
        onChange={(e) => setSearchVal(e.target.value)}
        fullWidth
      />
      <Button onClick={() => {if (color == "red") setColor("green"); else setColor("red")}} sx={{backgroundColor: "white"}}></Button>
    </div>
    <ThreeScene/>
  </>
  );
}
