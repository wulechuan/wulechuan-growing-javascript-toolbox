/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, */

const fileSystem = require('fs');
const pathTool = require('path');
const chalk = require('chalk');

module.exports = function modifyNodeModuleFilesAndMakeBackups(originalFiles = [], options) {
	function defaultActionOnReplacingFileContents(originalFileAbsolutePath, backupFileAbsolutePath) {
		console.log(`\n>>> ${
			chalk.bgRed.black(' MODIFYING FILE ')
		}${
			chalk.bgGreen.black(' with backup ')
		}\n    ${
			chalk.red(originalFileAbsolutePath)
		}\n    ${
			chalk.green(backupFileAbsolutePath)
		}`);
	}

	const {
		anythingMatches,
		into: withString,
		shouldRestoreOriginalFileContentsInsteadOfModifyingThem = false,
		onReplacingFileContents = defaultActionOnReplacingFileContents,
	} = options;

	originalFiles.forEach((originalFileAbsolutePath) => {
		const originalFilePathFormat = pathTool.parse(originalFileAbsolutePath);
		delete originalFilePathFormat.base;

		const backupFileAbsolutePath = pathTool.format({
			...originalFilePathFormat,
			name: `${originalFilePathFormat.name}-backup`,
		});

		let noNeedToWriteFile = false;
		let fileOriginalContents;

		if (fileSystem.existsSync(backupFileAbsolutePath)) {
			// 如果备份文件已经存在，则直接使用之。
			fileOriginalContents = fileSystem.readFileSync(backupFileAbsolutePath, 'utf8');
		} else {
			noNeedToWriteFile = shouldRestoreOriginalFileContentsInsteadOfModifyingThem;
			if (!noNeedToWriteFile) {
				// 如果备份文件不存在，则创建备份。
				fileOriginalContents = fileSystem.readFileSync(originalFileAbsolutePath, 'utf8');
				fileSystem.writeFileSync(backupFileAbsolutePath, fileOriginalContents);
			}
		}

		if (!noNeedToWriteFile) {
			if (shouldRestoreOriginalFileContentsInsteadOfModifyingThem) {
				console.log(`\n>>> ${
					chalk.bgGreen.black(' RESTORING FILE FROM BACKUP ')
				}${
					chalk.bgRed.black(' and deleting the backup ')
				}\n    ${
					chalk.green(originalFileAbsolutePath)
				}`);
				fileSystem.unlinkSync(backupFileAbsolutePath);
			} else if (fileOriginalContents.match(anythingMatches)) {
				if (typeof onReplacingFileContents === 'function') {
					onReplacingFileContents(originalFileAbsolutePath, backupFileAbsolutePath);
				}
			}

			const fileNewContents = shouldRestoreOriginalFileContentsInsteadOfModifyingThem ?
				fileOriginalContents :
				fileOriginalContents.replace(anythingMatches, withString);

			fileSystem.writeFileSync(originalFileAbsolutePath, fileNewContents);
		}
	});
};
