/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, global-require: 0 */

const fileSystem = require('fs');
const pathTool = require('path');

const formatJSON = require('./format-json');

module.exports = (outputFilePath, JSONToWrite, options) => {
	const {
		shouldWriteInJSONFormat = false,
		constNameIfWriteJSFormat,
		shouldNotLog = false,
		eslintConfigStringIfWriteJSFormat = '/* eslint-disable */',
	} = options;

	const {
		name: outputFileNameWithoutExt,
		dir: outputFileFolder,
	} = pathTool.parse(outputFilePath);

	const reliableOutputFilePath = pathTool.format({
		dir: outputFileFolder,
		name: outputFileNameWithoutExt,
		ext: shouldWriteInJSONFormat ? 'json' : 'js',
	});

	const {
		formattedJSONString,
		objectLiteralString,
	} = formatJSON(JSONToWrite);

	let fileContents;

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
