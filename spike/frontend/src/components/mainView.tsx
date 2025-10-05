import React, { useState, useMemo, useCallback } from "react";
import { Paper, Stack, Typography, Chip, Link as MUILink, Box } from "@mui/material";
import summary from "./summary.json";
import SearchBar from "./searchBar";
import { Pub, Filters } from "./types";

// ---------------- Helper functions ----------------

// Highlight matched words in a string
function highlight(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.split(" ").join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <span key={i} style={{ backgroundColor: "#ffeb3b", color: "#000" }}>{part}</span> : part
  );
}

// Truncate text
function truncate(text: string, length: number) {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "…" : text;
}

// Color for year (more recent = brighter)
function getYearColor(year: number) {
  const age = new Date().getFullYear() - year;
  if (age <= 1) return "#4caf50";
  if (age <= 5) return "#ff9800";
  return "#9e9e9e";
}

// Matches filters function
function matchesFilters(item: Pub, filters: Filters) {
  const titleMatch = !filters.title || item.Title.toLowerCase().includes(filters.title.toLowerCase());
  const linkMatch = !filters.link || item.Link.toLowerCase().includes(filters.link.toLowerCase());
  
  const pmidMatch =
    (!filters.pmidMin || Number(item.pmid) >= Number(filters.pmidMin)) &&
    (!filters.pmidMax || Number(item.pmid) <= Number(filters.pmidMax));

  const dateMatch =
    (!filters.dateFrom || new Date(item.DP) >= new Date(filters.dateFrom)) &&
    (!filters.dateTo || new Date(item.DP) <= new Date(filters.dateTo));

  const includeMatch =
    filters.includeTags.length === 0 ||
    (filters.includeLogic === "AND"
      ? filters.includeTags.every((tag) => item.tags.includes(tag))
      : filters.includeTags.some((tag) => item.tags.includes(tag)));

  const excludeMatch =
    filters.excludeTags.length === 0 ||
    !filters.excludeTags.some((tag) => item.tags.includes(tag));

  return titleMatch && linkMatch && pmidMatch && dateMatch && includeMatch && excludeMatch;
}

// ---------------- Main Component ----------------
export default function SearchResults() {
  const [filters, setFilters] = useState<Filters>({
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

  // Infinite scroll / lazy loading
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = useMemo(() => {
    const list = summary as Pub[];
    return list.filter((item) => matchesFilters(item, filters));
  }, [filters]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 20);
  }, []);

  // Scroll event to trigger lazy load
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {/* Search bar */}
      <SearchBar value={filters} onApply={setFilters} onClear={() => setFilters({
        title: "", link: "", pmidMin: "", pmidMax: "", dateFrom: "", dateTo: "",
        includeTags: [], includeLogic: "AND", excludeTags: []
      })} />

      {filtered.length === 0 && <Typography>No matches</Typography>}

      {filtered.slice(0, visibleCount).map((pub, index) => {
        const year = new Date(pub.DP).getFullYear();
        return (
          <Paper key={index} sx={{
            p: 2, bgcolor: "#121212", cursor: "pointer",
            "&:hover": { boxShadow: 3 }
          }}>
            <Stack spacing={0.5}>
              {/* Title with highlight */}
              <MUILink href={pub.Link} target="_blank" rel="noopener noreferrer" underline="hover">
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                  {highlight(pub.Title, filters.title)}
                </Typography>
              </MUILink>

              {/* Authors + year + tags */}
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Typography sx={{ color: "#aaa" }}>{pub.AU || "Unknown authors"}</Typography>
                <Typography sx={{ color: getYearColor(year), fontWeight: 500 }}>{year}</Typography>
                {pub.tags?.map(tag => (
                  <Chip key={tag} label={tag} size="small" sx={{ bgcolor: "#333", color: "#fff" }} />
                ))}
              </Stack>

              {/* IDs */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`PMID: ${pub.pmid}`} size="small" sx={{ bgcolor: "#555", color: "#fff" }} />
                {pub.pmc_id && <Chip label={`PMC: ${pub.pmc_id}`} size="small" sx={{ bgcolor: "#555", color: "#fff" }} />}
              </Stack>

              {/* Abstract snippet */}
              {pub.AB && <Typography sx={{ color: "#ccc" }}>{truncate(pub.AB, 200)}</Typography>}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
