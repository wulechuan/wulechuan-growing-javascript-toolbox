const gulp = require('gulp');
const renameFile = require('gulp-rename');
const compileStylus = require('gulp-stylus');
const pump = require('pump');

const printInfoAboutTheCompletionOfTask = require('../utils/print-one-task-done');
const printGulpErrorBeautifully = require('../utils/gulp-print-an-error-of-stylus');

module.exports = function createTaskForCompilingStylusGlobs(entryStylusGlobs, options) {
	const {
		compiledCSSOutputFolder,
		compiledCSSFileBaseName,
		sourceFileBasePath,
		shouldNotGenerateMinifiedVersions = false,
	} = options;

	const compilationOptions = {
		prefix: false,
		compress: false,
	};

	return function taskBody(thisTaskDoneCallback) {
		const taskSteps = [];

		taskSteps.push(gulp.src(entryStylusGlobs));
		taskSteps.push(compileStylus(compilationOptions));
		taskSteps.push(gulp.dest(compiledCSSOutputFolder));

		if (! shouldNotGenerateMinifiedVersions) {
			compilationOptions.compress = true;

			taskSteps.push(gulp.src(entryStylusGlobs));
			taskSteps.push(compileStylus(compilationOptions));
			taskSteps.push(renameFile({
				base: compiledCSSFileBaseName,
				suffix: '.min',
			}));
			taskSteps.push(gulp.dest(compiledCSSOutputFolder));
		}

		pump(taskSteps, (error) => {
			if (error) {
				printGulpErrorBeautifully(error, sourceFileBasePath);
			}

			printInfoAboutTheCompletionOfTask('Compiling Stylus into CSS', !!error);
			thisTaskDoneCallback();
		});
	};
};