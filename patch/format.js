"use strict";
/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	if (k2 === undefined) k2 = k;
	Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
	if (k2 === undefined) k2 = k;
	o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
	Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
	o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
	if (mod && mod.__esModule) return mod;
	var result = {};
	if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	__setModuleDefault(result, mod);
	return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkOneLiner = exports.horizontalHtmlResultTable = exports.verticalHtmlResultTable = exports.horizontalTermResultTable = exports.verticalTermResultTable = exports.automaticResultTable = exports.spinner = void 0;
const stripAnsi = require("strip-ansi");
const table = __importStar(require("table"));
const ua_parser_js_1 = require("ua-parser-js");
const ansi = require("ansi-escape-sequences");
exports.spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((frame) => ansi.format(`[blue]{${frame}}`));
/**
 * Create an automatic mode result table.
 */
function automaticResultTable(results) {
	// Typically most dimensions for a set of results share the same value (e.g
	// because we're only running one benchmark, one browser, etc.). To save
	// horizontal space and make the results easier to read, we first show the
	// fixed values in one table, then the unfixed values in another.
	const fixed = [];
	const unfixed = [];
	const possiblyFixed = [
		benchmarkDimension,
		versionDimension,
		browserDimension,
		sampleSizeDimension,
		bytesSentDimension,
	];
	for (const dimension of possiblyFixed) {
		const values = new Set();
		for (const res of results) {
			values.add(dimension.format(res));
		}
		if (values.size === 1) {
			fixed.push(dimension);
		}
		else {
			unfixed.push(dimension);
		}
	}
	// These are the primary observed results, so they always go in the main
	// result table, even if they happen to be the same in one run.
	unfixed.push(runtimeConfidenceIntervalDimension);
	if (results.length > 1) {
		// Create an NxN matrix comparing every result to every other result.
		const labelFn = makeUniqueLabelFn(results.map((result) => result.result));
		for (let i = 0; i < results.length; i++) {
			unfixed.push({
				label: `vs ${labelFn(results[i].result)}`,
				tableConfig: {
					alignment: 'right',
				},
				format: (r) => {
					if (r.differences === undefined) {
						return '';
					}
					const diff = r.differences[i];
					if (diff === null) {
						return ansi.format('\n[gray]{-}       ');
					}
					return formatDifference(diff);
				},
			});
		}
	}
	const fixedTable = { dimensions: fixed, results: [results[0]] };
	const unfixedTable = { dimensions: unfixed, results };
	return { fixed: fixedTable, unfixed: unfixedTable };
}
exports.automaticResultTable = automaticResultTable;
/**
 * Format a terminal text result table where each result is a row:
 *
 * +--------+--------+
 * | Header | Header |
 * +--------+--------+
 * | Value  | Value  |
 * +--------+--------+
 * | Value  | Value  |
 * +--------+--------+
 */
function verticalTermResultTable({ dimensions, results }) {
	const columns = dimensions.map((d) => d.tableConfig || {});
	const rows = [
		dimensions.map((d) => ansi.format(`[bold]{${d.label}}`)),
		...results.map((r) => dimensions.map((d) => d.format(r))),
	];
	return table.table(rows, {
		border: table.getBorderCharacters('norc'),
		columns: {...columns},
	});
}
exports.verticalTermResultTable = verticalTermResultTable;
/**
 * Format a terminal text result table where each result is a column:
 *
 * +--------+-------+-------+
 * | Header | Value | Value |
 * +--------+-------+-------+
 * | Header | Value | Value |
 * +--------+-------+-------+
 */
function horizontalTermResultTable({ dimensions, results }) {
  const columns = [
		{ alignment: 'right' },
		...results.map(() => ({ alignment: 'left' })),
	];
	const rows = dimensions.map((d) => {
		return [
			ansi.format(`[bold]{${d.label}}`),
			...results.map((r) => d.format(r)),
		];
	});
	return table.table(rows, {
		border: table.getBorderCharacters('norc'),
		columns: {...columns},
	});
}
exports.horizontalTermResultTable = horizontalTermResultTable;
/**
 * Format an HTML result table where each result is a row:
 *
 * <table>
 *   <tr> <th>Header</th> <th>Header</th> </tr>
 *   <tr> <td>Value</td> <td>Value</td> </tr>
 *   <tr> <td>Value</td> <td>Value</td> </tr>
 * </table>
 */
function verticalHtmlResultTable({ dimensions, results }) {
	const headers = dimensions.map((d) => `<th>${d.label}</th>`);
	const rows = [];
	for (const r of results) {
		const cells = dimensions.map((d) => `<td>${ansiCellToHtml(d.format(r))}</td>`);
		rows.push(`<tr>${cells.join('')}</tr>`);
	}
	return `<table>
	<tr>${headers.join('')}</tr>
	${rows.join('')}
  </table>`;
}
exports.verticalHtmlResultTable = verticalHtmlResultTable;
/**
 * Format an HTML result table where each result is a column:
 *
 * <table>
 *   <tr> <th>Header</th> <td>Value</td> <td>Value</td> </tr>
 *   <tr> <th>Header</th> <td>Value</td> <td>Value</td> </tr>
 * </table>
 */
