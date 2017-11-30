/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, */

const pathTool = require('path');
const gulp = require('gulp');
const chalk = require('chalk');

const createStreamViaString = require('./create-stream-via-string');

module.exports = (outputFile, JSONToWrite, options) => {
	function JSONStringifyReplacer(k, v) {
		if (v instanceof RegExp) {
			return v.toString();
		}

		if (typeof v === 'string') {
			return v.replace(/\\+/g, '/');
		}

		return v;
	}

	const {
		outputFolder = '',
		shouldWriteDotJSONFile = false,
		constNameIfWritesJS = 'myJSON',
	} = options;

	const resolvedOutputFile = pathTool.resolve(outputFolder, outputFile);
	const {
		name: outputFileName,
		dir: resolvedOutputFolder,
	} = pathTool.parse(resolvedOutputFile);

	const logString = `\n>>> ${chalk.blue('File was written')}:\n    "${chalk.green(resolvedOutputFile)}"`;
	const fileExt = shouldWriteDotJSONFile ? 'json' : 'js';
	const eslintConfigForJSFile = '/* eslint-disable */\n\n';
	const fileContentsPrefix = shouldWriteDotJSONFile ? '' : `${eslintConfigForJSFile}const ${constNameIfWritesJS} = `;
	const fileContentsSuffix = shouldWriteDotJSONFile ? '' : ';';

	let fileContentsChief = JSON
		.stringify(JSONToWrite, JSONStringifyReplacer, 4);

	if (!shouldWriteDotJSONFile) {
		fileContentsChief = fileContentsChief
			// 将【正则表达式】的外扩【引号】去除
			.replace(/ ["']\/([^*\n][^\n]*)\/([gi]?)["']/g, ' /$1/$2')

			// 将双引号改为单引号
			.replace(/"(\w+)": /g, '$1: ')
			.replace(/ "([^\n]*)[^\\]?": /g, " '$1': ")
			.replace(/ "([^\n]*)[^\\]?"(,?\n)/g, " '$1'$2")

			// 去除正则表达式内部的转义反斜杠
			.replace(/([^/])\\\\/g, '$1\\')

			// 去除正则表达式起始位置可能出现的被转义的反斜杠
			.replace(/ \/\\\\/g, ' /\\');
	}

	const fileContents = `${fileContentsPrefix}${fileContentsChief}${fileContentsSuffix}\n`;

	createStreamViaString(`${outputFileName}.${fileExt}`, fileContents)
		.pipe(gulp.dest(resolvedOutputFolder));

	if (logString) {
		console.log(logString);
	}
};
