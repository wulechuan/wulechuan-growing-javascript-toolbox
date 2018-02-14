module.exports = function beautifullyPrintUglifyJsError(error) {
	if (typeof error !== 'object') {
		return null;
	}

	const { cause } = error;
	if (typeof cause !== 'object') {
		return null;
	}

	const stacksString = error.stack;
	let stackUsefulPart;

	if (stacksString && typeof stacksString === 'string') {
		[ stackUsefulPart ] = stacksString.split('\n    at ');
	}

	return {
		errorType: `${error.name}:${cause.name}`,

		stackTopItem: {
			path: error.fileName,
			lineNumber: cause.line,
			columnNumber: cause.col,
			involvedSnippet: null,
			conclusionMessage: cause.message,
		},

		deeperStacks: stackUsefulPart,
	};
};