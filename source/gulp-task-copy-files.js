/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, global-require: 0 */

const gulp = require('gulp');
const renameFiles = require('gulp-rename');
const pump = require('pump');
const chalk = require('chalk');

module.exports = function createTaskForCopyingFiles(sourceGlobs, outputPath, options) {
	const {
		shouldFlattenSubFolders = false,
		logPrefix = 'Unspeficied task',
		descriptionOfAssetsToCopy = '',
		shouldNotLogDetails = false,
	} = options;

	const descriptionOfAssets = descriptionOfAssetsToCopy ?
		chalk.magenta(descriptionOfAssetsToCopy) :
		'files';

	return function taskBody(thisTaskDone) {
		if (!shouldNotLogDetails) {
			console.log(`\n>>> ${
				logPrefix
			}\n    copying ${descriptionOfAssets}...`);
		}

		const stepsToTake = [];

		stepsToTake.push(gulp.src(sourceGlobs));

		if (shouldFlattenSubFolders) {
			stepsToTake.push(renameFiles({ dirname: '' }));
		}

		stepsToTake.push(gulp.dest(outputPath));

		return pump(stepsToTake, thisTaskDone);
	};
};
