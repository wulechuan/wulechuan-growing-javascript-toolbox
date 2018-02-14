const chalk = require('chalk');

function printLine(width, color) {
	console.log(chalk[color || 'gray']('─'.repeat(width || 51)));
}

module.exports = function printObjectInfo(input) {
	if (typeof input !== 'object') {
		console.log(`${chalk.green('<simple value>')}: ${chalk.yellow(input.constructor.name)}`);
		console.log(input);
		printLine();
		console.log('\n'.repeat(3));

		return;
	}

	if (! input) {
		console.log(`${chalk.green('<null>')}: ${chalk.yellow('Object')}`);
		console.log(input);
		printLine();
		console.log('\n'.repeat(3));

		return;
	}

	console.log(chalk.blue('Input is an object'), 'constructor:', chalk.yellow(input.constructor.name));
	printLine();

	const entries = Object.entries(input);
	entries.forEach(entry => {
		console.log(`${chalk.green(entry[0])}: ${chalk.yellow(entry[1].constructor.name)}`);
		console.log(entry[1]);
		printLine();
		console.log('\n'.repeat(3));
	});
};
