/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, no-use-before-define: 0 */

const moment = require('moment');
const chalk = require('chalk');
const globsMatcher = require('matcher');

const { isMatch: pathMatchesGlob } = globsMatcher;

const consoleDoesSupportColors = chalk.supportsColor;

module.exports = {
	createWatchersAccordingTo,
	LazyWatcher: LazyWatcherClass,
};

// const gazeDebounceDelayInMilliSeconds = 500;

const defaultConfigs = {
	underlyingWatchEngineId: 'gaze',
	delayTimeInMilliSecondsForGatheringEvents: 900,
	actionReturnValueThatStandsForFinish: 'watching action finished',
	loggingTimestampFormat: 'HH:mm:ss',
};

const registeredFactoriesForConnectorsOfUnderlyingEngines = {};


function createPsuedoMethodForRemovingEventListenersFromAnEngine(engineId) {
	return () => {
		console.log(`${chalk.bgYellow.black(' WARNING ')}: ${
			chalk.yellow(`For engine "${chalk.red(engineId)}", the method for removing event handlers for not implemented yet!`)}`);
	};
}

function formatTimestamp(timestamp, format = defaultConfigs.loggingTimestampFormat) {
	return moment(timestamp).format(format);
}

function getValidStringFrom(stringToCheck) {
	const mightBeValid = typeof stringToCheck === 'string' && !!stringToCheck;
	if (mightBeValid) {
		return stringToCheck.trim();
	}
	return '';
}


