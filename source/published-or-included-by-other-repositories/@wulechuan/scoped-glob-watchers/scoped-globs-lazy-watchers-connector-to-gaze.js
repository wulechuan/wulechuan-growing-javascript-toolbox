/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, no-use-before-define: 0 */
const pathTool = require('path');
const gaze = require('gaze');

module.exports = function createConnectorForTheGazeEngine(options = {}) {
	const {
		basePath = '',
	} = options;

	return {
		listenToEvents,
		removeAllListeners,
		toNormalizeOneGlob,
	};

	function listenToEvents(globsToWatch, events) {
		const {
			rawListenerFor,
			usedListenerFor,
		} = events;

		const defaultSingleFileInvolvedListener = rawListenerFor['the "all" event'];

		if (!usedListenerFor['gaze:all']) {
			usedListenerFor['gaze:all'] = defaultSingleFileInvolvedListener;
		}

		// if (!usedListenerFor['gaze:added']) {
		// 	usedListenerFor['gaze:added'] = (involvedFileAbsolutePath) => {
		// 		defaultSingleFileInvolvedListener('added', involvedFileAbsolutePath);
		// 	};
		// }

		// if (!usedListenerFor['gaze:renamed']) {
		// 	usedListenerFor['gaze:renamed'] = (involvedFileAbsolutePath) => {
		// 		defaultSingleFileInvolvedListener('renamed', involvedFileAbsolutePath);
		// 	};
		// }

		// if (!usedListenerFor['gaze:changed']) {
		// 	usedListenerFor['gaze:changed'] = (involvedFileAbsolutePath) => {
		// 		defaultSingleFileInvolvedListener('changed', involvedFileAbsolutePath);
		// 	};
		// }

		// if (!usedListenerFor['gaze:deleted']) {
		// 	usedListenerFor['gaze:deleted'] = (involvedFileAbsolutePath) => {
		// 		defaultSingleFileInvolvedListener('deleted', involvedFileAbsolutePath);
		// 	};
		// }

		gaze(globsToWatch, (error, thisGazer) => {
			events.emitterOf['gaze'] = thisGazer; // eslint-disable-line dot-notation

			thisGazer.on('all', usedListenerFor['gaze:all']);

			// 不论是直接侦听 all 事件，还是分别侦听以下四种事件，都无法避免将 rename 误判为两个不同事件。
			// 多数情况下是误判为文件先被 deleted 再被 renamed ；偶尔会出现先 deleted 后 added 。
			// 因此，干脆仍然采用侦听 all 事件。
			// thisGazer.on('added', usedListenerFor['gaze:added']);
			// thisGazer.on('renamed', usedListenerFor['gaze:renamed']);
			// thisGazer.on('changed', usedListenerFor['gaze:changed']);
			// thisGazer.on('deleted', usedListenerFor['gaze:deleted']);
		});
	}

	function removeAllListeners(events) {
		const gazer = events.emitterOf['gaze']; // eslint-disable-line dot-notation
		const eventListeners = events.usedListenerFor;
		gazer.removeListener('all', eventListeners['gaze:all']);
		// gazer.removeListener('added', eventListeners['gaze:added']);
		// gazer.removeListener('renamed', eventListeners['gaze:renamed']);
		// gazer.removeListener('changed', eventListeners['gaze:changed']);
		// gazer.removeListener('deleted', eventListeners['gaze:deleted']);
	}

	function toNormalizeOneGlob(rawGlob) {
		return toNormalizeOneGlobPathIntoRelativePath(basePath, rawGlob);
	}
};

function toNormalizeOneGlobPathIntoRelativePath(basePath, rawGlob) {
	// 一些文件监测引擎，例如 gaze ，不支持Windows路径。
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