function horizontalHtmlResultTable({ dimensions, results }) {
	const rows = [];
	for (const d of dimensions) {
		const cells = [
			`<th align="right">${d.label}</th>`,
			...results.map((r) => `<td>${ansiCellToHtml(d.format(r))}</td>`),
		];
		rows.push(`<tr>${cells.join('')}</tr>`);
	}
	return `<table>${rows.join('')}</table>`;
}
exports.horizontalHtmlResultTable = horizontalHtmlResultTable;
function ansiCellToHtml(ansi) {
	// For now, just remove ANSI color sequences and prevent line-breaks. We may
	// want to add an htmlFormat method to each dimension object so that we can
	// have more advanced control per dimension.
	return stripAnsi(ansi).replace(/ /g, '&nbsp;');
}
/**
 * Format a confidence interval as "[low, high]".
 */
const formatConfidenceInterval = (ci, format) => {
	return ansi.format(`${format(ci.low)} [gray]{-} ${format(ci.high)}`);
};
/**
 * Prefix positive numbers with a red "+" and negative ones with a green "-".
 */
const colorizeSign = (n, format) => {
	if (n > 0) {
		return ansi.format(`[red bold]{+}${format(n)}`);
	}
	else if (n < 0) {
		// Negate the value so that we don't get a double negative sign.
		return ansi.format(`[green bold]{-}${format(-n)}`);
	}
	else {
		return format(n);
	}
};
const benchmarkDimension = {
	label: 'Benchmark',
	format: (r) => r.result.name,
};
const versionDimension = {
	label: 'Version',
	format: (r) => r.result.version || ansi.format('[gray]{<none>}'),
};
const browserDimension = {
	label: 'Browser',
	format: (r) => {
		const browser = r.result.browser;
		let s = browser.name;
		if (browser.headless) {
			s += '-headless';
		}
		if (browser.remoteUrl) {
			s += `\n@${browser.remoteUrl}`;
		}
		if (r.result.userAgent !== '') {
			// We'll only have a user agent when using the built-in static server.
			// TODO Get UA from window.navigator.userAgent so we always have it.
			const ua = new ua_parser_js_1.UAParser(r.result.userAgent).getBrowser();
			s += `\n${ua.version}`;
		}
		return s;
	},
};
const sampleSizeDimension = {
	label: 'Sample size',
	format: (r) => r.result.millis.length.toString(),
};
const bytesSentDimension = {
	label: 'Bytes',
	format: (r) => (r.result.bytesSent / 1024).toFixed(2) + ' KiB',
};
const runtimeConfidenceIntervalDimension = {
	label: 'Avg time',
	tableConfig: {
		alignment: 'right',
	},
	format: (r) => formatConfidenceInterval(r.stats.meanCI, milli),
};
function formatDifference({ absolute, relative }) {
	let word, rel, abs;
	if (absolute.low > 0 && relative.low > 0) {
		word = `[bold red]{slower}`;
		rel = formatConfidenceInterval(relative, percent);
		abs = formatConfidenceInterval(absolute, milli);
	}
	else if (absolute.high < 0 && relative.high < 0) {
		word = `[bold green]{faster}`;
		rel = formatConfidenceInterval(negate(relative), percent);
		abs = formatConfidenceInterval(negate(absolute), milli);
	}
	else {
		word = `[bold blue]{unsure}`;
		rel = formatConfidenceInterval(relative, (n) => colorizeSign(n, percent));
		abs = formatConfidenceInterval(absolute, (n) => colorizeSign(n, milli));
	}
	return ansi.format(`${word}\n${rel}\n${abs}`);
}
function percent(n) {
	return (n * 100).toFixed(0) + '%';
}
function milli(n) {
	return n.toFixed(2) + 'ms';
}
function negate(ci) {
	return {
		low: -ci.high,
		high: -ci.low,
	};
}
/**
 * Create a function that will return the shortest unambiguous label for a
 * result, given the full array of results.
 */
function makeUniqueLabelFn(results) {
	const names = new Set();
	const versions = new Set();
	const browsers = new Set();
	for (const result of results) {
		names.add(result.name);
		versions.add(result.version);
		browsers.add(result.browser.name);
	}
	return (result) => {
		const fields = [];
		if (names.size > 1) {
			fields.push(result.name);
		}
		if (versions.size > 1) {
			fields.push(result.version);
		}
		if (browsers.size > 1) {
			fields.push(result.browser.name);
		}
		return fields.join('\n');
	};
}
/**
 * A one-line summary of a benchmark, e.g. for a progress bar:
 *
 *   chrome my-benchmark [@my-version]
 */
function benchmarkOneLiner(spec) {
	let maybeVersion = '';
	if (spec.url.kind === 'local' && spec.url.version !== undefined) {
		maybeVersion = ` [@${spec.url.version.label}]`;
	}
	return `${spec.browser.name} ${spec.name}${maybeVersion}`;
}
exports.benchmarkOneLiner = benchmarkOneLiner;
//# sourceMappingURL=format.js.map