// eslint-disable-next-line max-statements
function LazyWatcherClass(scopeId, globsToWatch, actionToTake, constructionOptions) {
	scopeId = getValidStringFrom(scopeId);
	if (!scopeId) {
		throw new TypeError(chalk.bgRed.black(` Arguments[${chalk.white(0)}] ("${
			chalk.white('scopeId')}"): Must be a non empty string. `));
	}

	scopeId = scopeId.trim();

	if (!globsToWatch) {
		throw new TypeError(chalk.bgRed.black(` Arguments[${chalk.white(1)}] ("${
			chalk.white('globsToWatch')}"): Must be either a non empty string or an array of non empty strings. `));
	}

	if (!Array.isArray(globsToWatch)) {
		globsToWatch = [globsToWatch];
	}

	if (typeof actionToTake !== 'function') {
		throw new TypeError(chalk.bgRed.black(` Arguments[${chalk.white(2)}] ("${
			chalk.white('actionToTake')}"): Must be a function. `));
	}

	const thisWatcher = this;

	const scopeIdPrintingString = LazyWatcherClass.getPrettyPrintingStringOfScopeId(scopeId);

	const {
		basePath = process.cwd(),
		delayTimeForTakingAction = LazyWatcherClass.defaultConfigs.delayTimeInMilliSecondsForGatheringEvents,
		shouldNeverConnectToAnUnderlyingWatchEngine = false,
		shouldNotConnectToAnyUnderlyingEngineOnConstruction = false,
		shouldTakeActionOnConstuction = false,
		underlyingWatchEngineIdToUse = '',
		shouldLogVerbosely = false,
	} = constructionOptions;


	let actionsAreAllowedInTheFuture = false; // 如果为 false ，文件变动仍然会积累，但注册的动作被按下，不激发。


	let somethingChangedAfterLastActionStart = false;
	let knownChangesSoFar = [];
	let actionIsOnGoing = false;
	let lastActionTakenTimestamp = NaN;
	let currentTimerId = null;

	let lastUsedUnderlyingWatchEngineId = '';
	let currentUnderlyingWatchEngineId = '';
	let currentUnderlyingWatchEngineConnector = null;
	let normalizedGlobs = [];


	const cachedConnectorsToUsedUnderlyingEngines = {};
	const events = {
		rawListenerFor: {
			'the "all" event': rememberAnEvent,
		},
		usedListenerFor: {},
		emitterOf: {},
	};


	thisWatcher.scopeId = scopeId;
	thisWatcher.basePath = basePath;
	thisWatcher.rawGlobsToWatch = globsToWatch;

	thisWatcher.connectToUnderlyingWatchEngine = connectToUnderlyingWatchEngine.bind(thisWatcher);
	thisWatcher.disconnectCurrentUnderlyingWatchEngine = disconnectCurrentUnderlyingWatchEngine.bind(thisWatcher);
	thisWatcher.allowFutureActions = allowFutureActions.bind(thisWatcher);
	thisWatcher.holdFutureActions = holdFutureActions.bind(thisWatcher);
	thisWatcher.rememberAnEvent = rememberAnEvent.bind(thisWatcher);
	thisWatcher.forceToTakeActionOnce = () => { takeActionOnce(true); };

	thisWatcher.getLastUsedUnderlyingWatchEngineId = () => {
		return lastUsedUnderlyingWatchEngineId;
	};

	thisWatcher.getCurrentUnderlyingWatchEngineId = () => {
		return currentUnderlyingWatchEngineId;
	};

	thisWatcher.getCurrentUnderlyingWatchEngineConnector = () => {
		return currentUnderlyingWatchEngineConnector;
	};

	thisWatcher.getNormalizedGlobs = () => {
		return [].concat(normalizedGlobs);
	};

	thisWatcher.getInvolvedFileRecords = () => {
		return [].concat(knownChangesSoFar);
	};

	thisWatcher.actionIsOnGoing = () => {
		return actionIsOnGoing;
	};

	thisWatcher.actionsAreAllowedInTheFuture = () => {
		return actionsAreAllowedInTheFuture;
	};

	thisWatcher.onUnderlyingWatchEngineConnected = undefined;
	thisWatcher.onUnderlyingWatchEngineDisconnected = undefined;


	if (shouldTakeActionOnConstuction) {
		takeActionOnce(true);
	}

	if (!shouldNotConnectToAnyUnderlyingEngineOnConstruction) {
		connectToUnderlyingWatchEngine(underlyingWatchEngineIdToUse);
	}


	function toNormalizeGlobs(rawGlobs, toNormalizeOneGlob) {
		return rawGlobs.map(toNormalizeOneGlob);
	}

	function getConnectorViaEngineId(desiredEngineId, options) {
		if (cachedConnectorsToUsedUnderlyingEngines[desiredEngineId]) {
			return cachedConnectorsToUsedUnderlyingEngines[desiredEngineId];
		}

		const registeredFactory = registeredFactoriesForConnectorsOfUnderlyingEngines[desiredEngineId];

		if (typeof registeredFactory !== 'function') {
			throw new ReferenceError(chalk.bgRed.black(` Unknown underlying watch engine: "${desiredEngineId}". `));
		}

		const connectorDefinition = registeredFactory(options);
		cachedConnectorsToUsedUnderlyingEngines[desiredEngineId] = connectorDefinition;

		return connectorDefinition;
	}

	function connectToUnderlyingWatchEngine(desiredEngineId, options = {}) {
		if (shouldNeverConnectToAnUnderlyingWatchEngine) {
			console.log(`Scope ${
				scopeIdPrintingString
			} ${chalk.bgRed.black(' is FORBIDDEN to connect to any watch engine. ')}.`);

			return false;
		}

		if (currentUnderlyingWatchEngineId) {
			console.log(`Watch engine ("${
				chalk.magenta(currentUnderlyingWatchEngineId)
			}") of scope ${
				scopeIdPrintingString
			} has already connected before.`);

			return false;
		}

		desiredEngineId = getValidStringFrom(desiredEngineId);
		if (!desiredEngineId) {
			desiredEngineId = lastUsedUnderlyingWatchEngineId || LazyWatcherClass.defaultConfigs.underlyingWatchEngineId;
		}

		// The statement below might throw to guard arguments.
		currentUnderlyingWatchEngineConnector = getConnectorViaEngineId(
			desiredEngineId,
			Object.assign({}, constructionOptions, options)
		);

		normalizedGlobs = toNormalizeGlobs(
			globsToWatch,
			currentUnderlyingWatchEngineConnector.toNormalizeOneGlob
		);

		// If nothing was thrown, then we are safe now.
		currentUnderlyingWatchEngineId = desiredEngineId;
		currentUnderlyingWatchEngineConnector.listenToEvents(
			normalizedGlobs,
			events
		);

		console.log(`\n\n${
			chalk.bgGreen.black(' Connected Watch Engine ')
		}${
			chalk.bgMagenta.black(` ${currentUnderlyingWatchEngineId} `)
		}${
			scopeIdPrintingString
		}`);

		LazyWatcherClass.logGlobsAsAList(normalizedGlobs);

		if (typeof thisWatcher.onUnderlyingWatchEngineConnected === 'function') {
			thisWatcher.onUnderlyingWatchEngineConnected();
		}

		allowFutureActions();

		return true;
	}

	function disconnectCurrentUnderlyingWatchEngine(shouldFinishRestWork) {
		holdFutureActions(shouldFinishRestWork);

		if (!currentUnderlyingWatchEngineId) {
			return false;
		}

		currentUnderlyingWatchEngineConnector.removeAllListeners(events);

		lastUsedUnderlyingWatchEngineId = currentUnderlyingWatchEngineId;
		currentUnderlyingWatchEngineId = '';
		currentUnderlyingWatchEngineConnector = null;

		if (typeof thisWatcher.onUnderlyingWatchEngineDisconnected === 'function') {
			thisWatcher.onUnderlyingWatchEngineDisconnected(lastUsedUnderlyingWatchEngineId);
		}

		console.log(`\n${
			chalk.bgYellow.black(' Disconnected Watch Engine ')
		}${
			chalk.bgMagenta.black(` ${lastUsedUnderlyingWatchEngineId} `)
		}${
			scopeIdPrintingString
		}\n\n`);
	}

	function allowFutureActions() {
		if (actionsAreAllowedInTheFuture) {
			return;
		}

		actionsAreAllowedInTheFuture = true;
		console.log(`${
			chalk.bgBlue.black(' Action Enabled ')
		} on scope ${scopeIdPrintingString}.`);

		console.log(`${
			chalk.bgGreen.black(' Watching Globs ')
		} on scope ${scopeIdPrintingString}...`);
	}

	function _startTimerForDelayedAction() {
		// console.log('trying to start timer');
		if (actionsAreAllowedInTheFuture && !currentTimerId && !actionIsOnGoing) {
			currentTimerId = setTimeout(takeActionOnce, delayTimeForTakingAction);

			if (shouldLogVerbosely) {
				console.log(`${
					chalk.bgGreen.black(' Timer set for action ')
				} on scope ${scopeIdPrintingString}...`);
			}
		}
	}

	function _stopTimerSoThatNoMoreActionsWillTake() {
		// console.log('trying to stop timer');
		if (currentTimerId) {
			clearTimeout(currentTimerId);
			currentTimerId = null;

			if (shouldLogVerbosely) {
				console.log(`${
					chalk.bgBlue.black(' Timer cleared ')
				} on scope ${scopeIdPrintingString}.`);
			}
		}
	}

	function holdFutureActions(shouldFinishRestWork) {
		_stopTimerSoThatNoMoreActionsWillTake();

		actionsAreAllowedInTheFuture = false;
		console.log(`\n${
			chalk.bgYellow.black(' Action Disabled ')
		} on scope ${scopeIdPrintingString}.`);

		if (shouldFinishRestWork) {
			takeActionOnce();
		}
	}

	function rememberAnEvent(typeOfTheChange, involvedFileRawPath) {
		const timestamp = Date.now();
		// console.log('remembering one issue');

		_startTimerForDelayedAction();

		somethingChangedAfterLastActionStart = true;

		const involvedFileNormalizedPath = currentUnderlyingWatchEngineConnector.toNormalizeOneGlob(involvedFileRawPath);

		const fileRecord = {
			timestamp,
			typeOfChange: typeOfTheChange,
			file: involvedFileNormalizedPath,
			scopeId,
		};

		if (shouldLogVerbosely) {
			console.log(`>>> ${LazyWatcherClass.getPrintStringOfOneInvolvedFile(fileRecord)}`);
		}

		knownChangesSoFar.push(fileRecord);
	}

	function _onActionFinished(theWayLeadsHere) {
		actionIsOnGoing = false;
		lastActionTakenTimestamp = NaN;

		if (shouldLogVerbosely) {
			console.log(`\n>>> ${
				chalk.blue('Action')
			} of the watcher for ${scopeIdPrintingString} is ${
				chalk.blue('done')
			}.\n    Told by the ${
				chalk.magenta(theWayLeadsHere.slice(4))
			}.`);
		}

		// 如果已经有后续变化，继续执行预设动作。
		// console.log('here on finish. Try accum task...');
		takeActionOnce();
		// console.log('here continue on finish. Action is on going again?', actionIsOnGoing);

		// 如果上面一句（即 takeActionOnce() ）重新使得 actionIsOnGoing 为 true，
		// 意味着已有任务在队列中等待至今，因此暂时仍不必调用 _startTimerForDelayedAction ，
		// 而是继续等待由上一语句启动的新一次动作结束。
		// 顺便：如果每每执行至此行，actionIsOnGoing 总是 true，
		// 则意味着异步执行的任务较慢，文件变动事件发生得较快、较频繁。
		// 这种情况没有害处，仅仅是文件变动积攒很快，每批次处理的文件数较多罢了。
		if (!actionIsOnGoing) {
			_startTimerForDelayedAction();

			console.log(`${
				chalk.bgGreen.black(' Watching Globs ')
			} on scope ${scopeIdPrintingString}...`);
		}
	}

	function actionFinishedCallback(/* info */) {
		_onActionFinished('via callback');
	}

	function takeActionOnce(isForcedToTakeAction) {
		isForcedToTakeAction = !!isForcedToTakeAction;

		// console.log(
		// 	'tyring to take action once\n',
		// 	'  ', isForcedToTakeAction || actionsAreAllowedInTheFuture,
		// 	isForcedToTakeAction || !actionIsOnGoing,
		// 	isForcedToTakeAction || somethingChangedAfterLastActionStart
		// );

		_stopTimerSoThatNoMoreActionsWillTake();

		if (!isForcedToTakeAction) {
			if (!actionsAreAllowedInTheFuture) {
				return;
			}

			if (actionIsOnGoing) {
				return;
			}

			if (!somethingChangedAfterLastActionStart) {
				return;
			}
		}

		// console.log('taking action once. forced to?', isForcedToTakeAction);

		actionIsOnGoing = true;

		const changesWeAreDealingWith = [].concat(knownChangesSoFar);


		knownChangesSoFar = [];
		somethingChangedAfterLastActionStart = false;


		lastActionTakenTimestamp = new Date().getTime();
		const detailsOfThisBatch = {
			isForcedToTakeAction,
			scopeId,
			timestamp: lastActionTakenTimestamp,
			fileRecords: changesWeAreDealingWith,
		};

		LazyWatcherClass.logABatchOfInvolvedFilesForScope(scopeId, detailsOfThisBatch);

		const returnedValue = actionToTake(actionFinishedCallback, detailsOfThisBatch);

		if (returnedValue === LazyWatcherClass.defaultConfigs.actionReturnValueThatStandsForFinish) {
			_onActionFinished('via returned value');
		} else if (LazyWatcherClass.isAPromiseObject(returnedValue)) {
			returnedValue.done(() => { _onActionFinished('via Promise object'); });
		}
	}
}


