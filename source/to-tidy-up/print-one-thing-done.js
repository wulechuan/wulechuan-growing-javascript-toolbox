const chalk = require('chalk');
const moment = require('moment');

module.exports = function printInfoAboutTheCompletionOfATask(taskDescription = 'Unspecified Task') {
	console.log(`${
		chalk.gray(moment().format('HH:mm:ss'))
	} ${
		chalk.bgMagenta.black(' ♥ ')
	}${
		chalk.bgWhite.black(` ${taskDescription} `)
	}${
		chalk.bgMagenta.black(' DONE ')
	} ${chalk.gray('~')}\n`);
};
