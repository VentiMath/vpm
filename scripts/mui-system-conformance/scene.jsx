import React from "react";
import {
	ThemeProvider,
	createTheme,
	Button,
	TextField,
	Checkbox,
	FormControlLabel,
	Stack,
	Box,
	MenuList,
	MenuItem,
	Tabs,
	Tab,
	Collapse,
	Tooltip,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from "@mui/material";
export function Scene({
	color = "#123456",
	compact = false,
	variables = false,
	children,
}) {
	const theme = React.useMemo(
		() =>
			createTheme({
				cssVariables: variables,
				palette: { primary: { main: color } },
				components: {
					MuiButton: {
						defaultProps: { disableRipple: true },
						styleOverrides: { root: { borderRadius: 3 } },
					},
				},
			}),
		[color, variables],
	);
	const [checked, setChecked] = React.useState(false),
		[tab, setTab] = React.useState(0),
		[open, setOpen] = React.useState(false);
	return (
		<ThemeProvider theme={theme}>
			<Stack spacing={2}>
				<Button id="open" onClick={() => setOpen(true)}>
					Open
				</Button>
				<TextField
					id="name"
					label="Contest"
					defaultValue="AMC"
					size={compact ? "small" : "medium"}
				/>
				<FormControlLabel
					label="Joined"
					control={
						<Checkbox
							checked={checked}
							onChange={(e) => setChecked(e.target.checked)}
						/>
					}
				/>
				<MenuList id="menu">
					<MenuItem>Alpha</MenuItem>
					<MenuItem disabled>Disabled</MenuItem>
					<MenuItem>Beta</MenuItem>
					<MenuItem>Gamma</MenuItem>
				</MenuList>
				<Tabs
					value={tab}
					onChange={(_, value) => setTab(value)}
					aria-label="Sections"
				>
					<Tab label="Problems" />
					<Tab label="Results" />
				</Tabs>
				<Collapse in={checked} timeout={0}>
					<Box id="detail">Details</Box>
				</Collapse>
				<Tooltip title="Remove filter">
					<Chip label="Algebra" onDelete={() => {}} />
				</Tooltip>
				{children}
				<Dialog
					open={open}
					onClose={() => setOpen(false)}
					transitionDuration={0}
				>
					<DialogTitle>Contest entry</DialogTitle>
					<DialogContent>
						<input id="dialog-field" defaultValue="Saved" />
					</DialogContent>
					<DialogActions>
						<Button id="close" onClick={() => setOpen(false)}>
							Close
						</Button>
					</DialogActions>
				</Dialog>
			</Stack>
		</ThemeProvider>
	);
}
