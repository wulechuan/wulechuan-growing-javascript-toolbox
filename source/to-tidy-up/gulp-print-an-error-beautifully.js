const pathTool = require('path');

const chalk = require('chalk');
const moment = require('moment');

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

const longLineWidth = 51;

const dividingLineLongRed  = chalk.red ('─'.repeat(longLineWidth));
const dividingLineShort    = chalk.gray('─'.repeat(24));



function printErrorAbstractInfoBlock(involvedPluginName, errorTypeString) {
	console.log(`${
		chalk.gray(moment().format('HH:mm:ss'))
	} ${
		chalk.bgWhite.black(` ${involvedPluginName} `)
	}${
		chalk.bgMagenta.black(` ${errorTypeString} `)
	}`);
}


function printHeaderForOneItemInStack(fileFullPath, lineNumber, columnNumber, basePathToShortenPrintedFilePaths) {
	if (typeof basePathToShortenPrintedFilePaths !== 'string') {
		basePathToShortenPrintedFilePaths = '';
	}



	// For we can easily click the file link and open the involded file in smart console,
	// e.g. console of Microsoft VSCode.
	// Besides, unfortunetly, in Microsoft VSCode, so far the version 1.20.0,
	// the file path must be short enough, or the console being wide enough,
	// so that the file path displays with a single line, can the said file path be clicked.
	console.log(chalk.gray(fileFullPath));




	const fileRelativePath = pathTool.relative(basePathToShortenPrintedFilePaths, fileFullPath);

	const pathSegments = fileRelativePath.split(pathTool.sep);
	const fileBaseName = pathSegments.pop();
	const leafFolder = pathSegments.pop();

	let leafFolderParentPath = pathTool.dirname(fileRelativePath);
	leafFolderParentPath = pathTool.dirname(leafFolderParentPath);
	leafFolderParentPath = `${leafFolderParentPath}${pathTool.sep}`;

	console.log(`File Path: ${
		chalk.gray(leafFolderParentPath)
	}${
		chalk.blue(leafFolder)
	}${
		chalk.gray(pathTool.sep)
	}\nFile Name: ${
		chalk.magenta(fileBaseName)
	}\nLine: ${
		chalk.green(lineNumber)
	}, Column: ${
		chalk.green(columnNumber)
	}`);

	console.log(`${dividingLineShort}`);
}


function parseAndPrintDetailOfTopMostStack(fileFullPath, lineNumber, columnNumber, involvedSnippetPlusRawErrorMessage, basePathToShortenPrintedFilePaths) {
	console.log(`${chalk.bgBlue.black(' Statement in top most stack ')} >\n`);

	printHeaderForOneItemInStack(fileFullPath, lineNumber, columnNumber, basePathToShortenPrintedFilePaths);

	const allLineGutters = involvedSnippetPlusRawErrorMessage.match(/\n\s*\d+\|/g);
	const lastGutter = allLineGutters[allLineGutters.length - 1];
	const gutterWidth = lastGutter.length - '\n'.length;

	const posOfThingsAfterLastGutter = involvedSnippetPlusRawErrorMessage.indexOf(lastGutter) + lastGutter.length;
	const thingsAfterLastGutter = involvedSnippetPlusRawErrorMessage.slice(posOfThingsAfterLastGutter);

	const posOfRawErrorMessageOfLastFile = posOfThingsAfterLastGutter + thingsAfterLastGutter.indexOf('\n') + '\n\n'.length;

	const rawErrorMessageOfTopMostStack = involvedSnippetPlusRawErrorMessage.slice(posOfRawErrorMessageOfLastFile);

	const matchingResultOfArrowLine = involvedSnippetPlusRawErrorMessage.match(/(\n\-{5,}\^)\n/);
	const [ , gulpArrowLine ] = matchingResultOfArrowLine;
	const posOfGulpArrowLine = involvedSnippetPlusRawErrorMessage.indexOf(gulpArrowLine);

	const snippetPart1IncludingHighlightedLine = involvedSnippetPlusRawErrorMessage.slice(0, posOfGulpArrowLine);

	const allLinesOfSnippetPart1IncludingHighlightedLine = snippetPart1IncludingHighlightedLine.match(/\n[^\n]*/g);
	const highlightedLine = allLinesOfSnippetPart1IncludingHighlightedLine.pop();
	const snippetPart1 = allLinesOfSnippetPart1IncludingHighlightedLine.join('');
	const snippetPart2 = involvedSnippetPlusRawErrorMessage.slice(
		posOfGulpArrowLine + gulpArrowLine.length,
		posOfRawErrorMessageOfLastFile
	);

	console.log(`${
		snippetPart1
	}${
		chalk.green(highlightedLine)
	}\n${
		' '.repeat(gutterWidth)
	}${
		chalk.gray(`${'~'.repeat(gulpArrowLine.length - gutterWidth - '\n'.length - '^'.length)}${chalk.red('▲')}`)
	}${
		snippetPart2
	}`);

	console.log(`${chalk.bgYellow.black(' Error Message ')} ${
		chalk.yellow(rawErrorMessageOfTopMostStack)
	}`);
}


function parseAndPrintDeeperStacksIfAny(stacks, basePathToShortenPrintedFilePaths) {
	if (stacks.length > 0) {
		console.log(`\n\n${chalk.bgBlue.black(' ...more statements in deeper stack ')} >\n`);
	}

	stacks.forEach(stack => {
		if (typeof stack !== 'string') {
			return;
		}

		stack = stack.trim();

		if (! stack) {
			return;
		}

		const stackFileInfoPos = stack.lastIndexOf('(');
		let stackFilePath;
		let stackFileLine;
		let stackFileColumn;
		let stackDetail = stack;

		if (stackFileInfoPos >= 0) {
			stackDetail = stack.slice(0, stackFileInfoPos - 1); // There is one space before '('.
			const stackFileInfo = stack.slice(stackFileInfoPos + 1, (')\n'.length * -1));

			const matchingResult = stackFileInfo.match(/:(\d+):(\d+)/);

			if (matchingResult) {
				stackFilePath = stackFileInfo.slice(0, matchingResult.index);

				[ , stackFileLine, stackFileColumn ] = matchingResult;
			}
		}


		if (stackFilePath && stackFileLine && stackFileColumn) {
			printHeaderForOneItemInStack(stackFilePath, stackFileLine, stackFileColumn, basePathToShortenPrintedFilePaths);
		}

		console.log(`${chalk.green(stackDetail)}\n\n`);
	});
}



module.exports = function beautifullyPrintStylusError(error, basePathToShortenPrintedFilePaths) {
	const { message } = error;

	const posOfRestPart =  message.indexOf('\n');
	const restPartOfMessage = message.slice(posOfRestPart);
	const stacks = restPartOfMessage.split('    at ');
	const [ snippetPlusRawMessageOfTopMostStackItem ] = stacks.splice(0, 1);



	console.log('\n'.repeat(5));
	console.log(dividingLineLongRed);
	printErrorAbstractInfoBlock(error.plugin, error.name);
	console.log(dividingLineLongRed);

	console.log('');



	parseAndPrintDetailOfTopMostStack(
		error.filename,
		error.lineno,
		error.column,
		snippetPlusRawMessageOfTopMostStackItem,
		basePathToShortenPrintedFilePaths
	);



	parseAndPrintDeeperStacksIfAny(stacks, basePathToShortenPrintedFilePaths);



	console.log(dividingLineLongRed);
	console.log(chalk.red(`End of ${chalk.white(error.plugin)} ${error.name}`));
	console.log(dividingLineLongRed);
	console.log('\n'.repeat(5));
};
