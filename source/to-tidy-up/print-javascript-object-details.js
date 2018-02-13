const chalk = require('chalk');

module.exports = function printObjectInfo(object) {
	for (const k in object) {
		console.log(`${chalk.green(k)}: ${chalk.yellow(object[k].constructor.name)}`);
		console.log(object[k]);
		console.log(`${chalk.gray('─'.repeat(51))}${'\n'.repeat(3)}`);
	}
};
