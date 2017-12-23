const chalk = require('chalk');

module.exports = function printInfoAboutTheCompletionOfATask(taskDescription = 'Unspecified Task') {
	console.log(`\n${
		chalk.bgRed.black(' ♥ ')
	}${
		chalk.bgMagenta.black(` ${taskDescription} `)
	}${
		chalk.bgRed.black(' DONE ')
	}\n`);
};
