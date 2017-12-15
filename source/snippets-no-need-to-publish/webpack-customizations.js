/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0 */

const pathTool = require('path');

const webpackConfigRulesRemover = require('../utils/filter-out-webpack-rules');
const writeJSONToFile = require('../utils/write-json-to-file');

module.exports = (options) => {
	const {
		reportsFolder,
	} = options;

	return function (webpackConfig) {
		// 如果采用固定的模板化配置，此处可能需要临时删除一些规则。
		removeSomeRulesAsNeeded(webpackConfig);

		// 输出js文件，纯粹方便查阅和诊断
		writeWebpackConfigToFileForInspection(webpackConfig, reportsFolder);

		return webpackConfig;
	};
};





function removeSomeRulesAsNeeded(webpackConfig) {
	const isOldWebpack = !!webpackConfig.module.loaders && !webpackConfig.module.rules;
	const webpackConfigRules = isOldWebpack ? webpackConfig.module.loaders : webpackConfig.module.rules;

	let keptRulesAfterFiltering = webpackConfigRules;

	keptRulesAfterFiltering = webpackConfigRulesRemover.presets.removeAllAboutStyles(keptRulesAfterFiltering);
	keptRulesAfterFiltering = webpackConfigRulesRemover.presets.removeAllAboutMedia(keptRulesAfterFiltering);

	// 在构建流程工具而非项目核心代码的阶段，为了加快流程工具的调试，可以故意禁用webpack的所有规则。
	// 切记在流程工具构建完成后注释掉下面这行。
	// keptRulesAfterFiltering = webpackConfigRulesRemover.presets.removeEverything(keptRulesAfterFiltering);

	if (isOldWebpack) {
		webpackConfig.module.loaders = keptRulesAfterFiltering;
	} else {
		webpackConfig.module.rules = keptRulesAfterFiltering;
	}
}

function writeWebpackConfigToFileForInspection(webpackConfig, reportsFolder) {
	writeJSONToFile(
		pathTool.resovle(reportsFolder, 'last-build-used-webpack-config.js'),
		webpackConfig,
		{
			nameOfConstIfWriteInJSFormat: 'myWebpackConfig',
		}
	);
}
