/* eslint indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');
const chalk = require('chalk');

module.exports = function getLogStringOfModule(
	theModule,
	{
		basePath = process.cwd(),
	} = {}
) {
	const moduleFullPath = theModule.id || theModule.filename;
	const moduleDirname = pathTool.dirname(moduleFullPath);
	const moduleFileName = pathTool.basename(moduleFullPath);
	let relativeDirname = pathTool.relative(basePath, moduleDirname).replace(/\\/g, '/');
	if (relativeDirname.length < 1) {
		relativeDirname = '.';
	}

	relativeDirname = `${relativeDirname}/`;

	return `module: ${chalk.gray(`${relativeDirname}`)}${chalk.white(moduleFileName)}`;
};
