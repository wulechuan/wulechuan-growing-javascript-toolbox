const wulechuanGulpErrorPrinter = require('../utils/gulp-print-an-error-beautifully');
const printObjectDetails = require('../utils/print-javascript-object-details'); // eslint-disable-line no-unused-vars

// see also: https://github.com/gulpjs/plugin-error
// see also: https://github.com/gulpjs/plugin-error/blob/master/index.d.ts
// gulpErrorInterface = {
// 	lineno: Number, // Integer
// 	column: Number, // Integer
// 	filename: String,
// 	stylusStack: String, // plugin sepcific
// 	message: String,
// 	name: String, // 'TypeError' | 'Error' | ...
// 	stack: String, // seems to be error.name + error.message + error.<plugin>Stack + <gulp running stack (if any)>
// 	plugin: String, // 'gulp-stylus' | 'gulp-less' etc.
// 	showProperties: Boolean,
// 	shwoStack: Boolean,
// 	_messageWithDefails: Function,
// 	_messageDetails: Function,
// 	toString: Function,
// };

module.exports = function beautifullyPrintStylusError(error, basePathToShortenPrintedFilePaths) {
	if (typeof error !== 'object') {
		wulechuanGulpErrorPrinter.printErrorTheSimpleWay(error);
		return;
	}

	const { message } = error;

	const posOfRestPart =  message.indexOf('\n');
	const restPartOfMessage = message.slice(posOfRestPart);
	const stacks = restPartOfMessage.split('    at ');
	const [ snippetPlusRawMessageOfTopMostStackItem ] = stacks.splice(0, 1);

	printObjectDetails(stacks);

	wulechuanGulpErrorPrinter.printErrorTheComplexWay(
		{
			involvedGulpPluginName: error.plugin || 'gulp-stylus',
			errorType: error.name,

			stackTopItem: {
				path:         error.filename,
				lineNumber:   error.lineno,
				columnNumber: error.column,
				involvedSnippet: snippetPlusRawMessageOfTopMostStackItem,
				conclusionMessage: null,
			},

			deeperStacks: stacks,
		},

		basePathToShortenPrintedFilePaths,

		error
	);
};