import React from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TablePagination,
  Stack, Paper, Link as MUILink,
  createTheme, ThemeProvider, Chip, Typography, Box, Divider, Card, CardContent,
  CircularProgress
} from "@mui/material";
import publications from "./SB_publication_PMC.json";
import summary from "./summary.json";
import SearchBar from "./searchBar";
import SummaryViewer from "./SummaryViewer";

// ---------------- Theme (dark) ----------------
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#000", paper: "#000" },
    text: { primary: "#fff", secondary: "rgba(255,255,255)" },
    divider: "rgba(255,255,255,0.2)",
  },
  typography: {
    fontFamily: 'var(--font-inter), Helvetica, Arial, system-ui, sans-serif',
  },
});

// ---------------- Types ----------------
 type Order = "asc" | "desc";
 export type Pub = {
  Title: string;
  Link: string;
  pmid: string | number;
  DP: string;
  AU?: string;
  AB?: string;
  pmc_id?: string;
  tags?: string[];
};

export type Filters = {
  title: string;
  link: string;
  pmidMin: string;
  pmidMax: string;
  dateFrom: string;
  dateTo: string;
  includeTags: string[];
  includeLogic: "AND" | "OR";
  excludeTags: string[];
};

// AI summary record (shape of data coming back from backend)
 type SummaryRecord = {
  pmid?: string | number;
  pmc_id?: string;
  title?: string;
  link?: string;
  summary?: string;
  key_findings?: string[];
  limitations?: string[];
  future_directions?: string[];
  sections?: Record<string, string>;
};

// ---------------- Utilities ----------------
function compare(a: unknown, b: unknown) {
  const A = a instanceof Date ? a.getTime() : (a as any);
  const B = b instanceof Date ? b.getTime() : (b as any);
  if (A == null && B == null) return 0;
  if (A == null) return -1;
  if (B == null) return 1;
  if (typeof A === "number" && typeof B === "number") return A - B;
  return String(A).localeCompare(String(B), undefined, { numeric: true, sensitivity: "base" });
}
function getComparator(order: Order, orderBy: keyof Pub) {
  return (a: Pub, b: Pub) => {
    const va = orderBy === "DP" ? new Date(a.DP || "") : (a[orderBy] as unknown);
    const vb = orderBy === "DP" ? new Date(b.DP || "") : (b[orderBy] as unknown);
    const cmp = compare(va, vb);
    return order === "asc" ? cmp : -cmp;
  };
}
function stableSort<T>(arr: readonly T[], cmp: (a: T, b: T) => number): T[] {
  return arr.map((el, i) => [el, i] as const)
            .sort((a, b) => (cmp(a[0], b[0]) || a[1] - b[1]))
            .map(([el]) => el);
}
function matchesFilters(item: Pub, filters: Filters) {
  const titleMatch = !filters.title || item.Title.toLowerCase().includes(filters.title.toLowerCase());
  const linkMatch = !filters.link || item.Link.toLowerCase().includes(filters.link.toLowerCase());

  const pmidMatch =
    (!filters.pmidMin || Number(item.pmid) >= Number(filters.pmidMin)) &&
    (!filters.pmidMax || Number(item.pmid) <= Number(filters.pmidMax));

  const dateMatch =
    (!filters.dateFrom || new Date(item.DP) >= new Date(filters.dateFrom)) &&
    (!filters.dateTo || new Date(item.DP) <= new Date(filters.dateTo));

  const itemTags = item.tags ?? [];
  const includeMatch =
    filters.includeTags.length === 0 ||
    (filters.includeLogic === "AND"
      ? filters.includeTags.every((tag) => itemTags.includes(tag))
      : filters.includeTags.some((tag) => itemTags.includes(tag)));

  const excludeMatch =
    filters.excludeTags.length === 0 ||
    !filters.excludeTags.some((tag) => itemTags.includes(tag));

  return titleMatch && linkMatch && pmidMatch && dateMatch && includeMatch && excludeMatch;
}

