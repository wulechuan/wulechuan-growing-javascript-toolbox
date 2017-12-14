/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const removeWebpackRulesThatSatisfyConditions = require('../utils/filter-out-webpack-rules');
const writeJSONToFile = require('../utils/write-json-to-file');

function removeAllRulesAboutStyles(webpackConfigRules) {
	const theRegExpForTesters = new RegExp(/(css|style|stylus|sass|scss|less)/i);
	const theRegExpForLoaders = new RegExp(/css-loader/);

	const keptRulesAfterFiltering = removeWebpackRulesThatSatisfyConditions(
		webpackConfigRules,
		{
			toDetectTesterStringOrRegExp: testerString => !!testerString.match(theRegExpForTesters),
			toDetectTesterFunctionBody:   testerString => !!testerString.match(theRegExpForTesters),
			toDetectLoaderStringOrRegExp: loaderString => !!loaderString.match(theRegExpForLoaders),
			toDetectLoaderFunctionBody:   loaderString => !!loaderString.match(theRegExpForLoaders),
			testerForIgnoreLoader: /.(css|styl|stylus|sass|scss|less)$/,
		}
	);

	return keptRulesAfterFiltering;
}

function removeAllRulesAboutMediaFiles(webpackConfigRules) {
	const theRegExpForTesters = new RegExp(/\b(ttf|woff|woff2|eot|svg|png|jpg|jpeg|gif|webp)\b/i);

	const keptRulesAfterFiltering = removeWebpackRulesThatSatisfyConditions(
		webpackConfigRules,
		{
			toDetectTesterStringOrRegExp: testerString => !!testerString.match(theRegExpForTesters),
			toDetectTesterFunctionBody:   testerString => !!testerString.match(theRegExpForTesters),
		}
	);

	return keptRulesAfterFiltering;
}


module.exports = (options) => {
	const {
		reportsFolder,
	} = options;

	return function (webpackConfig) {
		const isOldWebpack = !!webpackConfig.module.loaders && !webpackConfig.module.rules;
		const webpackConfigRules = isOldWebpack ? webpackConfig.module.loaders : webpackConfig.module.rules;

		let keptRulesAfterFiltering = webpackConfigRules;
		keptRulesAfterFiltering = removeAllRulesAboutStyles(keptRulesAfterFiltering);
		keptRulesAfterFiltering = removeAllRulesAboutMediaFiles(keptRulesAfterFiltering);

		if (isOldWebpack) {
			webpackConfig.module.loaders = keptRulesAfterFiltering;
		} else {
			webpackConfig.module.rules = keptRulesAfterFiltering;
		}



		// 输出js文件，纯粹方便查阅和诊断
		writeJSONToFile(
			'last-build-used-webpack-config.js',
			webpackConfig,
			{
				outputFolder: reportsFolder,
				constNameIfWritesJS: 'myWebpackConfig',
			}
		);

		return webpackConfig;
	};
};
