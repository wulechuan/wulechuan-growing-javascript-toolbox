const chalk = require('chalk');

module.exports = function removeWebpackRulesThatSatisfyConditions(webpackConfigRules, options = {}) {
	if (!Array.isArray(webpackConfigRules)) {
		throw new TypeError(chalk.red(`\nThe ${
			chalk.blue('first')
		} argument must be an ${
			chalk.blue('array')
		}, which stands for the "${
			chalk.blue('rules')
		}" of a webpack configuration.\nSo please pass in something like "${
			chalk.yellow('webpackConfig.module.rules')
		}" or "${
			chalk.yellow('webpackConfig.module.loaders')
		}".\n`));
	}

	const {
		toDetectTesterStringOrRegExp,
		toDetectTesterFunctionBody = toDetectTesterStringOrRegExp,
		toDetectLoaderStringOrRegExp,
		toDetectLoaderFunctionBody = toDetectLoaderStringOrRegExp,
		testerForIgnoreLoader,
	} = options;

	const stringTesterDetectorProvided = typeof toDetectTesterStringOrRegExp === 'function';
	const functionTesterDetectorProvided = typeof toDetectTesterFunctionBody === 'function';
	const stringLoaderDetectorProvided = typeof toDetectLoaderStringOrRegExp === 'function';
	const functionLoaderDetectorProvided = typeof toDetectLoaderFunctionBody === 'function';


	if (!stringTesterDetectorProvided && functionTesterDetectorProvided) {
		console.log(`The ${chalk.green('detector')} of [${
			chalk.bgBlue.black('Function')
		}] ${chalk.yellow('tester')} was provided, while that of [${
			chalk.bgGreen.black('String')}/${chalk.bgGreen.black('RegExp')
		}] ${chalk.yellow('tester')} was ${chalk.red('not')}. Why?`);

		throw new TypeError(chalk.bgRed.black(' Detector function for the [String/RegExp] tester is required. '));
	}

	if (!stringLoaderDetectorProvided && functionLoaderDetectorProvided) {
		console.log(`The ${chalk.green('detector')} of [${
			chalk.bgBlue.black('Function')
		}] ${chalk.yellow('loader')} was provided, while that of [${
			chalk.bgGreen.black('String')}/${chalk.bgGreen.black('RegExp')
		}] ${chalk.yellow('loader')} was ${chalk.red('not')}. Why?`);

		throw new TypeError(chalk.bgRed.black(' Detector function for the [String/RegExp] loader is required. '));
	}


	const keptRulesAfterFiltering = webpackConfigRules.filter((loaderConfig) => {
		const { test, loader, loaders } = loaderConfig;


		let thisRuleSatisfiesConditions = false;


		if (stringTesterDetectorProvided || functionTesterDetectorProvided) {
			let testerString;
			let testerIsAFunction = false;

			if (test instanceof RegExp) {
				testerString = test.toString();
			} else if (typeof test === 'function') {
				testerIsAFunction = true;
				testerString = test.toString().replace(/\n/g, ''); // 去除换行符，以确保匹配准确
			} else {
				testerString = String(test);
			}

			if (!testerIsAFunction && stringTesterDetectorProvided) {
				const satisfied = toDetectTesterStringOrRegExp(testerString);
				thisRuleSatisfiesConditions = thisRuleSatisfiesConditions || satisfied;
			}

			if (testerIsAFunction && functionTesterDetectorProvided) {
				const satisfied = toDetectTesterFunctionBody(testerString);
				thisRuleSatisfiesConditions = thisRuleSatisfiesConditions || satisfied;
			}
		}


		if (stringLoaderDetectorProvided || functionLoaderDetectorProvided) {
			let loadersArray;

			if (loader && !loaders) {
				loadersArray = [loader];
			} else {
				loadersArray = loaders;
			}

			thisRuleSatisfiesConditions = thisRuleSatisfiesConditions || loadersArray.some((loaderString) => {
				let loaderIsAFunction = false;
				if (typeof loaderString === 'function') {
					loaderIsAFunction = true;
					loaderString = loaderString.toString().replace(/\n/g, ''); // 去除换行符，以确保匹配准确
				} else {
					loaderString = String(loaderString);
				}

				let satisfied = false;

				if (!loaderIsAFunction && stringLoaderDetectorProvided) {
					satisfied = satisfied || toDetectLoaderStringOrRegExp(loaderString);
				}

				if (loaderIsAFunction && functionLoaderDetectorProvided) {
					satisfied = satisfied || toDetectLoaderFunctionBody(loaderString);
				}

				return satisfied;
			});
		}


		const shouldKeepThisRule = !thisRuleSatisfiesConditions;
		return shouldKeepThisRule;
	});


	if (testerForIgnoreLoader &&
		(
			testerForIgnoreLoader instanceof RegExp ||
			typeof testerForIgnoreLoader === 'string' ||
			typeof testerForIgnoreLoader === 'function'
		)
	) {
		keptRulesAfterFiltering.push({
			test: testerForIgnoreLoader,
			loader: 'ignore-loader',
		});
	}


	return keptRulesAfterFiltering;
};
