import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server.browser";
import { flushSync } from "react-dom";
import {
	ThemeProvider,
	createTheme,
	useTheme,
	useMediaQuery,
} from "@mui/system";
import {
	ThemeProvider as MaterialProvider,
	createTheme as materialTheme,
	useColorScheme,
	Box,
} from "@mui/material";
const frame = () =>
	new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const check = (condition, message) => {
	if (!condition) throw Error(message);
};
export async function lifecycleChecks() {
	const host = document.body.appendChild(document.createElement("div")),
		root = createRoot(host),
		records = [];
	let matches = false,
		calls = 0,
		subscribes = 0,
		removes = 0;
	const listeners = new Set(),
		list = {
			get matches() {
				return matches;
			},
			addEventListener(type, fn) {
				subscribes++;
				listeners.add(fn);
			},
			removeEventListener(type, fn) {
				removes++;
				listeners.delete(fn);
			},
		},
		matcher = () => {
			calls++;
			return list;
		};
	function Media({ label }) {
		const value = useMediaQuery("(min-width:600px)", { matchMedia: matcher });
		return (
			<output>
				{label}:{String(value)}
			</output>
		);
	}
	flushSync(() => root.render(<Media label="a" />));
	await frame();
	check(
		host.textContent === "a:false" && listeners.size === 1,
		"Media initial state or listener count",
	);
	flushSync(() => root.render(<Media label="b" />));
	await frame();
	check(
		calls === 1 && subscribes === 1,
		"Parent update recreated media subscription",
	);
	matches = true;
	flushSync(() => listeners.forEach((fn) => fn()));
	check(host.textContent === "b:true", "Media change was not observed");
	flushSync(() => root.render(null));
	check(listeners.size === 0 && removes === 1, "Media subscription leaked");
	records.push(["media", calls, subscribes, removes]);
	const theme = createTheme({ palette: { main: "red" } });
	function Read() {
		const t = useTheme();
		return (
			<output>
				{t.palette.main}:{t.tag}
			</output>
		);
	}
	flushSync(() =>
		root.render(
			<ThemeProvider theme={theme}>
				<ThemeProvider theme={(outer) => ({ ...outer, tag: "nested" })}>
					<Read />
				</ThemeProvider>
			</ThemeProvider>,
		),
	);
	check(
		host.textContent === "red:nested",
		"Functional nested theme lost outer values",
	);
	const colorTheme = materialTheme({
		colorSchemes: { light: true, dark: true },
		cssVariables: { colorSchemeSelector: "class" },
	});
	const colorNode = document.createElement("section");
	document.body.appendChild(colorNode);
	let setMode;
	function Color() {
		const context = useColorScheme();
		setMode = context.setMode;
		return (
			<Box data-mode={context.mode} sx={{ bgcolor: "background.default" }}>
				<input defaultValue="Contest" />
			</Box>
		);
	}
	flushSync(() =>
		root.render(
			<MaterialProvider
				theme={colorTheme}
				defaultMode="light"
				storageManager={null}
				colorSchemeNode={colorNode}
			>
				<Color />
			</MaterialProvider>,
		),
	);
	await frame();
	const input = host.querySelector("input");
	input.focus();
	input.setSelectionRange(1, 2);
	for (const mode of ["dark", "light"]) {
		flushSync(() => setMode(mode));
		await frame();
		check(
			host.querySelector("[data-mode]").dataset.mode === mode &&
				colorNode.classList.contains(mode),
			"Color scheme mode or node selector",
		);
		check(
			input === host.querySelector("input") &&
				document.activeElement === input &&
				input.selectionStart === 1,
			"Mode change replaced input",
		);
		records.push(["scheme", mode, colorNode.className]);
	}
	root.unmount();
	colorNode.remove();
	host.remove();
	const hydration = document.body.appendChild(document.createElement("div"));
	const errors = [];
	function Hydrated() {
		return (
			<output>
				{String(useMediaQuery("(min-width:1px)", { defaultMatches: false }))}
			</output>
		);
	}
	hydration.innerHTML = renderToString(<Hydrated />);
	const original = hydration.firstChild;
	const hyd = hydrateRoot(hydration, <Hydrated />, {
		onRecoverableError: (e) => errors.push(e.message),
	});
	await frame();
	check(
		hydration.firstChild === original &&
			hydration.textContent === "true" &&
			errors.length === 0,
		"Media hydration replaced server DOM",
	);
	hyd.unmount();
	hydration.remove();
	records.push(["hydration", true]);
	return records;
}