// ---------------- Build payload to send to backend ----------------
function buildLiveQuery(pub: Pub) {
  const title = String(pub.Title ?? "").replace(/\s+/g, " ").trim();
  const pmcFromLink = pub.Link?.match(/PMC\d+/i)?.[0]?.toUpperCase();
  return {
    title, // ← parsed title string you asked for
    pmid: pub.pmid ? String(pub.pmid) : "",
    pmc_id: (pub.pmc_id ?? pmcFromLink ?? "").toUpperCase(),
    link: pub.Link ?? ""
  };
}

// // ---------------- Summary Viewer ----------------
// function SummaryViewer({
//   pub,
//   record,
//   loading,
//   error,
// }: {
//   pub: Pub | null;
//   record: SummaryRecord | null;
//   loading: boolean;
//   error: string | null;
// }) {
//   if (!pub) {
//     return (
//       <Paper sx={{ p: 2, bgcolor: "background.paper", borderLeft: "1px solid", borderColor: "divider" }}>
//         <Typography variant="h6" gutterBottom>Summary</Typography>
//         <Typography variant="body2" color="text.secondary">
//           Select a paper from the table to see its summary.
//         </Typography>
//       </Paper>
//     );
//   }

//   return (
//     <Paper sx={{ p: 2, bgcolor: "background.paper", borderLeft: "1px solid", borderColor: "divider", maxHeight: "80vh", overflow: "auto" }}>
//       <Stack spacing={1.5}>
//         <Typography variant="overline" color="text.secondary">Selected Paper</Typography>
//         <Typography variant="h6" sx={{ fontWeight: 600 }}>{pub.Title}</Typography>
//         <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
//           {pub.pmid && <Chip size="small" label={`PMID: ${pub.pmid}`} />}
//           {pub.pmc_id && <Chip size="small" label={`PMC: ${pub.pmc_id}`} />}
//           <MUILink href={pub.Link} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
//             Open article
//           </MUILink>
//         </Stack>

//         <Divider sx={{ my: 1 }} />

//         {loading && (
//           <Stack direction="row" spacing={1} alignItems="center">
//             <CircularProgress size={18} />
//             <Typography variant="body2">Generating live summary…</Typography>
//           </Stack>
//         )}

//         {error && (
//           <Typography variant="body2" color="error">{error}</Typography>
//         )}

//         {!loading && !record && !error && (
//           <Typography variant="body2" color="text.secondary">
//             No summary found for this paper yet. Generate one from the backend and refresh.
//           </Typography>
//         )}

//         {!loading && record?.summary && (
//           <Card variant="outlined">
//             <CardContent>
//               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Overview</Typography>
//               <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>{record.summary}</Typography>
//             </CardContent>
//           </Card>
//         )}

//         {!loading && record?.key_findings && record.key_findings.length > 0 && (
//           <Card variant="outlined">
//             <CardContent>
//               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Key Findings</Typography>
//               <Box component="ul" sx={{ pl: 3, m: 0 }}>
//                 {record.key_findings.map((it, i) => (
//                   <li key={i}><Typography variant="body2">{it}</Typography></li>
//                 ))}
//               </Box>
//             </CardContent>
//           </Card>
//         )}

//         {!loading && record?.limitations && record.limitations.length > 0 && (
//           <Card variant="outlined">
//             <CardContent>
//               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Limitations</Typography>
//               <Box component="ul" sx={{ pl: 3, m: 0 }}>
//                 {record.limitations.map((it, i) => (
//                   <li key={i}><Typography variant="body2">{it}</Typography></li>
//                 ))}
//               </Box>
//             </CardContent>
//           </Card>
//         )}

//         {!loading && record?.future_directions && record.future_directions.length > 0 && (
//           <Card variant="outlined">
//             <CardContent>
//               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Future Directions</Typography>
//               <Box component="ul" sx={{ pl: 3, m: 0 }}>
//                 {record.future_directions.map((it, i) => (
//                   <li key={i}><Typography variant="body2">{it}</Typography></li>
//                 ))}
//               </Box>
//             </CardContent>
//           </Card>
//         )}

//         {!loading && record?.sections && (
//           <Card variant="outlined">
//             <CardContent>
//               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Sections</Typography>
//               <Stack spacing={1}>
//                 {Object.entries(record.sections).map(([k, v]) => (
//                   <Box key={k}>
//                     <Typography variant="subtitle2" sx={{ textTransform: "capitalize", fontWeight: 600 }}>{k}</Typography>
//                     <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>{v}</Typography>
//                   </Box>
//                 ))}
//               </Stack>
//             </CardContent>
//           </Card>
//         )}
//       </Stack>
//     </Paper>
//   );
// }

