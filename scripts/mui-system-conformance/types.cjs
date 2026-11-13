"use strict";
const fs = require("node:fs"),
	path = require("node:path"),
	{ compile, clean } = require("../platform-types.cjs");
const dir = process.argv[2] || __dirname,
	root = path.resolve(__dirname, "../../packages");
for (const version of process.argv[2] ? ["packed"] : ["current", "app"])
	for (const bundler of [false, true]) {
		const paths = {};
		if (!process.argv[2]) {
			for (const name of fs.readdirSync(root)) {
				const base = path.join(root, name),
					meta = require(path.join(base, "package.json"));
				if (meta.types) paths[name] = [path.join(base, meta.types)];
			}
			paths["vmui-system"] = [root + "/vmui-system/index.d.mts"];
			paths["vmui-system/*"] = [root + "/vmui-system/*.d.mts"];
			for (const [up, own] of [
				["@mui/system", "vmui-system"],
				["@mui/styled-engine", "vmui-styled-engine"],
				["@mui/private-theming", "vmui-private-theming"],
				["@mui/utils", "vmui-utils"],
			]) {
				paths[up] = [root + "/" + own + "/index.d.mts"];
				paths[up + "/*"] = [root + "/" + own + "/*.d.mts"];
			}
			for (const name of ["react", "react-dom"])
				paths[name] = [
					__dirname + "/node_modules/@types/" + name + "/index.d.ts",
				];
			paths["react/jsx-runtime"] = [
				__dirname + "/node_modules/@types/react/jsx-runtime.d.ts",
			];
			paths["csstype"] = [__dirname + "/node_modules/csstype/index.d.ts"];
			const material =
				version === "current" ? "@mui/material" : "mui-material-app";
			paths["@mui/material"] = [
				__dirname + "/node_modules/" + material + "/index.d.ts",
			];
			paths["@mui/material/*"] = [
				__dirname + "/node_modules/" + material + "/*",
			];
		}
		const r = compile({
			compilerOptions: {
				strict: true,
				noEmit: true,
				skipLibCheck: false,
				target: "ES2022",
				lib: ["ES2022", "DOM", "DOM.Iterable"],
				module: bundler ? "ESNext" : "NodeNext",
				moduleResolution: bundler ? "Bundler" : "NodeNext",
				types: [],
				typeRoots: [dir + "/node_modules/@types"],
				paths,
			},
			files: [
				...fs
					.readdirSync(
						process.argv[2]
							? dir + "/node_modules/vmui-system"
							: root + "/vmui-system",
					)
					.filter((name) => /\.d\.(cts|mts)$/.test(name))
					.map(
						(name) =>
							(process.argv[2]
								? dir + "/node_modules/vmui-system/"
								: root + "/vmui-system/") + name,
					),
				dir + "/consumer.mts",
				...(bundler ? [] : [dir + "/consumer.cts"]),
			],
		});
		if (r.status) {
			console.error(version, bundler ? "Bundler" : "NodeNext");
			console.error(
				r.output
					.split("\n")
					.filter((line) => line.includes("error TS") || /^\s/.test(line))
					.join("\n"),
			);
			process.exit(1);
		}
		clean(r);
	}
console.log(
	"TS7 strict MUI System and unchanged current/app Material declarations pass.",
);
