const chalk = require('chalk');

module.exports = function printOneTask(taskName, description = '', descriptionPrefixTerm = '', taskNameAlignmentWidth = 15) {
	const paddingWidth = Math.max(0, taskNameAlignmentWidth - taskName.length);
	const paddingString = ' '.repeat(paddingWidth);

	console.log(`    ${
		chalk.magenta(taskName)
	}${
		paddingString
	}${description ?
		`${
			chalk.gray(`for ${descriptionPrefixTerm ? `${descriptionPrefixTerm} ` : ''}`)
		}${
			chalk.green(description)
		}` :
		''
	}`);
};
