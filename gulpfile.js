const { src, dest } = require('gulp');

// Copy node SVG icons into dist next to the compiled node files (n8n loads the
// icon relative to the node .js). Mirrors the standard community-node build.
function buildIcons() {
	return src('nodes/**/*.svg').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