LazyWatcherClass.defaultConfigs = defaultConfigs;


LazyWatcherClass.isAPromiseObject = (input) => {
	return !!input && typeof input.then === 'function' && typeof input.done === 'function';
};

LazyWatcherClass.defaultMethodToNormalizeOneGlob = rawGlob => rawGlob;

LazyWatcherClass.getPrettyPrintingStringOfScopeId = (scopeId) => {
	const foldingChar = consoleDoesSupportColors ? ' ' : '"';
	return chalk.bgWhite.black(`${foldingChar}${scopeId}${foldingChar}`);
};

LazyWatcherClass.logGlobsAsAList = (globs, indentation = 4) => {
	const globsListString = globs.reduce((accumString, glob) => {
		const hasNegativeSign = glob.slice(0, 1) === '!';
		const globString = hasNegativeSign ?
			`${' '.repeat(indentation - 1)}${chalk.red(glob)}` :
			`${' '.repeat(indentation)}${chalk.green(glob)}`;
		return `${accumString}${globString}\n`;
	}, '');

	console.log(globsListString);
};

LazyWatcherClass.logInvolvedFileRecordsAsAList = (fileRecords) => {
	if (fileRecords.length < 1) {
		console.log(`    ${chalk.gray('<none>')}`);
		return;
	}

	const listString = fileRecords.reduce((accumString, fileRecord) => {
		return `${accumString}    ${LazyWatcherClass.getPrintStringOfOneInvolvedFile(fileRecord, true)}\n`;
	}, '');

	console.log(listString);
};

