/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, no-use-before-define: 0 */

const pathTool = require('path');
const gaze = require('gaze');
const moment = require('moment');
const chalk = require('chalk');
const globsMatcher = require('matcher');

const { isMatch: pathMatchesGlob } = globsMatcher;

const actionReturnValueThatStandsForFinish = 'watching action finished';
const defaultTimestampFormat = 'HH:mm:ss';

const defaultIntervalForCheckingEventsInMilliSeconds = 900;
// const gazeDebounceDelayInMilliSeconds = 500;

const consoleSupportsColors = chalk.supportsColor;

module.exports = {
	LazyWatcher,
	setupWatchers,
	getLoggingInfoForAChange,
	actionReturnValueThatStandsForFinish,
};


function isAPromiseObject(input) {
	return !!input && typeof input.then === 'function' && typeof input.done === 'function';
}

function normalizeOneGlob(rawGlob, basePath) {
	// 目前采用gaze。gaze不支持Windows路径。
	// 而且起码在Windows下不能侦听绝对路径（以/开头的路径）的变动。
	let normalizedGlob = rawGlob.trim();

	const hasNegativeSign = normalizedGlob.slice(0, 1) === '!';

	if (hasNegativeSign) {
		normalizedGlob = normalizedGlob.slice(1);
	}

	normalizedGlob = pathTool.relative(basePath, normalizedGlob).replace(/\\/g, '/');

	if (hasNegativeSign) {
		normalizedGlob = `!${normalizedGlob}`;
	}

	return normalizedGlob;
}

function normalizeGlobs(rawGlobs, basePath) {
	return rawGlobs.map(rawGlob => normalizeOneGlob(rawGlob, basePath));
}

function formatTimestamp(timestamp, format = defaultTimestampFormat) {
	return moment(timestamp).format(format);
}

function getLoggingInfoForAChange(typeOfTheChange) {
	let loggingKeyColor;
	let loggingKeyBgColor;
	let termOfEventType;
	let termOfEventTypePadding = '';

	const termCreated = 'Created';
	const termDeleted = 'Deleted';
	const termRenamed = 'Renamed';
	const termModified = 'Modified';
	const termOfUnknownType = 'Change of unknown type';

	const termsAlignedLength = Math.max(
		// termUnknownType.length,
		termCreated.length,
		termDeleted.length,
		termRenamed.length,
		termModified.length
	);

	/* eslint-disable indent */
	switch (typeOfTheChange) {
		case 'changed':
			loggingKeyColor = 'blue';
			loggingKeyBgColor = 'bgBlue';
			termOfEventType = termModified;
			break;

		case 'added':
			loggingKeyColor = 'green';
			loggingKeyBgColor = 'bgGreen';
			termOfEventType = termCreated;
			break;

		case 'deleted':
			loggingKeyColor = 'red';
			loggingKeyBgColor = 'bgRed';
			termOfEventType = termDeleted;
			break;

		case 'renamed':
			loggingKeyColor = 'cyan';
			loggingKeyBgColor = 'bgCyan';
			termOfEventType = termRenamed;
			break;

		default:
			loggingKeyColor = 'black';
			loggingKeyBgColor = 'bgWhite';
			termOfEventType = termOfUnknownType;
			break;
	}
	/* eslint-enable indent */

	termOfEventTypePadding = ' '.repeat(Math.max(0, termsAlignedLength - termOfEventType.length));

	return {
		loggingKeyColor,
		loggingKeyBgColor,
		termOfEventType,
		termOfEventTypePadding,
	};
}

function getPrintStringOfCategoryId(categoryId) {
	const foldingChar = consoleSupportsColors ? ' ' : '"';
	return chalk.bgWhite.black(`${foldingChar}${categoryId}${foldingChar}`);
}

function logWatchingGlobsForOneCategory(categoryId, globsToWatch, options = {}) {
	const {
		shouldOmitHeading = false,
		indentation = shouldOmitHeading ? 4 : 8,
	} = options;

	if (!shouldOmitHeading) {
		console.log(`\n>>> Watched globs for ${
			getPrintStringOfCategoryId(categoryId)
		}:`);
	}

	const globsListString = globsToWatch.reduce((accumString, glob) => {
		const hasNegativeSign = glob.slice(0, 1) === '!';
		const globString = hasNegativeSign ?
			`${' '.repeat(indentation - 1)}${chalk.red(glob)}` :
			`${' '.repeat(indentation)}${chalk.green(glob)}`;
		return `${accumString}${globString}\n`;
	}, '');

	console.log(globsListString);
}

function getPrintStringOfOneInvolvedFile({
	timestamp,
	typeOfChange,
	file,
	categoryId,
}, shouldOmitCategoryInfo) {
	const {
		loggingKeyColor,
		loggingKeyBgColor,
		termOfEventType,
		termOfEventTypePadding,
	} = getLoggingInfoForAChange(typeOfChange);

	return `${
		chalk.gray(formatTimestamp(timestamp))
	} ${
		shouldOmitCategoryInfo ? '' : getPrintStringOfCategoryId(categoryId)
	}${
		chalk[loggingKeyBgColor].black(` ${termOfEventType} `)
	}${
		termOfEventTypePadding
	} ${
		chalk[loggingKeyColor](file)
	}`;
}

