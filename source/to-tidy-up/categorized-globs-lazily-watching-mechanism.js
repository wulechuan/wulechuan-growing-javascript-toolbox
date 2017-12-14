/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');
const gaze = require('gaze');
const chalk = require('chalk');
const globsMatcher = require('matcher');

const categorizedGlobsLazilyWatchingMechanism = {
	LazyWatcher,
	setupWatchers,
};

const defaultIntervalInMilliSeconds = 600;
// const gazeDebounceDelayInMilliSeconds = 500;

module.exports = categorizedGlobsLazilyWatchingMechanism;










function LazyWatcher(actionToTake, options) {
	if (typeof actionToTake !== 'function') {
		throw new TypeError('actionToTake must be a function');
	}

	const {
		interval = defaultIntervalInMilliSeconds,
	} = options;

	let somethingChangedAfterLastActionStart = false;
	let actionIsOnGoing = false;
	let lastActionTakenTimestamp = new Date().getTime();
	let currentIntervalId = NaN;

	this.stopWatching = stopWatching;
	this.forceToTakeActionOnce = takeActionOnce;
	this.rememberAChange = function() {
		somethingChangedAfterLastActionStart = true;
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

		actionIsOnGoing = true;
		somethingChangedAfterLastActionStart = false;

		console.log('');
		const returnedValue = actionToTake(onActionFinishedOnce);

		if (returnedValue === 'watching action finished') {
			actionIsOnGoing = false;
			// console.log('>>>', chalk.gray(`Categorized watcher\'s action done. That was told by the ${chalk.bgRed.black(' return value ')}.`));
		} else if (isAPromiseObject(returnedValue)) {
			returnedValue.done(() => {
				actionIsOnGoing = false;
				// console.log('>>>', chalk.gray(`Categorized watcher\'s action done. That was told by the ${chalk.bgRed.black(' Promise object ')}.`));
			});
		}
	}

	function onActionFinishedOnce(errorCode) {
		// console.log('>>>', chalk.gray(`Categorized watcher\'s action done. That was told by the ${chalk.bgRed.black(' callback ')}.`));
		actionIsOnGoing = false;
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
	const { basePath = process.cwd() } = options;
	let { aggregatedSourceGlobsToWatch } = options;

	const shouldAggregateGlobsFromCategoriedOnes = !Array.isArray(aggregatedSourceGlobsToWatch);
	if (shouldAggregateGlobsFromCategoriedOnes) {
		aggregatedSourceGlobsToWatch = [];
	}

	const knownCategoriesId = Object.keys(categorizedGlobsToWatch);

	const catagorizedWatchers = {}
	knownCategoriesId.forEach((categoryId) => {
		const category = categorizedGlobsToWatch[categoryId];
		const actionToTake = category.actionToTake;
		const rawGlobsOfThisCategory = category.globsToWatch;

		const globsOfThisCategory = rawGlobsOfThisCategory.map(glob => glob.replace(/\\/g, '/'));
		category.globsToWatch = globsOfThisCategory;

		catagorizedWatchers[categoryId] = new this.LazyWatcher(actionToTake, {
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
		let loggingKeyColor;
		let loggingKeyBgColor;
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
			printBeatifulLogForOneChange(timeStamp, typeOfTheChange, involvedFilePath, involvedCategoryId);
			const involvedWatcher = catagorizedWatchers[involvedCategoryId];
			involvedWatcher.rememberAChange();
		});
	}
}
