const gulp = require('gulp');
const concatFiles = require('gulp-concat');
const uglifyJavascript = require('gulp-uglify');
const pump = require('pump');

const printInfoAboutTheCompletionOfTask = require('../utils/print-one-thing-done');

module.exports = function createTaskBodyForCompilingJavascript(sourceGlobsOfJavascript, options) {
	const {
		taskNameForLogs = '',
		compiledJavascriptOutputFolder,
		compiledJavascriptFileBaseName,
		shouldNotGenerateMinifiedVersions = false,
	} = options;

	return (thisTaskIsDone) => {
		const taskSteps = [];

		taskSteps.push(gulp.src(sourceGlobsOfJavascript));
		taskSteps.push(concatFiles(`${compiledJavascriptFileBaseName}.js`));
		taskSteps.push(gulp.dest(compiledJavascriptOutputFolder));

		if (! shouldNotGenerateMinifiedVersions) {
			// 故意【不】借用上文已有的、拼接好的 js 文件，
			// 是为了在编译出错时，能准确看到哪一个 js 文件的哪一行出错。
			taskSteps.push(gulp.src(sourceGlobsOfJavascript));
			taskSteps.push(uglifyJavascript());
			taskSteps.push(concatFiles(`${compiledJavascriptFileBaseName}.min.js`));
			taskSteps.push(gulp.dest(compiledJavascriptOutputFolder));
		}

		pump(taskSteps, (error) => {
			if (error) {
				console.log(error);
				console.log('-'.repeat(32), '\n');
			}

			printInfoAboutTheCompletionOfTask(`Compiling Javascript: ${taskNameForLogs}`);
			thisTaskIsDone();
		});
	};
};