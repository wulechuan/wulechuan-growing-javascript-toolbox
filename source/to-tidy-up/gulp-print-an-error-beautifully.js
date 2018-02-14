// see also: https://github.com/gulpjs/plugin-error
// see also: https://github.com/gulpjs/plugin-error/blob/master/index.d.ts

const pathTool = require('path');

const chalk = require('chalk');
const moment = require('moment');
const printObjectDetails = require('../utils/print-javascript-object-details'); // eslint-disable-line no-unused-vars

const longLineWidth  = 51;
const shortLineWidth = 24;
let headingAndEndingLinesWidth = longLineWidth;

const wulechuanGulpErrorPrinter = {
	printErrorTheSimpleWay,
	printErrorTheComplexWay,
};

module.exports = wulechuanGulpErrorPrinter;




function parseStacksStringIntoStacksArrayTheDefaultWay(stacksString) {
	return stacksString.split('    at ');
}




function printLine(width, color) {
	console.log(chalk[color || 'gray']('─'.repeat(width || longLineWidth)));
}

function printShortLine() {
	printLine(shortLineWidth);
}

function printErrorAbstractInfo(involvedPluginName, errorTypeString) {
	headingAndEndingLinesWidth = '12:34:56 '.length + involvedPluginName.length + 2 + errorTypeString.length + 2;

	printLine(headingAndEndingLinesWidth, 'red');

	console.log(`${
		chalk.gray(moment().format('HH:mm:ss'))
	} ${
		chalk.bgWhite.black(` ${involvedPluginName} `)
	}${
		chalk.bgMagenta.black(` ${errorTypeString} `)
	} ${chalk.gray('╳')}`);

	printLine(headingAndEndingLinesWidth, 'red');

	console.log('');
}

function printErrorEndingInfo(involvedPluginName, errorTypeString) {
	printLine(headingAndEndingLinesWidth, 'red');
	console.log(chalk.red(`  End of  ${chalk.white(involvedPluginName)}  ${errorTypeString}`));
	printLine(headingAndEndingLinesWidth, 'red');
	console.log('\n'.repeat(0));
}

function printConclusionMessageIfAny(errorMessage) {
	if (errorMessage) {
		console.log(`${chalk.bgYellow.black(' Error Message ')} ${
			chalk.yellow(errorMessage)
		}`);
	}
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
	console.log(`Clickable linkage:\n${chalk.gray(fileFullPath)}\n`);




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

	printShortLine();
}


function parseAndPrintDetailOfTopMostStack(involvedSnippetPlusRawErrorMessage) {
	if (! involvedSnippetPlusRawErrorMessage || typeof involvedSnippetPlusRawErrorMessage !== 'string') {
		return;
	}

	const allLineGutters = involvedSnippetPlusRawErrorMessage.match(/\n\s*\d+\|/g);
	const lastGutter = allLineGutters[allLineGutters.length - 1];
	const gutterWidth = lastGutter.length - '\n'.length;

	const posOfThingsAfterLastGutter = involvedSnippetPlusRawErrorMessage.indexOf(lastGutter) + lastGutter.length;
	const thingsAfterLastGutter = involvedSnippetPlusRawErrorMessage.slice(posOfThingsAfterLastGutter);

	const posOfRawErrorMessageOfLastFile = posOfThingsAfterLastGutter + thingsAfterLastGutter.indexOf('\n') + '\n\n'.length;

	const rawErrorMessageOfTopMostStack = involvedSnippetPlusRawErrorMessage.slice(posOfRawErrorMessageOfLastFile);

	const matchingResultOfArrowLine = involvedSnippetPlusRawErrorMessage.match(/(\n-{5,}\^)\n/);
	const [ , gulpArrowLine] = matchingResultOfArrowLine;
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

	printConclusionMessageIfAny(rawErrorMessageOfTopMostStack);
}


function printAllDeeperStackRecords(stacks, basePathToShortenPrintedFilePaths) {
	if (! Array.isArray(stacks)) {
		return;
	}

	if (stacks.length > 0) {
		console.log(`\n\n${chalk.bgBlue.black(' ...more info in deeper stack ')} ${chalk.gray('>')}\n`);
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





function printErrorTheSimpleWay(error) {
	printErrorAbstractInfo(error.plugin, error.name);
	if (typeof error.toString === 'function') {
		console.log(error.toString());
	} else {
		console.log(error);
	}
	printErrorEndingInfo(error.plugin, error.name);
}

function printErrorTheComplexWay(parsedStructure, basePathToShortenPrintedFilePaths, rawError) {
	if (!parsedStructure || typeof parsedStructure !== 'object') {
		printErrorTheSimpleWay(rawError);
		return;
	}

	printErrorAbstractInfo(
		parsedStructure.involvedGulpPluginName,
		parsedStructure.errorType
	);

	const { stackTopItem } = parsedStructure;

	if (stackTopItem && typeof stackTopItem === 'object') {
		console.log(`${chalk.bgBlue.black(' Statement in top most stack ')} ${chalk.gray('>')}\n`);

		printHeaderForOneItemInStack(
			stackTopItem.path,
			stackTopItem.lineNumber,
			stackTopItem.columnNumber,
			basePathToShortenPrintedFilePaths
		);

		parseAndPrintDetailOfTopMostStack(stackTopItem.involvedSnippet);

		printConclusionMessageIfAny(stackTopItem.conclusionMessage);
	}

	let { deeperStacks } = parsedStructure;
	if (deeperStacks) {
		if (typeof deeperStacks === 'string') {
			deeperStacks = parseStacksStringIntoStacksArrayTheDefaultWay(deeperStacks);
		}

		printAllDeeperStackRecords(deeperStacks, basePathToShortenPrintedFilePaths);
	}

	printErrorEndingInfo(
		parsedStructure.involvedGulpPluginName,
		parsedStructure.errorType
	);
}