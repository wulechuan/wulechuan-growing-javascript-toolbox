/* eslint no-console: 0, global-require: 0, no-buffer-constructor: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');
const deleteFiles = require('del');

const { join: joinPath, resolve: resolvePath } = pathTool; // eslint-disable-line no-unused-vars

const gulp = require('gulp');
const runTasksSequentially = require('gulp-sequence');
const chalk = require('chalk'); // eslint-disable-line no-unused-vars

/*
*
*
*
*
*
*
* ****************************************
*               整理环境常量
* ****************************************
*/

const processArguments = require('minimist')(process.argv.slice(2)); // eslint-disable-line no-unused-vars
const npmProjectRootPath = process.cwd(); // eslint-disable-line no-unused-vars
const packageJSON = require(resolvePath(npmProjectRootPath,' package.json'));

const {
	buildingRoot: buildingRootFolder,
	distribution: distributionFolder,
	documentsWebsiteSource: docsWebsiteSourceScaffoldFolder,
} = packageJSON.directories;

const sourceCodeRootFolder = 'source';


// --------------- 解析路径 ---------------

const distributionPath = joinPath(buildingRootFolder, distributionFolder);


// --------------- 源globs ---------------

const globThatExcludesNodeModuleFiles = '!node_modules/**/*.*'; // eslint-disable-line no-unused-vars

const libraryMediaSourceGlobs = [
	joinPath(sourceCodeRootFolder, '**/*.png'),
	joinPath(sourceCodeRootFolder, '**/*.jpg'),
	joinPath(sourceCodeRootFolder, '**/*.jpeg'),
	joinPath(sourceCodeRootFolder, '**/*.git'),
	joinPath(sourceCodeRootFolder, '**/*.webp'),
	joinPath(sourceCodeRootFolder, '**/*.svg'),
	joinPath(sourceCodeRootFolder, '**/*.eot'),
	joinPath(sourceCodeRootFolder, '**/*.ttf'),
	joinPath(sourceCodeRootFolder, '**/*.woff'),
	joinPath(sourceCodeRootFolder, '**/*.woff2'),
	// globThatExcludesNodeModuleFiles,
];

const libraryMediaSourceGlobsToWatch = libraryMediaSourceGlobs;

const libraryStylesSourceGlobsAsCompilationEntries = [
	joinPath(sourceCodeRootFolder, '**/index.styl'),
	joinPath(sourceCodeRootFolder, '**/index.stylus'),
];

const libraryStylesSourceGlobsToWatch = [
	joinPath(sourceCodeRootFolder, '**/iconfont.css'),
	joinPath(sourceCodeRootFolder, '**/*.styl'),
	joinPath(sourceCodeRootFolder, '**/*.stylus'),
];

const docsWebsiteLayoutStylesSourceGlobsAsCompilationEntries = [
	joinPath(docsWebsiteSourceScaffoldFolder, '**/index.styl'),
	joinPath(docsWebsiteSourceScaffoldFolder, '**/index.stylus'),
];

const docsWebsiteLayoutStylesSourceGlobsToWatch = [
	joinPath(docsWebsiteSourceScaffoldFolder, '**/*.stylus'),
];

const foldersToDeleteBeforeEachDistribution = [
	distributionPath,
];

/*
*
*
*
*
*
*
* ****************************************
*     加载自定义通用工具；临时定义通用工具
* ****************************************
*/

const createTaskForCopyingFiles = require('./utils/gulp-task-copy-files');
const categorizedGlobsLazilyWatchingMechanism = require('./utils/categorized-globs-watchers');

function printInfoAboutTheCompletionOfTask(taskDescription = 'Unspecified Task') {
	console.log(`\n${
		chalk.bgRed.black(' ♥ ')
	}${
		chalk.bgMagenta.black(` ${taskDescription} `)
	}${
		chalk.bgRed.black(' DONE ')
	}\n`);
}

/*
*
*
*
*
*
*
* ****************************************
*          加载任务主体；构建任务主体
* ****************************************
*/

const doCopyLibraryMediaFiles = createTaskForCopyingFiles(
	libraryMediaSourceGlobsToWatch,
	distributionPath,
	{
		// shouldFlattenSubFolders: true,
		logPrefix: chalk.blue('Distribution'),
		descriptionOfAssetsToCopy: 'media files',
	}
);

function toWatchFiles() {
	categorizedGlobsLazilyWatchingMechanism.setupWatchers(categorizedSourceGlobsToWatch);
}

function toCopyLibraryMediaFiles(tellGlobsWatcherThisActionFinishedOnce) {
	// something
	doCopyLibraryMediaFiles(tellGlobsWatcherThisActionFinishedOnce);
}

function toCompileLibraryStyles(tellGlobsWatcherThisActionFinishedOnce) {
	// something
	console.log(libraryStylesSourceGlobsAsCompilationEntries);
	tellGlobsWatcherThisActionFinishedOnce();
}

function toCompileUsingWebpack(tellGlobsWatcherThisActionFinishedOnce) {
	// something
	tellGlobsWatcherThisActionFinishedOnce();
}

function toCompileDocsSiteLayoutStyles(tellGlobsWatcherThisActionFinishedOnce) {
	// something
	console.log(docsWebsiteLayoutStylesSourceGlobsAsCompilationEntries);
	tellGlobsWatcherThisActionFinishedOnce();
}

/*
*
*
*
*
*
*
* ****************************************
*           定义监测（Watch）行为
* ****************************************
*/

const categorizedSourceGlobsToWatch = {
	'docs website layout: styles': {
		globsToWatch: docsWebsiteLayoutStylesSourceGlobsToWatch,
		actionToTake: toCompileDocsSiteLayoutStyles,
	},
	'library: styles': {
		globsToWatch: libraryStylesSourceGlobsToWatch,
		actionToTake: toCompileLibraryStyles,
	},
	'library: media': {
		globsToWatch: libraryMediaSourceGlobsToWatch,
		actionToTake: toCopyLibraryMediaFiles,
	},
};

/*
*
*
*
*
*
*
* ****************************************
*        定义任务；定义任务依赖关系关系
* ****************************************
*/

gulp.task('distribution: delete old distribution', () => deleteFiles(foldersToDeleteBeforeEachDistribution));
gulp.task('clean: files that are commonly shared among tasks', () => deleteFiles('abcdefg.hij'));

gulp.task('clean: all built files', [
	'distribution: delete old distribution',
	'clean: files that are commonly shared among tasks',
], (thisTaskDone) => {
	printInfoAboutTheCompletionOfTask('Clean All Built Files');
	thisTaskDone();
});

gulp.task('watch: all', toWatchFiles);

gulp.task('distribution: copy media', toCopyLibraryMediaFiles);
gulp.task('distribution: compile styles', toCompileLibraryStyles);
gulp.task('distribution: build using webpack', toCompileUsingWebpack);

gulp.task('distribution-entry-task', (thisTaskDone) => {
	process.env.RUN_ENV = 'PRODUCTION';
	runTasksSequentially(
		'distribution: delete old distribution',
		[
			'distribution: copy media',
			'distribution: compile styles',
			'distribution: build using webpack',
		]
	)((errorCode) => {
		if (!errorCode) {
			printInfoAboutTheCompletionOfTask('Distribution');
		}
		thisTaskDone(errorCode);
	});
});
