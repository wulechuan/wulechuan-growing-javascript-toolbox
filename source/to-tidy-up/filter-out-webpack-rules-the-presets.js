/* eslint no-use-before-define: 0, no-tabs: 0, indent: [ 2, 'tab' ], no-console: 0 */

const chalk = require('chalk');

module.exports = {
	createMethodForRemovingWebpackConfigAllRulesAboutStyles,
	createMethodForRemovingWebpackConfigAllRulesAboutMediaFiles,
	createMethodForRemovingWebpackConfigAllRulesOfAllTypes,
};


function createMethodForRemovingWebpackConfigAllRulesOfAllTypes(removeWebpackRulesThatSatisfyConditions) {
	return (webpackConfigRules) => {
		const warningString = `\n${chalk.bgRed.white(' Removing ALL rules OF ALL TYPES from webpack configuration! ')}`;
		console.log(`${warningString.repeat(3)}\n`);

		return removeWebpackRulesThatSatisfyConditions(
			webpackConfigRules,
			{
				toDetectTesterStringOrRegExp: testerString => !!testerString.match(/.+/),
				toDetectLoaderStringOrRegExp: testerString => !!testerString.match(/.+/),
				testerForIgnoreLoader: /./,
			}
		);
	};
}

function createMethodForRemovingWebpackConfigAllRulesAboutStyles(removeWebpackRulesThatSatisfyConditions) {
	return (webpackConfigRules) => {
		const theRegExpForTesters = new RegExp(/(css|style|stylus|sass|scss|less)/i);
		const theRegExpForLoaders = new RegExp(/css-loader/);

		const keptRulesAfterFiltering = removeWebpackRulesThatSatisfyConditions(
			webpackConfigRules,
			{
				toDetectTesterStringOrRegExp: testerString => !!testerString.match(theRegExpForTesters),
				toDetectTesterFunctionBody:   testerString => !!testerString.match(theRegExpForTesters), // eslint-disable-line key-spacing
				toDetectLoaderStringOrRegExp: loaderString => !!loaderString.match(theRegExpForLoaders),
				toDetectLoaderFunctionBody:   loaderString => !!loaderString.match(theRegExpForLoaders), // eslint-disable-line key-spacing
				testerForIgnoreLoader: /\.(css|styl|stylus|sass|scss|less)$/,
			}
		);

		return keptRulesAfterFiltering;
	};
}

function createMethodForRemovingWebpackConfigAllRulesAboutMediaFiles(removeWebpackRulesThatSatisfyConditions) {
	return (webpackConfigRules) => {
		const theRegExpForTesters = new RegExp(/\b(ttf|woff|woff2|eot|svg|png|jpg|jpeg|gif|webp)\b/i);

		const keptRulesAfterFiltering = removeWebpackRulesThatSatisfyConditions(
			webpackConfigRules,
			{
				toDetectTesterStringOrRegExp: testerString => !!testerString.match(theRegExpForTesters),
				toDetectTesterFunctionBody:   testerString => !!testerString.match(theRegExpForTesters), // eslint-disable-line key-spacing
			}
		);

		return keptRulesAfterFiltering;
	};
}
