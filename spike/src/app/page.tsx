"use client";

import Image from "next/image";
import styles from "./page.module.css";
import {Typography} from "@mui/material";
import { useEffect, useState } from "react";



export default function Home() {

  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/hello")
      .then(res => res.json())
      .then(data => setMsg(data.msg));
  }, []);

  return (
    <div className={styles.page}>
      <Typography variant="h1">SPIKE!</Typography>
      <Typography variant="h5">{msg}</Typography>
    </div>
  );
}
