const gulp = require('gulp');
const concatFiles = require('gulp-concat');
const uglifyJavascript = require('gulp-uglify');
const pump = require('pump');

const printInfoAboutTheCompletionOfTask = require('../utils/print-one-task-done');
const printGulpUglifyJsErrorBeautifully = require('../utils/gulp-print-an-error-of-uglify-js');

module.exports = function createTaskBodyForCompilingJS(sourceGlobsOfJavascript, options) {
	const {
		taskNameForLogs = '',
		compiledJavascriptOutputFolder,
		compiledJavascriptFileBaseName,
		sourceFileBasePath,
		shouldNotGenerateMinifiedVersions = false,
	} = options;

	return (thisTaskIsDone) => {
		const taskSteps = [];

		taskSteps.push(gulp.src(sourceGlobsOfJavascript));
		taskSteps.push(concatFiles(`${compiledJavascriptFileBaseName}.js`));
		taskSteps.push(gulp.dest(compiledJavascriptOutputFolder));

		if (! shouldNotGenerateMinifiedVersions) {
			// 故意不借用上文已有的、拼接好的 js 文件，
			// 是为了在编译出错时，能准确看到哪一个 js 文件的哪一行出错。
			taskSteps.push(gulp.src(sourceGlobsOfJavascript));
			taskSteps.push(uglifyJavascript());
			taskSteps.push(concatFiles(`${compiledJavascriptFileBaseName}.min.js`));
			taskSteps.push(gulp.dest(compiledJavascriptOutputFolder));
		}

		pump(taskSteps, (error) => {
			if (error) {
				printGulpUglifyJsErrorBeautifully(error, sourceFileBasePath);
			}

			printInfoAboutTheCompletionOfTask(`Compiling Javascript: ${taskNameForLogs}`, !!error);
			thisTaskIsDone();
		});
	};
};