function logABatchOfInvolvedFilesWhenTakingAnAction(detailsOfThisBatch) {
	const headingString = `\n>>> ${
		chalk.gray(new Date(detailsOfThisBatch.timestamp).toLocaleString())
	}\n    Category ${
		getPrintStringOfCategoryId(detailsOfThisBatch.categoryId)
	}: ${chalk.blue('Taking action')} for a batch of file...`;

	const listString = detailsOfThisBatch.changes.reduce((accumString, changeRecord) => {
		return `${accumString}    ${getPrintStringOfOneInvolvedFile(changeRecord, true)}\n`;
	}, '');

	console.log(`${headingString}\n${listString}`);
}


function listenToGazeEvents(globsToWatch, onASingleFileInvolved) {
	gaze(globsToWatch, (error, thisGazer) => {
		thisGazer.on('all', onASingleFileInvolved);

		// 不论是直接侦听all事件，还是分别侦听以下四种事件，都无法避免将rename误判为两个不同事件。
		// 多数情况下是误判为文件先被deleted再被renamed；偶尔会出现先deleted后added。
		// 因此，干脆仍然采用侦听all事件。

		// 	thisGazer.on('added', (involvedFilePath) => { onASingleFileInvolved('added', involvedFilePath); });
		// 	thisGazer.on('renamed', (involvedFilePath) => { onASingleFileInvolved('renamed', involvedFilePath); });
		// 	thisGazer.on('changed', (involvedFilePath) => { onASingleFileInvolved('changed', involvedFilePath); });
		// 	thisGazer.on('deleted', (involvedFilePath) => { onASingleFileInvolved('deleted', involvedFilePath); });
	});
}


function LazyWatcher(categoryId, globsToWatch, actionToTake, options) {
	if (typeof actionToTake !== 'function') {
		throw new TypeError(chalk.bgRed.black(' Arguments[2] ("actionToTake"): Must be a function. '));
	}

	const thisWatcher = this;

	const categoryIdPrintString = getPrintStringOfCategoryId(categoryId);

	const {
		basePath = process.cwd(),
		intervalForCheckingEvents = defaultIntervalForCheckingEventsInMilliSeconds,
		shouldStartWatchingOnConstruction = true,
		shouldLogVerbosely = false,
	} = options;

	let somethingChangedAfterLastActionStart = false;
	let knownChangesSoFar = [];
	let actionIsOnGoing = false;
	let lastActionTakenTimestamp = NaN;
	let currentIntervalId = NaN;

	const normalizedGlobs = normalizeGlobs(globsToWatch, basePath);

	thisWatcher.categoryId = categoryId;
	thisWatcher.basePath = basePath;
	thisWatcher.rawGlobsToWatch = globsToWatch;
	thisWatcher.normalizedGlobs = normalizedGlobs;

	thisWatcher.start = startToWatch;
	thisWatcher.stop = stopWatchingPublicMethod;
	thisWatcher.forceToTakeActionOnce = takeActionOnce;
	thisWatcher.rememberAChange = rememberAChange;
	thisWatcher.listenToGazeEvents = () => {
		listenToGazeEvents(normalizedGlobs, thisWatcher.rememberAChange);
	};


	if (shouldStartWatchingOnConstruction) {
		startToWatch(true);
	}


	function startToWatch(shouldLogWatchingDetails) {
		console.log(`\n${
			chalk.bgGreen.black(' Watching ')
		} globs in category ${categoryIdPrintString}...`);

		if (isNaN(currentIntervalId)) {
			currentIntervalId = setInterval(takeActionOnce, intervalForCheckingEvents);
		} else {
			console.log(`Watcher of category ${categoryIdPrintString} has already started before.`);
		}

		if (shouldLogWatchingDetails) {
			logWatchingGlobsForOneCategory(categoryId, normalizedGlobs, {
				shouldOmitHeading: true,
			});
		}
	}

	function rememberAChange(typeOfTheChange, involvedFileRawPath) {
		const timestamp = Date.now();

		somethingChangedAfterLastActionStart = true;

		const involvedFileNormalizedPath = normalizeOneGlob(involvedFileRawPath, thisWatcher.basePath);

		const changeRecord = {
			timestamp,
			typeOfChange: typeOfTheChange,
			file: involvedFileNormalizedPath,
			categoryId,
		};

		if (shouldLogVerbosely) {
			console.log(`>>> ${getPrintStringOfOneInvolvedFile(changeRecord)}`);
		}

		knownChangesSoFar.push(changeRecord);
	}

	function stopWatching() { // private -- for internal usage
		clearInterval(currentIntervalId);
		currentIntervalId = NaN;
	}

	function stopWatchingPublicMethod() { // for public method
		stopWatching();
		takeActionOnce();
	}

	function onActionFinished(theWayLeadsHere) {
		actionIsOnGoing = false;
		lastActionTakenTimestamp = NaN;

		if (shouldLogVerbosely) {
			console.log(`\n>>> ${
				chalk.blue('Action')
			} of the watcher for ${categoryIdPrintString} was ${
				chalk.blue('done')
			}.\n    Told by the ${
				chalk.magenta(theWayLeadsHere.slice(4))
			}.`);
		}

		// 如果已经有后续变化，继续执行预设动作。
		takeActionOnce();

		// 如果上面一行（即 takeActionOnce() ）重新使得 actionIsOnGoing 为 true，
		// 意味着已有任务在队列中等待至今，因此暂时仍不必调用startToWatch来启动侦听。
		// 顺便：如果每每执行至此行，actionIsOnGoing 总是 true，
		// 则意味着异步执行的任务较慢，文件变动事件发生得较快、较频繁。
		// 这种情况没有害处，仅仅是文件变动积攒很快，每批次处理的文件数较多罢了。
		if (!actionIsOnGoing) {
			startToWatch();
		}
	}

	function actionFinishedCallback(/* info */) {
		onActionFinished('via callback');
	}

	function takeActionOnce() {
		if (!somethingChangedAfterLastActionStart) {
			return;
		}

		if (actionIsOnGoing) {
			return;
		}

		lastActionTakenTimestamp = new Date().getTime();

		stopWatching();
		actionIsOnGoing = true;

		const changesWeAreDealingWith = [].concat(knownChangesSoFar);

		knownChangesSoFar = [];
		somethingChangedAfterLastActionStart = false;

		const detailsOfThisBatch = {
			categoryId,
			timestamp: lastActionTakenTimestamp,
			changes: changesWeAreDealingWith,
		};

		logABatchOfInvolvedFilesWhenTakingAnAction(detailsOfThisBatch);

		const returnedValue = actionToTake(actionFinishedCallback, detailsOfThisBatch);

		if (returnedValue === actionReturnValueThatStandsForFinish) {
			onActionFinished('via returned value');
		} else if (isAPromiseObject(returnedValue)) {
			returnedValue.done(() => { onActionFinished('via Promise object'); });
		}
	}
}


