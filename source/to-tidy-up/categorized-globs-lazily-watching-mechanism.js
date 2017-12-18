/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');
const gaze = require('gaze');
const chalk = require('chalk');
const globsMatcher = require('matcher');

const actionReturnValueThatStandsForFinish = 'watching action finished';

const defaultIntervalInMilliSeconds = 900;
// const gazeDebounceDelayInMilliSeconds = 500;


const categorizedGlobsLazilyWatchingMechanism = {
	LazyWatcher, // eslint-disable-line no-use-before-define
	setupWatchers, // eslint-disable-line no-use-before-define
	getLoggingColorNamesPairForAChange, // eslint-disable-line no-use-before-define
	actionReturnValueThatStandsForFinish,
};

module.exports = categorizedGlobsLazilyWatchingMechanism;


function getLoggingColorNamesPairForAChange(typeOfTheChange) {
	let loggingKeyColor;
	let loggingKeyBgColor;
	/* eslint-disable indent */
	switch (typeOfTheChange) {
		case 'changed':
			loggingKeyColor = 'blue';
			loggingKeyBgColor = 'bgBlue';
			break;

		case 'added':
			loggingKeyColor = 'green';
			loggingKeyBgColor = 'bgGreen';
			break;

		case 'deleted':
			loggingKeyColor = 'red';
			loggingKeyBgColor = 'bgRed';
			break;

		case 'renamed':
			loggingKeyColor = 'cyan';
			loggingKeyBgColor = 'bgCyan';
			break;

		default:
			loggingKeyColor = 'white';
			loggingKeyBgColor = 'bgWhite';
			break;
	}
	/* eslint-enable indent */

	return {
		loggingKeyColor,
		loggingKeyBgColor,
	};
}


function logDetailsOfChangedFiles(details) {
	if (!details || !details.changes) {
		// 由其他途径主动执行动作，而非经由【监测】机制自动执行动作时，
		// 没有details传入。
		return;
	}

	const headingString = `\n>>> Files changed in this batch:\n    ${
		chalk.gray(new Date(details.timestamp).toLocaleString())
	}`;

	const listString = details.changes.reduce((accumString, changeRecord) => {
		const {
			loggingKeyColor,
			loggingKeyBgColor,
		} = categorizedGlobsLazilyWatchingMechanism.getLoggingColorNamesPairForAChange(changeRecord.type);

		return `${accumString}    ${
			chalk[loggingKeyBgColor].black(` ${changeRecord.type} `)
		}${
			changeRecord.type === 'added' ? '  ' : ''
		} ${
			chalk.bgWhite.black(` ${changeRecord.category} `)
		} ${chalk[loggingKeyColor](changeRecord.file)}.\n`;
	}, '');

	console.log(`${headingString}\n${listString}`);
}


function LazyWatcher(categoryId, actionToTake, options) {
	if (typeof actionToTake !== 'function') {
		throw new TypeError('actionToTake must be a function');
	}

	const {
		interval = defaultIntervalInMilliSeconds,
	} = options;

	let somethingChangedAfterLastActionStart = false;
	let knownChangesSoFar = [];
	let actionIsOnGoing = false;
	let lastActionTakenTimestamp = NaN;
	let currentIntervalId = NaN;

	this.stop = toStopWatching; // eslint-disable-line no-use-before-define
	this.forceToTakeActionOnce = takeActionOnce; // eslint-disable-line no-use-before-define
	this.rememberAChange = function (typeOfTheChange, involvedFilePath, involvedCategoryId) {
		somethingChangedAfterLastActionStart = true;
		knownChangesSoFar.push({
			type: typeOfTheChange,
			file: involvedFilePath,
			category: involvedCategoryId,
		});
	};

	startToWatch(); // eslint-disable-line no-use-before-define


	function isAPromiseObject(input) {
		return !!input && typeof input.then === 'function' && typeof input.done === 'function';
	}

	function startToWatch() {
		console.log(`\n    ${chalk.blue('Starting watcher')} for globs in category "${chalk.green(categoryId)}"...`);
		currentIntervalId = setInterval(takeActionOnce, interval); // eslint-disable-line no-use-before-define
	}

	function stopWatching() { // private -- for internal usage
		clearInterval(currentIntervalId);
	}

	function toStopWatching() { // for public method
		stopWatching();
		takeActionOnce(); // eslint-disable-line no-use-before-define
	}

	function onActionFinished(theWayLeadsHere) {
		actionIsOnGoing = false;
		lastActionTakenTimestamp = NaN;

		console.log(`\n>>> ${
			chalk.blue('Action')
		} of the watcher for ${
			chalk.bgWhite.black(` ${categoryId} `)
		} was ${
			chalk.blue('done')
		}.\n    Told by the ${
			chalk.magenta(theWayLeadsHere.slice(4))
		}.`);

		// 如果已经有后续变化，继续执行预设动作。
		takeActionOnce(); // eslint-disable-line no-use-before-define

		// 如果上面一行（即takeActionOnce()）重新是的actionIsOnGoing，
		// 意味着已有任务在队列中等待至今，因此暂时仍不必调用startToWatch来启动侦听。
		// 顺便：如果每每执行至此行，actionIsOnGoing总是true，
		// 则以为着异步执行的任务较慢，文件变动事件发生得较快、较频繁。
		// 这种情况没有害处，仅仅是每批次处理的文件数较多，因为文件变动积攒很快。
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

		const changeDetails = {
			timestamp: lastActionTakenTimestamp,
			changes: changesWeAreDealingWith,
		};

		console.log('');
		logDetailsOfChangedFiles(changeDetails);

		const returnedValue = actionToTake(actionFinishedCallback, changeDetails);

		if (returnedValue === actionReturnValueThatStandsForFinish) {
			onActionFinished('via returned value');
		} else if (isAPromiseObject(returnedValue)) {
			returnedValue.done(() => { onActionFinished('via Promise object'); });
		}
	}
}


