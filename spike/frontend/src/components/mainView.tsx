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
import SearchBar from "./searchBar";


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
  Title: string;       // article title
  Link: string;        // URL or PMC link
  pmid: string | number; // PubMed ID
  DP: string;          // publication date (ISO string)
  AB?: string;         // abstract
  AU?: string;         // authors
  tags: string[];      // array of tag strings
}
export type Filters = {
  title: string;
  link: string;
  pmidMin: string; // keep as string for TextField control
  pmidMax: string;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;   // yyyy-mm-dd
  includeTags: string[];
  includeLogic: "AND" | "OR";
  excludeTags: string[];
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


function matchesFilters(item: Pub, filters: Filters) {
  const titleMatch = !filters.title || item.Title.toLowerCase().includes(filters.title.toLowerCase());
  const linkMatch = !filters.link || item.Link.toLowerCase().includes(filters.link.toLowerCase());
  
  const pmidMatch =
    (!filters.pmidMin || Number(item.pmid) >= Number(filters.pmidMin)) &&
    (!filters.pmidMax || Number(item.pmid) <= Number(filters.pmidMax));

  const dateMatch =
    (!filters.dateFrom || new Date(item.DP) >= new Date(filters.dateFrom)) &&
    (!filters.dateTo || new Date(item.DP) <= new Date(filters.dateTo));

  // Include tags logic
  const includeMatch =
    filters.includeTags.length === 0 ||
    (filters.includeLogic === "AND"
      ? filters.includeTags.every((tag) => item.tags.includes(tag))
      : filters.includeTags.some((tag) => item.tags.includes(tag)));

  // Exclude tags logic
  const excludeMatch =
    filters.excludeTags.length === 0 ||
    !filters.excludeTags.some((tag) => item.tags.includes(tag));

  return titleMatch && linkMatch && pmidMatch && dateMatch && includeMatch && excludeMatch;
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
    includeTags: [],
    includeLogic: "AND",
    excludeTags: []
  });

  const handleSort = (property: keyof Pub) => () => {
    if (orderBy === property) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setOrderBy(property); setOrder("asc"); }
  };

  // Filtering
  const filtered = React.useMemo(() => {
    const list = summary as Pub[];

    return list.filter((item) => matchesFilters(item, filters));
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
        </Stack>

        {/* Search dialog component */}
        <SearchBar value={filters} onApply={applyFilters} onClear={clearFilters} />

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
