import * as React from "react";
import {
	Box,
	Stack,
	Grid,
	Container,
	styled,
	createTheme,
	ThemeProvider,
	useTheme,
	useMediaQuery,
	type SxProps,
	type Theme,
	alpha,
	createSpacing,
} from "vmui-system";
import {
	Button,
	TextField,
	createTheme as createMaterialTheme,
} from "@mui/material";
import useMediaQueryEntry from "vmui-system/useMediaQuery";
import { createUnarySpacing } from "vmui-system/spacing";
const theme = createTheme({ spacing: 4, shape: { borderRadius: 6 } });
const sx: SxProps<Theme> = {
	p: [1, 2, 3],
	width: { xs: 1, md: 0.5 },
	"&:hover": { color: "primary.main" },
};
const Panel = styled("div")<{ active: boolean }>(({ active, theme }) => ({
	padding: theme.spacing(2),
	opacity: active ? 1 : 0.5,
}));
export function Consumer() {
	const t = useTheme();
	const wide: boolean = useMediaQuery((t: Theme) => t.breakpoints.up("md"));
	useMediaQueryEntry("(min-width: 600px)", { defaultMatches: false });
	return React.createElement(
		ThemeProvider,
		{ theme },
		React.createElement(
			Box,
			{ sx, component: "section" },
			React.createElement(
				Stack,
				{ spacing: 2, direction: { xs: "column", md: "row" } },
				React.createElement(
					Grid,
					{ container: true, spacing: 2 },
					React.createElement(Grid, { size: { xs: 12, md: 6 } }),
				),
				React.createElement(Container, { maxWidth: "lg" }),
				React.createElement(Panel, { active: wide, title: t.direction }),
				React.createElement(
					Button,
					{ variant: "contained", sx: { px: 2 } },
					"Enter",
				),
				React.createElement(TextField, {
					label: "Contest",
					defaultValue: "AMC",
				}),
			),
		),
	);
}
const materialTheme = createMaterialTheme({
	cssVariables: true,
	direction: "rtl",
});
const space: string = createSpacing(4)(1, 2);
const one = createUnarySpacing(theme)(1);
alpha("#123456", 0.5);
// @ts-expect-error breakpoints require numeric widths
createTheme({ breakpoints: { values: { xs: "bad" } } });
// @ts-expect-error a media-query matcher returns a MediaQueryList
useMediaQuery("print", { matchMedia: () => true });
void materialTheme;
void space;
void one;
