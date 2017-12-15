/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');
const gaze = require('gaze');
const chalk = require('chalk');
const globsMatcher = require('matcher');

const actionReturnValueThatStandsForFinish = 'watching action finished';

const categorizedGlobsLazilyWatchingMechanism = {
	LazyWatcher,
	setupWatchers,
	getLoggingColorNamesPairForAChange,
	actionReturnValueThatStandsForFinish,
};

const defaultIntervalInMilliSeconds = 900;
// const gazeDebounceDelayInMilliSeconds = 500;

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
			changeRecord.type === 'added' ? '  ': ''
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

	this.stopWatching = stopWatching;
	this.forceToTakeActionOnce = takeActionOnce;
	this.rememberAChange = function(typeOfTheChange, involvedFilePath, involvedCategoryId) {
		somethingChangedAfterLastActionStart = true;
		knownChangesSoFar.push({
			type: typeOfTheChange,
			file: involvedFilePath,
			category: involvedCategoryId,
		});
	};

	function isAPromiseObject(input) {
		return !!input && typeof input.then === 'function' && typeof input.done === 'function';
	}

	function takeActionOnce() {
		if (!somethingChangedAfterLastActionStart) {
			return;
		}

		if (actionIsOnGoing) {
			return;
		}

		lastActionTakenTimestamp = new Date().getTime();

		actionIsOnGoing = true;
		const changesWeAreDealingWith =  [...knownChangesSoFar ];

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

		takeActionOnce(); // 如果已经有后续变化，继续执行预设动作。
	}

	function actionFinishedCallback(/* info */) {
		actionIsOnGoing = false;
		onActionFinished('via callback');
	}

	function startToWatch() {
		currentIntervalId = setInterval(takeActionOnce, interval);
	}

	function stopWatching() {
		clearInterval(currentIntervalId);
		takeActionOnce();
	}

	(function init() {
		startToWatch();
	})();
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
			aggregatedSourceGlobsToWatch = [
				...aggregatedSourceGlobsToWatch,
				globsOfThisCategory,
			];
		}
	});

	gaze(aggregatedSourceGlobsToWatch, (error, thisGazer) => {
		thisGazer.on('all', onSingleFileInvolved);

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
			chalk[loggingKeyColor](involvedFilePath)}`
		);
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
