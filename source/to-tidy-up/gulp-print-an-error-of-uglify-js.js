const wulechuanGulpErrorPrinter = require('../utils/gulp-print-an-error-beautifully');
// const printObjectDetails = require('../utils/print-javascript-object-details'); // eslint-disable-line no-unused-vars

module.exports = function beautifullyPrintUglifyJsError(error, basePathToShortenPrintedFilePaths) {
	if (typeof error !== 'object') {
		wulechuanGulpErrorPrinter.printErrorTheSimpleWay(error);
		return;
	}

	const { cause } = error;
	if (typeof cause !== 'object') {
		wulechuanGulpErrorPrinter.printErrorTheSimpleWay(error);
		return;
	}

	const stacksString = error.stack;
	let stackUsefulPart;

	if (stacksString && typeof stacksString === 'string') {
		[ stackUsefulPart ] = stacksString.split('\n    at ');
	}

	wulechuanGulpErrorPrinter.printErrorTheComplexWay(
		{
			involvedGulpPluginName: error.plugin || 'gulp-uglify',
			errorType: `${error.name}:${cause.name}`,

			stackTopItem: {
				path: error.fileName,
				lineNumber: cause.line,
				columnNumber: cause.col,
				involvedSnippet: null,
				conclusionMessage: cause.message,
			},

			deeperStacks: stackUsefulPart,
		},

		basePathToShortenPrintedFilePaths,

		error
	);
};