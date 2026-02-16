#!/usr/bin/env node
/**
 * CLI entry point for hole-puncher.
 *
 * Usage:
 *   hole-puncher <binary-path> ...       # Modify in-place
 *   hole-puncher --verbose <binary> ...  # Show detailed stats
 *   hole-puncher --help                  # Show help
 *   hole-puncher --version               # Show version
 */

import { formatSize, runCli } from "./index.js";

const VERSION = "__VERSION__";

function printHelp(): void {
	console.log(`hole-puncher v${VERSION}

Reduce compressed binary size by ~24% by zeroing unused ICU data.
Works with Bun, Node.js SEA, and any binary with embedded ICU data.

Usage:
  hole-puncher [options] <binary-path> ...

Options:
  -v, --verbose  Show detailed statistics
  -h, --help     Show this help message
  --version      Show version number

Examples:
  hole-puncher ./my-app                    # Single binary
  hole-puncher dist/app-linux dist/app-mac # Multiple binaries
  npx hole-puncher ./my-cli                # Via npx

Modifies binaries in-place. The raw file size stays the same — the
zeroed regions compress to nearly nothing with gzip/zstd.`);
}

function main(): void {
	const cliArgs = process.argv.slice(2);

	if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	if (cliArgs.includes("--version")) {
		console.log(VERSION);
		process.exit(0);
	}

	const isVerbose = cliArgs.includes("--verbose") || cliArgs.includes("-v");
	const result = runCli(cliArgs);

	if ("error" in result) {
		console.error(result.error);
		if (result.error.startsWith("Usage:")) {
			console.error("");
			console.error(
				"Reduces compressed binary size by ~24% by zeroing unused ICU data.",
			);
			console.error("Run hole-puncher --help for more information.");
		}
		process.exit(1);
	}

	for (const fileResult of result.results) {
		if (fileResult.status === "no_icu") {
			console.error(
				`  Warning: No ICU data found in ${fileResult.filePath}, skipping`,
			);
			continue;
		}

		if (fileResult.status === "no_removable") {
			console.log(`  ${fileResult.filePath}: no removable entries found`);
			continue;
		}

		const { stats, originalSize, filePath } = fileResult;
		if (!stats) {
			continue;
		}

		const pct = (
			(stats.bytesZeroed / (stats.bytesZeroed + stats.bytesKept)) *
			100
		).toFixed(1);

		console.log(
			`  ${filePath}: zeroed ${stats.removedEntries}/${stats.totalEntries} ICU entries (${formatSize(stats.bytesZeroed)}, ${pct}% of ICU data)`,
		);

		if (isVerbose && originalSize !== undefined) {
			console.log(`    Raw size: ${formatSize(originalSize)} (unchanged)`);
			console.log(`    ICU entries kept: ${stats.keptEntries}`);
			console.log(`    ICU data kept: ${formatSize(stats.bytesKept)}`);
			console.log(`    ICU data zeroed: ${formatSize(stats.bytesZeroed)}`);
		}
	}
}

main();
