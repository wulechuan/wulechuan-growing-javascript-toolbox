const chalk = require('chalk');
const moment = require('moment');

module.exports = function printInfoAboutTheCompletionOfATask(taskDescription = 'Unspecified Task', errorOccured) {
	errorOccured = !!errorOccured;
	const symbol     = errorOccured ? ' ╳ '               : ' ♥ ';
	const conclusion = errorOccured ? ' DONE with ERROR ' : ' DONE ';

	const symbolColor        = errorOccured ? 'black'     : 'red';
	const symbolBgColor      = errorOccured ? 'bgRed'     : 'bgMagenta';

	const descriptionColor   = errorOccured ? 'black'     : 'black';
	const descriptionBGColor = errorOccured ? 'bgMagenta' : 'bgWhite';

	const conclusionColor    = errorOccured ? 'black'     : 'black';
	const conclusionBgColor  = errorOccured ? 'bgYellow'  : 'bgGreen';

	console.log(`${
		chalk.gray(moment().format('HH:mm:ss'))
	} ${
		chalk[symbolBgColor][symbolColor](symbol)
	}${
		chalk[descriptionBGColor][descriptionColor](` ${taskDescription} `)
	}${
		chalk[conclusionBgColor][conclusionColor](conclusion)
	} ${chalk.gray('~')}`);

	console.log('\n'.repeat(errorOccured ? 4 : 0));
};