LazyWatcherClass.logABatchOfInvolvedFilesForScope = (scopeId, detailsOfThisBatch) => {
	const labelString = detailsOfThisBatch.isForcedToTakeAction ?
		chalk.bgYellow.black(' FORCED to Take Action ') :
		chalk.bgGreen.black(' Taking Action ');
	console.log(`\n${
		chalk.gray(new Date(detailsOfThisBatch.timestamp).toLocaleString())
	}\n${labelString} on scope ${
		LazyWatcherClass.getPrettyPrintingStringOfScopeId(scopeId)
	}...`);

	console.log('    Involved file(s) in this batch:');
	LazyWatcherClass.logInvolvedFileRecordsAsAList(detailsOfThisBatch.fileRecords);
	console.log('');
};

LazyWatcherClass.getLoggingTermAndStyleForAnEvent = (typeOfTheChange) => {
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
};

LazyWatcherClass.getPrintStringOfOneInvolvedFile = ({
	timestamp,
	scopeId,
	typeOfChange,
	file,
}, shouldOmitScopeInfo) => {
	const {
		loggingKeyColor,
		loggingKeyBgColor,
		termOfEventType,
		termOfEventTypePadding,
	} = LazyWatcherClass.getLoggingTermAndStyleForAnEvent(typeOfChange);

	return `${
		chalk.gray(formatTimestamp(timestamp))
	} ${
		shouldOmitScopeInfo ? '' : LazyWatcherClass.getPrettyPrintingStringOfScopeId(scopeId)
	}${
		chalk[loggingKeyBgColor].black(` ${termOfEventType} `)
	}${
		termOfEventTypePadding
	} ${
		chalk[loggingKeyColor](file)
	}`;
};

