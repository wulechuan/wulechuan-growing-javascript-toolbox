/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, */

const pathTool = require('path');
const gulp = require('gulp');
const chalk = require('chalk');

const formatJSON = require('./format-json');
const createStreamViaString = require('./create-stream-via-string');

module.exports = (outputFile, JSONToWrite, options) => {
	const {
		outputFolder = '',
		shouldWriteDotJSONFile = false,
		constNameIfWritesJS,
		shouldNotLog = false,
		eslintConfigStringIfWriteJS = '/* eslint-disable */',
	} = options;

	const resolvedOutputFile = pathTool.resolve(outputFolder, outputFile);
	const {
		name: outputFileName,
		dir: resolvedOutputFolder,
	} = pathTool.parse(resolvedOutputFile);


	const logString = `\n>>> ${chalk.blue('File was written')}:\n        ${chalk.green(resolvedOutputFile)}`;
	const fileExt = shouldWriteDotJSONFile ? 'json' : 'js';

	let fileContents;
	const {
		formattedJSONString,
		objectLiteralString,
	} = formatJSON(JSONToWrite);

	if (shouldWriteDotJSONFile) {
		fileContents = `${formattedJSONString}\n`;
	} else {
		fileContents = `${eslintConfigStringIfWriteJS}\n\nconst ${constNameIfWritesJS} = ${objectLiteralString};\n`;
	}

	createStreamViaString(`${outputFileName}.${fileExt}`, fileContents)
		.pipe(gulp.dest(resolvedOutputFolder));

	if (!shouldNotLog) {
		console.log(logString);
	}
};
