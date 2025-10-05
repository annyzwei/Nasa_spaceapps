// import React from "react";
// import {
//   TextField, InputAdornment, Button, IconButton, Grid,
//   Collapse, Stack, Paper
// } from "@mui/material";
// import SearchIcon from "@mui/icons-material/Search";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import ExpandLessIcon from "@mui/icons-material/ExpandLess";
// import { Filters } from "./mainView";
// import all_tags from "./all_tags.json";

// const allTags = Array.from(all_tags).sort();

// export default function SearchBar({
//   value,
//   onApply,
//   onClear,
// }: {
//   value: Filters;
//   onApply: (next: Filters) => void;
//   onClear: () => void;
// }) {
//   const [draft, setDraft] = React.useState<Filters>(value);
//   const [showAdvanced, setShowAdvanced] = React.useState(false);

//   const onChange = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
//     setDraft((prev) => ({ ...prev, [key]: e.target.value }));

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter") onApply(draft);
//   };

//   return (
//     <Paper sx={{ p: 2, mb: 2 }}>
//       {/* Always visible top bar */}
//       <Stack direction="row" spacing={2} alignItems="center">
//         <TextField
//           label="Search title"
//           fullWidth
//           value={draft.title}
//           onChange={onChange("title")}
//           onKeyDown={handleKeyDown}
          
//         />
//         <Button variant="contained" onClick={() => onApply(draft)}>
//           Search
//         </Button>
//         <IconButton onClick={() => setShowAdvanced((p) => !p)}>
//           {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
//         </IconButton>
//       </Stack>

//       {/* Advanced filters toggle */}
//       <Collapse in={showAdvanced} timeout="auto" unmountOnExit>
//         <Grid container spacing={2} mt={1}>
//           <Grid item xs={12}>
//             <TextField
//               label="Link contains"
//               fullWidth
//               value={draft.link}
//               onChange={onChange("link")}
//             />
//           </Grid>
//           <Grid item xs={6}>
//             <TextField
//               label="PMID min"
//               type="number"
//               fullWidth
//               value={draft.pmidMin}
//               onChange={onChange("pmidMin")}
//               inputProps={{ min: 0 }}
//             />
//           </Grid>
//           <Grid item xs={6}>
//             <TextField
//               label="PMID max"
//               type="number"
//               fullWidth
//               value={draft.pmidMax}
//               onChange={onChange("pmidMax")}
//               inputProps={{ min: 0 }}
//             />
//           </Grid>
//           <Grid item xs={6}>
//             <TextField
//               label="Date from"
//               type="date"
//               fullWidth
//               value={draft.dateFrom}
//               onChange={onChange("dateFrom")}
//               InputLabelProps={{ shrink: true }}
//             />
//           </Grid>
//           <Grid item xs={6}>
//             <TextField
//               label="Date to"
//               type="date"
//               fullWidth
//               value={draft.dateTo}
//               onChange={onChange("dateTo")}
//               InputLabelProps={{ shrink: true }}
//             />
//           </Grid>
                    
//           <Grid item xs={12}>
//             <Autocomplete
//               multiple
//               options={allTags}
//               value={draft.includeTags}
//               onChange={(_, newValue) => setDraft((prev) => ({ ...prev, includeTags: newValue }))}
//               renderTags={(value, getTagProps) =>
//                 value.map((option, index) => <Chip label={option} {...getTagProps({ index })} key={option} />)
//               }
//               renderInput={(params) => <TextField {...params} label="Include Tags" placeholder="Select tags to include" />}
//             />
//             <FormControl component="fieldset" sx={{ mt: 1 }}>
//               <FormLabel component="legend">Include Logic</FormLabel>
//               <RadioGroup
//                 row
//                 value={draft.includeLogic}
//                 onChange={(e) => setDraft((prev) => ({ ...prev, includeLogic: e.target.value as "AND" | "OR" }))}
//               >
//                 <FormControlLabel value="AND" control={<Radio />} label="AND" />
//                 <FormControlLabel value="OR" control={<Radio />} label="OR" />
//               </RadioGroup>
//             </FormControl>
//           </Grid>

//           <Grid item xs={12}>
//             <Autocomplete
//               multiple
//               options={allTags}
//               value={draft.excludeTags}
//               onChange={(_, newValue) => setDraft((prev) => ({ ...prev, excludeTags: newValue }))}
//               renderTags={(value, getTagProps) =>
//                 value.map((option, index) => <Chip label={option} {...getTagProps({ index })} key={option} />)
//               }
//               renderInput={(params) => <TextField {...params} label="Exclude Tags" placeholder="Select tags to exclude" />}
//             />
//           </Grid>

