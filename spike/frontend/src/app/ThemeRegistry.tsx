"use client";

import * as React from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";

function createEmotionCache() {
  return createCache({ key: "mui", prepend: true });
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(() => {
    const c = createEmotionCache();
    // @ts-ignore
    c.compat = true;
    return c;
  });
  const [flush, setFlush] = React.useState<null | (() => React.ReactNode[])>(null);

  useServerInsertedHTML(() => {
    if (!flush) return null;
    const styles = flush();
    return <>{styles}</>;
  });

  React.useLayoutEffect(() => {
    // @ts-ignore
    setFlush(() => cache.inserted ? () => {
      // Collect and clear emotion styles inserted on server
      const styles = Object.keys(cache.inserted).map((key) => (
        <style
          key={key}
          data-emotion={`${cache.key}-${key}`}
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: cache.inserted[key] }}
        />
      ));
      // @ts-ignore
      cache.inserted = {};
      return styles;
    } : () => []);
  }, [cache]);

  const theme = createTheme();

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