function setupWatchers(categorizedGlobsToWatch, options = {
	// basePath,
	// shouldShareSingleUnderlyingWatcherInstanceAcrossAllCategories,
	// aggregatedSourceGlobsToWatch,
	// shouldLogVerbosely,
}) {
	const {
		basePath = process.cwd(),
		shouldShareSingleUnderlyingWatcherInstanceAcrossAllCategories = false,
		shouldLogVerbosely = false,
	} = options;


	const knownCategoriesId = Object.keys(categorizedGlobsToWatch);


	const categorizedWatchers = knownCategoriesId.reduce((watchers, categoryId) => {
		const category = categorizedGlobsToWatch[categoryId];

		const lazyWatcherInstance = new LazyWatcher(
			categoryId,
			category.globsToWatch,
			category.actionToTake,
			{
				basePath,
				shouldLogVerbosely,
				// debounceDelay: gazeDebounceDelayInMilliSeconds,
			}
		);

		if (!shouldShareSingleUnderlyingWatcherInstanceAcrossAllCategories) {
			lazyWatcherInstance.listenToGazeEvents();
		}

		watchers[categoryId] = lazyWatcherInstance;

		return watchers;
	}, {});


	if (shouldShareSingleUnderlyingWatcherInstanceAcrossAllCategories) {
		let { aggregatedSourceGlobsToWatch } = options;

		if (!Array.isArray(aggregatedSourceGlobsToWatch)) {
			aggregatedSourceGlobsToWatch = knownCategoriesId.reduce((allGlobs, categoryId) => {
				const watcher = categorizedWatchers[categoryId];
				return allGlobs.concat(watcher.normalizedGlobs);
			}, []);
		}

		if (shouldLogVerbosely) {
			logWatchingGlobsForOneCategory(chalk.red('<AGGREGATED>'), aggregatedSourceGlobsToWatch);
		}

		listenToGazeEvents(aggregatedSourceGlobsToWatch, onASingleFileInvolved);
	}


	function onASingleFileInvolved(typeOfTheChange, involvedFileAbsolutePath) {
		const involvedWatchers = findOutAllInvolvedWatchersForOneFile(involvedFileAbsolutePath);
		involvedWatchers.forEach(watcher => watcher.rememberAChange(typeOfTheChange, involvedFileAbsolutePath));
	}

	function findOutAllInvolvedWatchersForOneFile(involvedFileAbsolutePath) {
		return knownCategoriesId.reduce((allInvolvedWatchers, categoryId) => {
			const watcherOfThisCategory = categorizedWatchers[categoryId];

			const involvedFileNormalizedPath = normalizeOneGlob(involvedFileAbsolutePath, watcherOfThisCategory.basePath);
			const globsOfThisWatcher = watcherOfThisCategory.normalizedGlobs;

			const fileIsWatchedByThisWatcher = globsOfThisWatcher.some(glob => pathMatchesGlob(involvedFileNormalizedPath, glob));

			if (fileIsWatchedByThisWatcher) {
				allInvolvedWatchers.push(watcherOfThisCategory);
			}

			return allInvolvedWatchers;
		}, []);
	}
}
