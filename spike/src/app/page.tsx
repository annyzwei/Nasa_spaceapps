import Image from "next/image";
import styles from "./page.module.css";
import {Typography} from "@mui/material";

export default function Home() {
  return (
    <div className={styles.page}>
      <Typography variant="h1">SPIKE!</Typography>
      <Typography variant="h5">Wow! A dashboard!</Typography>
    </div>
  );
}
