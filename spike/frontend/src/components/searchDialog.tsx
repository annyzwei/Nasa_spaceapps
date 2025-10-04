import React from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TextField, InputAdornment, Stack, Paper, Link as MUILink,
  createTheme, ThemeProvider, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Grid
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Filters } from "./mainView";

// =====================================================
// SearchDialog: reusable controlled dialog with local draft state
// =====================================================
export default function SearchDialog({
  open,
  value,
  onApply,
  onClose,
  onClear,
}: {
  open: boolean;
  value: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = React.useState<Filters>(value);

  // Sync incoming value each time the dialog opens
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const onChange = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onApply(draft);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" onKeyDown={handleKeyDown}>
      <DialogTitle>Search / Filter</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label="Title contains"
              fullWidth
              value={draft.title}
              onChange={onChange("title")}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Link contains"
              fullWidth
              value={draft.link}
              onChange={onChange("link")}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="PMID min"
              type="number"
              fullWidth
              value={draft.pmidMin}
              onChange={onChange("pmidMin")}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="PMID max"
              type="number"
              fullWidth
              value={draft.pmidMax}
              onChange={onChange("pmidMax")}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Date from"
              type="date"
              fullWidth
              value={draft.dateFrom}
              onChange={onChange("dateFrom")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={6}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClear}>Clear</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onApply(draft)}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}