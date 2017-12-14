/* eslint indent: [ 2, 'tab' ], no-tabs: 0, */

module.exports = (json, options = {}) => {
	function JSONStringifyReplacer(k, v) {
		if (v instanceof RegExp) {
			return v.toString();
		}

		if (typeof v === 'string') {
			return v.replace(/\\+/g, '/');
		}

		if (typeof v === 'function') {
			const functionString = v.toString();
			const isAnArrowFunction = functionString.match(/^\s*\([^=]+\s*=>\s*\{/);
			return isAnArrowFunction ? '<an arrow function>' : '<a function>';
		}

		return v;
	}

	function somethingForFormattingObjectLiteralThatMustHappenAfterStringify(formattedJSONString) {
		const objectLiteralString = formattedJSONString
			// 将【正则表达式】的外扩【引号】去除
			.replace(/ ["']\/([^*\n][^\n]*)\/([gi]?)["']/g, ' /$1/$2')

			// 将双引号改为单引号
			.replace(/"(\w+)": /g, '$1: ')
			.replace(/ "([^\n]*)[^\\]?": /g, " '$1': ")
			.replace(/ "([^\n]*)[^\\]?"(,?\n)/g, " '$1'$2")

			// 去除正则表达式内部的转义反斜杠
			.replace(/([^/])\\\\/g, '$1\\')

			// 去除正则表达式起始位置可能出现的被转义的反斜杠
			.replace(/ \/\\\\/g, ' /\\');

		return objectLiteralString;
	}

	const {
		// to speed up the process if we only need an JSON.
		shouldSkipGeneratingObjectLiteral = false,
	} = options;

	const formattedJSONString = JSON
		.stringify(json, JSONStringifyReplacer, 4);

	const objectLiteralString = shouldSkipGeneratingObjectLiteral ?
		formattedJSONString :
		somethingForFormattingObjectLiteralThatMustHappenAfterStringify(formattedJSONString);

	return {
		formattedJSONString,
		objectLiteralString,
	};
};
