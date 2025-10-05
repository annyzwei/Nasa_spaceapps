import React from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TextField, InputAdornment, Stack, Paper, Link as MUILink,
  createTheme, ThemeProvider, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Grid
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import publications from "./SB_publication_PMC.json";
import summary from "./summary.json";
import SearchDialog from "./searchDialog";
import tree from "subjects_tree.json";

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
export type Pub = { Title: string; Link: string; DP: string; pmc_id: string; pmid: string; AB: string; AU: string; };
export type Filters = {
  title: string;
  link: string;
  pmidMin: string; // keep as string for TextField control
  pmidMax: string;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;   // yyyy-mm-dd
};

// ---------------- Utilities ----------------
function compare(a: unknown, b: unknown) {
  const A = a instanceof Date ? a.getTime() : a;
  const B = b instanceof Date ? b.getTime() : b;
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

// =====================================================
// MainView: uses SearchDialog; sorting, filtering, dark theme
// =====================================================
export default function MainView() {
  const [orderBy, setOrderBy] = React.useState<keyof Pub>("Title");
  const [order, setOrder] = React.useState<Order>("asc");
  const [open, setOpen] = React.useState(false);

  const [filters, setFilters] = React.useState<Filters>({
    title: "",
    link: "",
    pmidMin: "",
    pmidMax: "",
    dateFrom: "",
    dateTo: "",
  });

  const handleSort = (property: keyof Pub) => () => {
    if (orderBy === property) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setOrderBy(property); setOrder("asc"); }
  };

  // Filtering
  const filtered = React.useMemo(() => {
    const list = summary as Pub[];

    const t = filters.title.trim().toLowerCase();
    const l = filters.link.trim().toLowerCase();
    const pmidMin = filters.pmidMin ? Number(filters.pmidMin) : null;
    const pmidMax = filters.pmidMax ? Number(filters.pmidMax) : null;
    const df = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dt = filters.dateTo ? new Date(filters.dateTo) : null;

    return list.filter((p) => {
      if (t && !p.Title?.toLowerCase().includes(t)) return false;
      if (l && !p.Link?.toLowerCase().includes(l)) return false;
      if (pmidMin !== null && Number.isFinite(pmidMin) && !(Number(p.pmid) >= pmidMin)) return false;
      if (pmidMax !== null && Number.isFinite(pmidMax) && !(Number(p.pmid) <= pmidMax)) return false;
      if (df || dt) {
        const d = new Date(p.DP || "");
        if (df && !(d >= df)) return false;
        if (dt && !(d <= dt)) return false;
      }
      return true;
    });
  }, [filters]);

  const rows = React.useMemo(
    () => stableSort(filtered, getComparator(order, orderBy)),
    [filtered, order, orderBy]
  );

  // Dialog callbacks
  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);
  const applyFilters = (next: Filters) => { setFilters(next); setOpen(false); };
  const clearFilters = () => {
    const empty: Filters = { title: "", link: "", pmidMin: "", pmidMax: "", dateFrom: "", dateTo: "" };
    setFilters(empty);
    setOpen(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <div style={{ fontWeight: 600 }}>Publications</div>
          <IconButton onClick={openDialog} size="small" aria-label="Open search filters">
            <SearchIcon sx={{ color: "text.primary" }} />
          </IconButton>
        </Stack>

        {/* Search dialog component */}
        <SearchDialog open={open} value={filters} onApply={applyFilters} onClose={closeDialog} onClear={clearFilters} />

        <TableContainer sx={{ bgcolor: "background.paper" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === "pmid" ? order : false} sx={{ color: "text.primary" }}>
                  <TableSortLabel
                    active={orderBy === "pmid"}
                    direction={orderBy === "pmid" ? order : "asc"}
                    onClick={handleSort("pmid")}
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
                    onClick={handleSort("pmc_id")}
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
                    onClick={handleSort("Title")}
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
                    onClick={handleSort("DP")}
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
              {rows.map((pub, index) => (
                <TableRow key={index} hover sx={{ "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" } }}>
                  <TableCell sx={{ color: "text.primary" }}>{pub.pmid}</TableCell>
                  <TableCell sx={{ color: "text.primary" }}>{pub.pmc_id}</TableCell>
                  <TableCell sx={{ color: "text.primary" }}>{pub.Title}</TableCell>
                  <TableCell sx={{ color: "text.primary" }}>
                    <MUILink href={pub.Link} target="_blank" rel="noopener noreferrer" color="inherit" underline="hover">
                      {pub.Link}
                    </MUILink>
                  </TableCell>
                  <TableCell align="right" sx={{ color: "text.primary" }}>{pub.DP}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: "text.primary" }}>
                    No matches
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </ThemeProvider>
  );
}