//         </Grid>

//         <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
//           <Button onClick={onClear}>Clear</Button>
//           <Button variant="contained" onClick={() => onApply(draft)}>Apply</Button>
//         </Stack>
//       </Collapse>
//     </Paper>
//   );
// // }import React from "react";
import React from "react";
import {
  TextField, Button, IconButton, Grid,
  Collapse, Stack, Paper, Chip, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Filters } from "./mainView";
import all_tags from "./all_tags.json";

const allTags = Array.from(all_tags).sort();

export function matchesFilters(item: any, filters: Filters) {
  const titleMatch = item.Title.toLowerCase().includes(filters.title.toLowerCase());
  const linkMatch = !filters.link || item.Link.includes(filters.link);
  const pmidMatch =
    (!filters.pmidMin || Number(item.pmid) >= filters.pmidMin) &&
    (!filters.pmidMax || Number(item.pmid) <= filters.pmidMax);
  const dateMatch =
    (!filters.dateFrom || item.DP >= filters.dateFrom) &&
    (!filters.dateTo || item.DP <= filters.dateTo);

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

export default function SearchBar({
  value,
  onApply,
  onClear,
}: {
  value: Filters;
  onApply: (next: Filters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = React.useState<Filters>(value);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const onChange = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onApply(draft);
  };

  const handleClear = () => {
    const reset: Filters = {
      title: "",
      link: "",
      pmidMin: undefined,
      pmidMax: undefined,
      dateFrom: "",
      dateTo: "",
      includeTags: [],
      excludeTags: [],
      includeLogic: "AND",
    };
    setDraft(reset);
    onClear();
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* Top bar */}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="Search title"
          fullWidth
          value={draft.title}
          onChange={onChange("title")}
          onKeyDown={handleKeyDown}
        />
        <Button variant="contained" onClick={() => onApply(draft)}>Search</Button>
        <IconButton onClick={() => setShowAdvanced((p) => !p)}>
          {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>

      {/* Advanced filters */}
      <Collapse in={showAdvanced} timeout="auto" unmountOnExit>
        {/* Main filters: link, PMID, date */}
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12}>
            <TextField
              label="Link contains"
              fullWidth
              value={draft.link}
              onChange={onChange("link")}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="PMID min"
              type="number"
              fullWidth
              value={draft.pmidMin}
              onChange={onChange("pmidMin")}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="PMID max"
              type="number"
              fullWidth
              value={draft.pmidMax}
              onChange={onChange("pmidMax")}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Date from"
              type="date"
              fullWidth
              value={draft.dateFrom}
              onChange={onChange("dateFrom")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Date to"
              type="date"
              fullWidth
              value={draft.dateTo}
              onChange={onChange("dateTo")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {/* Tag filters below everything else */}
        <Stack spacing={2} mt={2}>
          {/* Include Tags + AND/OR logic */}
          <Stack>
            <Autocomplete
              multiple
              options={allTags}
              value={draft.includeTags}
              onChange={(_, newValue) => setDraft((prev) => ({ ...prev, includeTags: newValue }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => <Chip label={option} {...getTagProps({ index })} key={option} />)
              }
              renderInput={(params) => <TextField {...params} label="Include Tags" placeholder="Select tags to include" />}
            />
            <FormControl component="fieldset" sx={{ mt: 1 }}>
              <FormLabel component="legend">Include Logic</FormLabel>
              <RadioGroup
                row
                value={draft.includeLogic}
                onChange={(e) => setDraft((prev) => ({ ...prev, includeLogic: e.target.value as "AND" | "OR" }))}
              >
                <FormControlLabel value="AND" control={<Radio />} label="AND" />
                <FormControlLabel value="OR" control={<Radio />} label="OR" />
              </RadioGroup>
            </FormControl>
          </Stack>

          {/* Exclude Tags */}
          <Autocomplete
            multiple
            options={allTags}
            value={draft.excludeTags}
            onChange={(_, newValue) => setDraft((prev) => ({ ...prev, excludeTags: newValue }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} key={option} />)
            }
            renderInput={(params) => <TextField {...params} label="Exclude Tags" placeholder="Select tags to exclude" />}
          />
        </Stack>

        <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
          <Button onClick={handleClear}>Clear</Button>
          <Button variant="contained" onClick={() => onApply(draft)}>Apply</Button>
        </Stack>
      </Collapse>
    </Paper>
  );
}