// =====================================================
// MainView: table (left) + summary viewer (right)
// =====================================================
export default function MainView() {
  const [orderBy, setOrderBy] = React.useState<keyof Pub>("Title");
  const [order, setOrder] = React.useState<Order>("asc");
  const [selected, setSelected] = React.useState<Pub | null>(null);

  // pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);

  const [filters, setFilters] = React.useState<Filters>({
    title: "",
    link: "",
    pmidMin: "",
    pmidMax: "",
    dateFrom: "",
    dateTo: "",
    includeTags: [],
    includeLogic: "AND",
    excludeTags: []
  });
  
  // Filter publications for the left table
  const filtered = React.useMemo(() => {
    const list = publications as Pub[];
    return list.filter((item) => matchesFilters(item, filters));
  }, [filters]);
  
  const rows = React.useMemo(
    () => stableSort(filtered, getComparator(order, orderBy)),
    [filtered, order, orderBy]
  );
  const paginatedRows = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  

  const [liveSummary, setLiveSummary] = React.useState<SummaryRecord | null>(null);
  const [liveLoading, setLiveLoading] = React.useState(false);
  const [liveError, setLiveError] = React.useState<string | null>(null);

  const handleSort = (property: keyof Pub) => () => {
    if (orderBy === property) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setOrderBy(property); setOrder("asc"); }
  };

  // Build a quick lookup map using pmid & pmc_id for static summaries
  const summaryIndex = React.useMemo(() => {
    const map = new Map<string, SummaryRecord>();
    (summary as SummaryRecord[]).forEach((r) => {
      if (r.pmid != null) map.set(String(r.pmid), r);
      if (r.pmc_id) map.set(String(r.pmc_id).toUpperCase(), r);
    });
    return map;
  }, []);

  const getSummaryFor = React.useCallback((pub: Pub | null): SummaryRecord | null => {
    if (!pub) return null;
    const byPMID = pub.pmid != null ? summaryIndex.get(String(pub.pmid)) : null;
    if (byPMID) return byPMID;

    const byPMC = pub.pmc_id ? summaryIndex.get(String(pub.pmc_id).toUpperCase()) : null;
    if (byPMC) return byPMC;

    const m = pub.Link?.match(/PMC\d+/i);
    if (m) {
      const byLinkPMC = summaryIndex.get(m[0].toUpperCase());
      if (byLinkPMC) return byLinkPMC;
    }
    return null;
  }, [summaryIndex]);

  const summaryRecord = React.useMemo(() => getSummaryFor(selected), [getSummaryFor, selected]);

  const applyFilters = (next: Filters) => setFilters(next);
  const clearFilters = () => setFilters({
    title: "",
    link: "",
    pmidMin: "",
    pmidMax: "",
    dateFrom: "",
    dateTo: "",
    includeTags: [],
    includeLogic: "AND",
    excludeTags: []
  });

  // ---------------- Live fetch (COMMENTED backend call + working mock) ----------------
  async function fetchLiveSummary(pub: Pub) {
    setLiveLoading(true);
    setLiveError(null);
    setLiveSummary(null);

    const payload = buildLiveQuery(pub); // ← contains the parsed title string

    try {
      // TODO(Hany): INTEGRATE WITH YOUR BACKEND MODULES HERE
      // Option A: Call your Flask endpoint (uncomment this block and remove the mock)
    
      // const res = await fetch("/api/summarize_title", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) {
      //   throw new Error(await res.text());
      // // }
      // const data = await res.json();
      // setLiveSummary(data.json ?? data); // expect SummaryRecord
     

      // ---- MOCK so the UI works now. Remove after hooking backend. ----
      await new Promise((r) => setTimeout(r, 400));
      setLiveSummary({
        title: payload.title,
        pmid: payload.pmid,
        pmc_id: payload.pmc_id,
        summary: `Live summary placeholder for: ${payload.title}`,
        key_findings: [
          "Finding A (placeholder)",
          "Finding B (placeholder)",
        ],
        limitations: ["Limitation example (placeholder)"]
      });
      // ---------------------------------------------------------------
    } catch (err: any) {
      setLiveError(err?.message || "Failed to fetch summary");
    } finally {
      setLiveLoading(false);
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      {/* Force side-by-side layout at all widths */}
      <SearchBar value={filters} onApply={applyFilters} onClear={clearFilters} />
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", width: "100%" }}>
        {/* Left: Table */}
        
        <Box sx={{ flex: 7, minWidth: 0 }}>
          <Paper sx={{ p: 2, bgcolor: "background.paper", minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <div style={{ fontWeight: 600 }}>Publications</div>
            </Stack>

            <TableContainer sx={{ bgcolor: "background.paper", overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={orderBy === "pmid" ? order : false} sx={{ color: "text.primary" }}>
                      <TableSortLabel
                        active={orderBy === "pmid"}
                        direction={orderBy === "pmid" ? order : "asc"}
                        onClick={() => setOrderBy("pmid")}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "text.primary" },
                          "&.Mui-active": { color: "text.primary" },
                          "& .MuiTableSortLabel-icon": { color: "text.primary !important" },
                        }}
                      >
                        PMID
                      </TableSortLabel>
                    </TableCell>

                    <TableCell sortDirection={orderBy === "pmc_id" ? order : false} sx={{ color: "text.primary" }}>
                      <TableSortLabel
                        active={orderBy === "pmc_id"}
                        direction={orderBy === "pmc_id" ? order : "asc"}
                        onClick={() => setOrderBy("pmc_id")}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "text.primary" },
                          "&.Mui-active": { color: "text.primary" },
                          "& .MuiTableSortLabel-icon": { color: "text.primary !important" },
                        }}
                      >
                        PMC ID
                      </TableSortLabel>
                    </TableCell>

                    <TableCell sortDirection={orderBy === "Title" ? order : false} sx={{ color: "text.primary" }}>
                      <TableSortLabel
                        active={orderBy === "Title"}
                        direction={orderBy === "Title" ? order : "asc"}
                        onClick={() => setOrderBy("Title")}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "text.primary" },
                          "&.Mui-active": { color: "text.primary" },
                          "& .MuiTableSortLabel-icon": { color: "text.primary !important" },
                        }}
                      >
                        Article Title
                      </TableSortLabel>
                    </TableCell>

                    <TableCell sx={{ color: "text.primary" }}>Link</TableCell>

                    <TableCell align="right" sortDirection={orderBy === "DP" ? order : false} sx={{ color: "text.primary" }}>
                      <TableSortLabel
                        active={orderBy === "DP"}
                        direction={orderBy === "DP" ? order : "asc"}
                        onClick={() => setOrderBy("DP")}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "text.primary" },
                          "&.Mui-active": { color: "text.primary" },
                          "& .MuiTableSortLabel-icon": { color: "text.primary !important" },
                        }}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedRows.map((pub, index) => {
                    const isSelected = selected?.pmid === pub.pmid;
                    return (
                      <TableRow
                        key={index}
                        hover
                        onClick={() => { setSelected(pub); fetchLiveSummary(pub); }}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
                          ...(isSelected && { backgroundColor: "rgba(255,255,255,0.10)" })
                        }}
                      >
                        <TableCell sx={{ color: "text.primary" }}>{pub.pmid}</TableCell>
                        <TableCell sx={{ color: "text.primary" }}>{pub.pmc_id ?? "-"}</TableCell>
                        <TableCell sx={{ color: "text.primary" }}>{pub.Title}</TableCell>
                        <TableCell sx={{ color: "text.primary" }}>
                          <MUILink href={pub.Link} target="_blank" rel="noopener noreferrer" color="inherit" underline="hover">
                            {pub.Link}
                          </MUILink>
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.primary" }}>{pub.DP}</TableCell>
                      </TableRow>
                    );
                  })}
                    {paginatedRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No matches</TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 20, 50]}
              component="div"
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0); // reset to first page
              }}
              sx={{ color: "text.primary" }}
            />
          </Paper>
        </Box>

        {/* Right: Summary panel */}
        <Box sx={{ flex: 5, minWidth: 0, position: "sticky", top: 16 }}>
          <SummaryViewer title={selected?.Title} />
        </Box>
      </Stack>
    </ThemeProvider>
  );
}
