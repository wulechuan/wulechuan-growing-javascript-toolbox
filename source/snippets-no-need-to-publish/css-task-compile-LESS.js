const gulp = require('gulp');
const renameFile = require('gulp-rename');
const pump = require('pump');

const compileLESS = require('gulp-less');
const minifyCSS = require('gulp-cssmin');
const postCSS = require('gulp-postcss');
const cssAutoPrefixer = require('autoprefixer');
const LESSPluginImportNPMModules = require('less-plugin-npm-import');

const chalk = require('chalk');

const pluginsForLESSCompiler = [
	new LESSPluginImportNPMModules({ prefix: '~' }),
];

const pluginsForPostCSS = [
	cssAutoPrefixer({
		browsers: [
			'last 2 versions',
			'Firefox ESR',
			// '> 1%',
			// 'ie >= 8',
		],
	}),
];

function onLESSCompilationPipelineError(theError) {
	console.log(`\n\n${'─'.repeat(32)}`);

	if (theError instanceof Error) {
		const segments = theError.message.split(/ in file | line no. /);
		if (segments.length === 3) {
			theError.message = `${
				chalk.bgRed.black(` ${segments[0]} `)
			}\nFile:\n    ${
				chalk.green(segments[1])
			}\nLine:\n    ${
				chalk.green(segments[2])
			}\n`;
		} else {
			theError.message = chalk.bgRed.black(theError.message);
		}

		console.log(`${theError}`);
		console.log(`${'─'.repeat(32)}`);

		theError.message = `in ${
			chalk.cyan('gulp-less')
		}\n    ${theError.message}`;

		throw theError;
	} else if (typeof theError === 'string') {
		throw new Error(`${chalk.bgRed.black(' LESS compilation error: ')}\n   ${theError} `);
	}
}

function createTaskForCompilingLESS(entryLESSGlobs, options) {
	const {
		compiledCSSOutputFolder,
		shouldNotGenerateMinifiedVersions = false,
	} = options;

	return function taskBody(thisTaskDoneCallback) {
		const taskSteps = [];

		taskSteps.push(gulp.src(entryLESSGlobs));
		taskSteps.push(compileLESS({
			plugins: pluginsForLESSCompiler,
		}));
		taskSteps.push(postCSS(pluginsForPostCSS));
		taskSteps.push(gulp.dest(compiledCSSOutputFolder));

		if (!shouldNotGenerateMinifiedVersions) {
			taskSteps.push(minifyCSS());
			taskSteps.push(renameFile({ suffix: '.min' }));
			taskSteps.push(gulp.dest(compiledCSSOutputFolder));
		}

		pump(taskSteps, (error) => {
			if (error) {
				onLESSCompilationPipelineError(error);
			}

			thisTaskDoneCallback();
		});
	};
}


module.exports = {
	createTaskForCompilingLESS,
};
