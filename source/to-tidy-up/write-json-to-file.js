/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, global-require: 0 */

const fileSystem = require('fs');
const pathTool = require('path');

const formatJSON = require('./format-json');

module.exports = (outputFilePath, JSONToWrite, options) => {
	const {
		shouldWriteInJSONFormat = false,
		constNameIfWriteJSFormat,
		shouldNotLog = false,
		eslintConfigStringIfWriteJSFormat = '/* eslint-disable */'
	} = options;

	const {
		name: outputFileName,
		dir: resolvedOutputFolder,
	} = pathTool.parse(outputFilePath);

	const fileExt = shouldWriteInJSONFormat ? 'json' : 'js';

	const reliableOutputFilePath = pathTool.format({
		dir,
		name,
		ext: fileExt,
	});

	let fileContents;
	const {
		formattedJSONString,
		objectLiteralString,
	} = formatJSON(JSONToWrite);

	if (shouldWriteInJSONFormat) {
		fileContents = `${formattedJSONString}\n`;
	} else {
		fileContents = `${eslintConfigStringIfWriteJSFormat}\n\nconst ${constNameIfWriteJSFormat} = ${objectLiteralString};\n`;
	}

	fileSystem.writeFileSync(reliableOutputFilePath, fileContents);

	if (!shouldNotLog) {
		const chalk = require('chalk');
		console.log(`\n>>> ${chalk.blue('File was written')}:\n    ${chalk.green(reliableOutputFilePath)}`);
	}
};
