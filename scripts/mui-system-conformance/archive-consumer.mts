import * as React from "react";
import {
	createTheme,
	ThemeProvider,
	Box,
	Stack,
	Grid,
	styled,
	useMediaQuery,
	type SxProps,
	type Theme,
} from "vmui-system";
import createStyled from "vmui-system/createStyled";
import { prepareCssVars } from "vmui-system/cssVars";
const theme = createTheme({ spacing: 4 });
const sx: SxProps<Theme> = {
	p: [1, 2],
	width: { xs: 1, md: 0.5 },
	"&:hover": { color: "blue" },
};
const Styled = styled("div")<{ active: boolean }>(({ active, theme }) => ({
	opacity: active ? 1 : 0.5,
	padding: theme.spacing(2),
}));
export function View() {
	const matches = useMediaQuery("(min-width:600px)");
	return React.createElement(
		ThemeProvider,
		{ theme },
		React.createElement(
			Stack,
			{ spacing: 2 },
			React.createElement(Box, { sx }),
			React.createElement(Grid, { size: 6 }),
			React.createElement(Styled, { active: matches }),
		),
	);
}
prepareCssVars({ spacing: 8 });
createStyled();
// @ts-expect-error responsive widths require numeric breakpoint values
createTheme({ breakpoints: { values: { xs: "zero" } } });
