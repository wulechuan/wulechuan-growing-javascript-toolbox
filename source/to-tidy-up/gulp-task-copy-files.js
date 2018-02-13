/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, global-require: 0 */

const globs = require('globs');
const gulp = require('gulp');
const renameFiles = require('gulp-rename');
const pump = require('pump');
const chalk = require('chalk');

const printInfoAboutTheCompletionOfTask = require('../utils/print-one-thing-done');

module.exports = function createTaskForCopyingFiles(sourceGlobs, outputPath, options = {}) {
	const {
		shouldFlattenSubFolders = false,
		outputFileTypeWithDot = null,
		logPrefix = 'Unspeficied task',
		descriptionOfAssetsToCopy = '',
		shouldNotLogDetails = false,
		shouldListSourceFiles = true,
	} = options;


	return function taskBody(thisTaskDone) {
		if (!shouldNotLogDetails) {
			let descriptionOrDetailedList;

			if (shouldListSourceFiles) {

				const resolvedFileList = globs.sync(sourceGlobs);
				const resolvedFileListString = resolvedFileList.length > 0 ?
					JSON.stringify(resolvedFileList, null, 4).slice(2, -2) :
					`    ${chalk.red('<nothing>')}`;

				descriptionOrDetailedList = `copying globs:\n${
					chalk.blue(JSON.stringify(sourceGlobs, null, 4).slice(2, -2).replace(/\\\\/g, '/'))
				}\nwhich resolved to:\n${
					resolvedFileListString
				}`;

			} else {

				const descriptionOfAssets = descriptionOfAssetsToCopy ?
					` ${chalk.magenta(descriptionOfAssetsToCopy)}` :
					'';
				descriptionOrDetailedList = `copying${descriptionOfAssets}...`;

			}

			console.log(`\n${
				chalk.bgGreen.black(` ${logPrefix} `)
			}\n${
				descriptionOrDetailedList
			}\ninto:\n    ${
				chalk.green(outputPath)
			}`);
		}

		const stepsToTake = [];

		stepsToTake.push(gulp.src(sourceGlobs));


		if (shouldFlattenSubFolders || outputFileTypeWithDot) {
			const renamingConfig = {};

			if (outputFileTypeWithDot) {
				renamingConfig.extname = outputFileTypeWithDot;
			}

			if (shouldFlattenSubFolders) {
				renamingConfig.dirname = '';
			}

			stepsToTake.push(renameFiles(renamingConfig));
		}


		stepsToTake.push(gulp.dest(outputPath));

		return pump(stepsToTake, () => {
			printInfoAboutTheCompletionOfTask(`Copying files of ${descriptionOfAssetsToCopy}`);
			thisTaskDone();
		});
	};
};
