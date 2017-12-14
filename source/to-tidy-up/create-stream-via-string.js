/*
	https://stackoverflow.com/questions/23230569/how-do-you-create-a-file-from-a-string-in-gulp
*/

const gulpUtil = require('gulp-util');
const stream = require('stream');

module.exports = function createStreamViaString(filename, string) {
	const source = stream.Readable({ objectMode: true });
	source._read = function () { // eslint-disable-line no-underscore-dangle
		this.push(new gulpUtil.File({
			cwd: '',
			base: '',
			path: filename,
			contents: new Buffer(string), // eslint-disable-line no-buffer-constructor
		}));
		this.push(null);
	};
	return source;
};