LazyWatcherClass.getFactoryForConnectorOfARegisteredUnderlyingWatchEngine = (desiredEngineId) => {
	return registeredFactoriesForConnectorsOfUnderlyingEngines[desiredEngineId];
};

LazyWatcherClass.getAllFactoriesForConnectorsOfAllRegisteredUnderLyingWatchEngines = () => {
	return Object.assign({}, registeredFactoriesForConnectorsOfUnderlyingEngines);
};

LazyWatcherClass.validateAConnectorDefinition = (connectorToCheck, engineId) => {
	if (!engineId) {
		engineId = '<Unspecified engine>';
	}

	const logStringForError = `\n${
		chalk.bgRed.black(' Type Error ')
	}\n  ${
		chalk.red(` The created connector for engine "${chalk.white(engineId)}" is invalid. `)
	}`;

	const logString1 = `The created connector for engine "${chalk.white(engineId)}"`;

	if (!connectorToCheck) {
		console.log(logStringForError);
		throw new TypeError();
	}

	if (typeof connectorToCheck.listenToEvents !== 'function') {
		console.log(`${logStringForError}\n  ${
			chalk.red(` It MUST contain a method named "${chalk.white('listenToEvents')}". `)
		}\n`);

		throw new TypeError();
	}

	if (typeof connectorToCheck.removeAllListeners !== 'function') {
		console.log(`\n${chalk.bgYellow.black(' WARNING ')}:\n    ${
			chalk.yellow(`${
				logString1
			}\n    has ${
				chalk.magenta('NO')
			} method named "${
				chalk.green('removeAllListeners')
			}".`)
		}\n`);
	}

	const validConnector = {
		toNormalizeOneGlob: LazyWatcherClass.defaultMethodToNormalizeOneGlob,
		listenToEvents: connectorToCheck.listenToEvents,
		removeAllListeners: connectorToCheck.removeAllListeners || createPsuedoMethodForRemovingEventListenersFromAnEngine(engineId),
	};

	if (typeof connectorToCheck.toNormalizeOneGlob === 'function') {
		validConnector.toNormalizeOneGlob = connectorToCheck.toNormalizeOneGlob;
	}

	return validConnector;
};

LazyWatcherClass.registerConnectorForOneUnderlyingWatchEngine = (engineId, toCreateConnectorDefinition) => {
	engineId = getValidStringFrom(engineId);
	if (!engineId) {
		throw new TypeError(chalk.bgRed.black(' Invalid engine id provided. MUST be a non empty string. '));
	}

	let decidedConnectorFactory;

	if (typeof toCreateConnectorDefinition === 'function') {
		decidedConnectorFactory = (options) => {
			const createdConnector = toCreateConnectorDefinition(options);
			const validConnector = LazyWatcherClass.validateAConnectorDefinition(createdConnector, engineId);
			return validConnector;
		};
	} else {
		// Otherwise it is expected to be a valid definition object literal.
		const connectorDefinition = toCreateConnectorDefinition;

		// The statement below might throw to guard arguments.
		const validConnector = LazyWatcherClass.validateAConnectorDefinition(connectorDefinition, engineId);

		// If nothing was thrown, then we are safe now.
		decidedConnectorFactory = () => {
			return Object.assign({}, validConnector);
		};
	}

	registeredFactoriesForConnectorsOfUnderlyingEngines[engineId] = decidedConnectorFactory;

	return decidedConnectorFactory;
};


function createWatchersAccordingTo(scopedWatchingSettings, sharedOptions = {
	// shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes,
	// aggregatedSourceGlobsToWatch,
	// engineId, // also allow in each scoped settings
	// basePath, // also allow in each scoped settings
	// shouldLogVerbosely, // also allow in each scoped settings
}) {
	const {
		underlyingWatchEngineIdToUse = LazyWatcherClass.defaultConfigs.underlyingWatchEngineId,
		basePath = process.cwd(),
		shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes = false,
		shouldLogVerbosely = false,
	} = sharedOptions;

	const decidedSharedOptions = {
		underlyingWatchEngineIdToUse,
		basePath,
		shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes,
		shouldLogVerbosely,
	};

	const knownScopeIds = Object.keys(scopedWatchingSettings);

	const watchersThatNeedToTakeActionOnConstruction = [];
	const lazyWatcherInstances = knownScopeIds.reduce((watchers, scopeId) => {
		const settingsOfThisScope = scopedWatchingSettings[scopeId];
		const lazyWatcherConstructionOptions = Object.assign({}, decidedSharedOptions, settingsOfThisScope);

		delete lazyWatcherConstructionOptions.globsToWatch;
		delete lazyWatcherConstructionOptions.actionToTake;
		delete lazyWatcherConstructionOptions.shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes;

		// console.log(lazyWatcherConstructionOptions);

		if (shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes) {
			lazyWatcherConstructionOptions.shouldNeverConnectToAnUnderlyingWatchEngine = true;

		}

		const lazyWatcherInstance = new LazyWatcherClass(
			scopeId,
			settingsOfThisScope.globsToWatch,
			settingsOfThisScope.actionToTake,
			lazyWatcherConstructionOptions
		);

		if (
			shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes &&
			lazyWatcherConstructionOptions.shouldTakeActionOnConstuction
		) {
			watchersThatNeedToTakeActionOnConstruction.push(lazyWatcherInstance);
		}

		watchers[scopeId] = lazyWatcherInstance;

		return watchers;
	}, {});


	let sharedConnector;
	if (shouldShareSingleUnderlyingWatcherInstanceAcrossAllScopes) {
		let { aggregatedSourceGlobsToWatch } = sharedOptions;

		if (!Array.isArray(aggregatedSourceGlobsToWatch)) {
			aggregatedSourceGlobsToWatch = knownScopeIds.reduce((allGlobs, scopeId) => {
				const lazyWatcherInstance = lazyWatcherInstances[scopeId];
				return allGlobs.concat(lazyWatcherInstance.getNormalizedGlobs());
			}, []);
		}

		if (shouldLogVerbosely) {
			console.log(`\n>>> ${chalk.bgGreen.black(' WATCHING MERGED GLOBS ')} for ${chalk.bgYellow.black(' <ALL SCOPES> ')}:`);
			LazyWatcherClass.logGlobsAsAList(aggregatedSourceGlobsToWatch, 8);
		}

		const sharedConnectorFactory = registeredFactoriesForConnectorsOfUnderlyingEngines[underlyingWatchEngineIdToUse];
		sharedConnector = sharedConnectorFactory(decidedSharedOptions);
		sharedConnector.listenToEvents(aggregatedSourceGlobsToWatch, onSingleFileInvolved);

		watchersThatNeedToTakeActionOnConstruction.forEach(watcher => { watcher.forceToTakeActionOnce(); });
	}


	return lazyWatcherInstances;


	function onSingleFileInvolved(typeOfTheChange, involvedFileAbsolutePath) {
		const involvedWatchers = findOutAllInvolvedWatchersForOneFile(involvedFileAbsolutePath, sharedConnector.toNormalizeOneGlob);
		involvedWatchers.forEach(watcher => watcher.rememberAnEvent(typeOfTheChange, involvedFileAbsolutePath));
	}

	function findOutAllInvolvedWatchersForOneFile(involvedFileAbsolutePath, toNormalizeOneGlob) {
		return knownScopeIds.reduce((allInvolvedWatchers, scopeId) => {
			const watcherOfThisScope = lazyWatcherInstances[scopeId];

			const involvedFileNormalizedPath = toNormalizeOneGlob(
				involvedFileAbsolutePath,
				watcherOfThisScope.basePath
			);
			const globsOfThisWatcher = watcherOfThisScope.normalizedGlobs;

			const fileIsWatchedByThisWatcher = globsOfThisWatcher.some(glob => pathMatchesGlob(involvedFileNormalizedPath, glob));

			if (fileIsWatchedByThisWatcher) {
				allInvolvedWatchers.push(watcherOfThisScope);
			}

			return allInvolvedWatchers;
		}, []);
	}
}

const factoryForConnectorOfGaze = require('./scoped-globs-lazy-watchers-connector-to-gaze');
LazyWatcherClass.registerConnectorForOneUnderlyingWatchEngine('gaze', factoryForConnectorOfGaze);
