/* eslint no-console: 0, indent: [ 2, 'tab' ], no-tabs: 0, */

module.exports = (json, options = {}) => {
	const {
		// to speed up the process if we only need an JSON.
		shouldSkipGeneratingObjectLiteral = false,
	} = options;

	const stringOfFormattedJSON = JSON
		.stringify(json, JSONStringifyReplacer, 4);

	const stringOfObjectLiteral = shouldSkipGeneratingObjectLiteral ?
		stringOfFormattedJSON :
		somethingForFormattingObjectLiteralThatMustHappenAfterStringify(stringOfFormattedJSON);

	return {
		stringOfFormattedJSON,
		stringOfObjectLiteral,
	};
};


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

function somethingForFormattingObjectLiteralThatMustHappenAfterStringify(stringOfFormattedJSON) {
	const stringOfObjectLiteral = stringOfFormattedJSON
		// 将【正则表达式】的外括【引号】去除
		.replace(/ ["']\/([^*\n][^\n]*)\/(gi|ig|g|i)?["']/g, ' /$1/$2')

		// 去除【键名】不必要的双引号
		.replace(/"([$_\w]+)": /g, '$1: ')

		// 将双引号改为单引号
		.replace(/ "([^\n]*)[^\\]?": /g, " '$1': ") // eslint-disable-line quotes
		.replace(/ "([^\n]*)[^\\]?"(,?\n)/g, " '$1'$2") // eslint-disable-line quotes

		// 去除正则表达式内部的转义反斜杠
		.replace(/([^/])\\\\/g, '$1\\')

		// 去除正则表达式起始位置可能出现的被转义的反斜杠
		.replace(/ \/\\\\/g, ' /\\');

	return stringOfObjectLiteral;
}