function setupWatchers(categorizedGlobsToWatch, options = {}) {
	const {
		basePath = process.cwd(),
		shouldLogEverySingleChange = false,
	} = options;
	let { aggregatedSourceGlobsToWatch } = options;

	const shouldAggregateGlobsFromCategoriedOnes = !Array.isArray(aggregatedSourceGlobsToWatch);
	if (shouldAggregateGlobsFromCategoriedOnes) {
		aggregatedSourceGlobsToWatch = [];
	}

	const knownCategoriesId = Object.keys(categorizedGlobsToWatch);

	const catagorizedWatchers = {};
	knownCategoriesId.forEach((categoryId) => {
		const category = categorizedGlobsToWatch[categoryId];
		const { actionToTake } = category;
		const rawGlobsOfThisCategory = category.globsToWatch;

		const globsOfThisCategory = rawGlobsOfThisCategory.map(glob => glob.replace(/\\/g, '/'));
		category.globsToWatch = globsOfThisCategory;

		catagorizedWatchers[categoryId] = new this.LazyWatcher(categoryId, actionToTake, {
			// debounceDelay: gazeDebounceDelayInMilliSeconds,
		});

		if (shouldAggregateGlobsFromCategoriedOnes) {
			aggregatedSourceGlobsToWatch = [].concat(
				aggregatedSourceGlobsToWatch,
				globsOfThisCategory
			);
		}
	});

	gaze(aggregatedSourceGlobsToWatch, (error, thisGazer) => {
		thisGazer.on('all', onSingleFileInvolved); // eslint-disable-line no-use-before-define

		// 不论是直接侦听all事件，还是分别侦听以下四种事件，都无法避免将rename误判为两个不同事件。
		// 多数情况下是误判为文件先被deleted再被renamed；偶尔会出现先deleted后added。
		// 因此，干脆仍然采用侦听all事件。

		// 	thisGazer.on('added', (involvedFilePath) => { onSingleFileInvolved('added', involvedFilePath); });
		// 	thisGazer.on('renamed', (involvedFilePath) => { onSingleFileInvolved('renamed', involvedFilePath); });
		// 	thisGazer.on('changed', (involvedFilePath) => { onSingleFileInvolved('changed', involvedFilePath); });
		// 	thisGazer.on('deleted', (involvedFilePath) => { onSingleFileInvolved('deleted', involvedFilePath); });
	});


	function printBeatifulLogForOneChange(timeStamp, typeOfTheChange, involvedFilePath, categoryId) {
		const {
			loggingKeyColor,
			loggingKeyBgColor,
		} = getLoggingColorNamesPairForAChange(typeOfTheChange);

		console.log(`\n>>> ${
			chalk.gray(timeStamp)
		}\n    Globs category: ${
			chalk.yellow(categoryId)
		}\n    ${
			chalk[loggingKeyBgColor].black(` ${typeOfTheChange} `)
		} ${
			chalk[loggingKeyColor](involvedFilePath)}`);
	}

	function onSingleFileInvolved(typeOfTheChange, involvedFilePath) {
		involvedFilePath = pathTool.relative(basePath, involvedFilePath).replace(/\\/g, '/');
		const timeStamp = new Date().toLocaleString();

		const involvedCategoriesId = [];

		knownCategoriesId.forEach((categoryId) => {
			const globsOfThisCategory = categorizedGlobsToWatch[categoryId].globsToWatch;
			const fileMatchesSomeGlobOfThisCategory = globsOfThisCategory.reduce((alreadyMatched, glob) => {
				return alreadyMatched || globsMatcher.isMatch(involvedFilePath, glob);
			}, false);
			if (fileMatchesSomeGlobOfThisCategory) {
				involvedCategoriesId.push(categoryId);
			}

			// console.log(`\n${
			// 	fileMatchesSomeGlobOfThisCategory ?
			// 		chalk.bgRed.black(' match ') :
			// 		chalk.bgGreen.black(' mismatch ')
			// } "${
			// 	chalk.blue(categoryId)
			// }"\nfile: ${
			// 	chalk.green(involvedFilePath)
			// }\nglobs: ${chalk.blue(JSON.stringify(globsOfThisCategory, null, 4))}`);
		});

		involvedCategoriesId.forEach((involvedCategoryId) => {
			if (shouldLogEverySingleChange) {
				printBeatifulLogForOneChange(timeStamp, typeOfTheChange, involvedFilePath, involvedCategoryId);
			}

			const involvedWatcher = catagorizedWatchers[involvedCategoryId];
			involvedWatcher.rememberAChange(typeOfTheChange, involvedFilePath, involvedCategoryId);
		});
	}
}
