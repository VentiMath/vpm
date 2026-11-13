import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import {
	Box,
	Stack,
	Grid,
	Container,
	styled,
	useThemeProps,
	useTheme,
	useMediaQuery,
} from "@mui/system";

const frame = () =>
	new Promise((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(resolve)),
	);
const Template = styled("div", {
	name: "DemoCard",
	slot: "Root",
	overridesResolver: (_, styles) => styles.root,
})`
  padding: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.palette.primary.main};
`;
function Card(input) {
	const { selected, ...props } = useThemeProps({
		props: input,
		name: "DemoCard",
	});
	const theme = useTheme(),
		wide = useMediaQuery(theme.breakpoints.up("md"));
	return <Template {...props} ownerState={{ selected }} data-wide={wide} />;
}
function Scene() {
	return (
		<Container id="container" maxWidth="md">
			<Stack
				id="stack"
				spacing={{ xs: 1, md: 2 }}
				direction={{ xs: "column", md: "row" }}
			>
				<Box
					id="first"
					sx={{ width: 100, height: 20, bgcolor: "primary.main", p: 1 }}
				/>
				<Box
					id="second"
					sx={{ width: { xs: 80, md: 120 }, height: 20, mx: 2 }}
				/>
			</Stack>
			<Grid id="grid" container columns={8} spacing={2}>
				<Grid id="half" size={4}>
					<Box>First half</Box>
				</Grid>
				<Grid id="nested" container size={4}>
					<Grid id="quarter" size={4}>
						Nested half
					</Grid>
				</Grid>
			</Grid>
			<Card id="card">
				<input id="stable-input" defaultValue="AMC" />
			</Card>
		</Container>
	);
}
const inspect = (host, id, properties) => {
	const node = host.querySelector("#" + id),
		style = getComputedStyle(node);
	if (!node) throw Error("Missing layout node " + id);
	return [id, ...properties.map((key) => style[key])];
};
export async function systemChecks() {
	const host = document.body.appendChild(document.createElement("div"));
	const root = createRoot(host),
		caches = [],
		snapshots = [];
	try {
		for (const direction of ["ltr", "rtl"]) {
			const cache = createCache({
				key: "system" + direction,
				stylisPlugins: direction === "rtl" ? [rtlPlugin] : [],
			});
			caches.push(cache);
			for (const variables of [false, true]) {
				let previousInput;
				for (const mode of ["light", "dark"]) {
					const theme = createTheme({
						direction,
						cssVariables: variables,
						palette: {
							mode,
							primary: { main: mode === "dark" ? "#abcdef" : "#123456" },
						},
						components: {
							DemoCard: {
								defaultProps: { selected: true },
								styleOverrides: {
									root: { border: "2px solid", borderColor: "rgb(20, 30, 40)" },
								},
								variants: [
									{ props: { selected: true }, style: { opacity: 0.75 } },
								],
							},
						},
					});
					flushSync(() =>
						root.render(
							<CacheProvider value={cache}>
								<ThemeProvider theme={theme}>
									<Scene />
								</ThemeProvider>
							</CacheProvider>,
						),
					);
					await frame();
					const input = host.querySelector("#stable-input");
					if (
						previousInput &&
						(input !== previousInput ||
							document.activeElement !== input ||
							input.selectionStart !== 1)
					)
						throw Error("Theme changes replaced or blurred the input");
					input.focus();
					input.setSelectionRange(1, 2);
					previousInput = input;
					snapshots.push({
						direction,
						variables,
						mode,
						wide: host.querySelector("#card").dataset.wide,
						rows: [
							inspect(host, "container", [
								"maxWidth",
								"paddingLeft",
								"paddingRight",
							]),
							inspect(host, "stack", ["display", "flexDirection"]),
							inspect(host, "first", [
								"width",
								"height",
								"paddingLeft",
								"backgroundColor",
							]),
							inspect(host, "second", [
								"width",
								"marginLeft",
								"marginRight",
								"marginTop",
							]),
							inspect(host, "grid", ["display", "gap"]),
							inspect(host, "half", ["width", "flexBasis"]),
							inspect(host, "nested", ["width", "gap"]),
							inspect(host, "quarter", ["width", "flexBasis"]),
							inspect(host, "card", [
								"paddingLeft",
								"color",
								"borderLeftWidth",
								"borderLeftColor",
								"opacity",
							]),
						],
					});
				}
			}
		}
		return snapshots;
	} finally {
		root.unmount();
		caches.forEach((cache) => cache.sheet.flush());
		host.remove();
	}
}
