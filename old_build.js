var Metalsmith = require('metalsmith'),
    markdown = require('metalsmith-markdown'),
    drafts = require('metalsmith-drafts'),
    collections = require('metalsmith-collections'),
    permalinks = require('metalsmith-permalinks'),
    navigation = require('metalsmith-navigation'),
    layouts = require('metalsmith-layouts'),
    assets = require('metalsmith-assets'),
    ignore = require('metalsmith-ignore'),
    Handlebars = require('handlebars'),
    extname = require('path').extname;



// Markdown and navigation settings
var markdownOptions = {
    gfm: true,
    smartypants: true,
    langPrefix: 'language-',
    lineNumbers: true,
    highlight: function (code, lang) {
        if (!prism.languages.hasOwnProperty(lang)) {
            // Default to markup if it's not in our extensions.
            lang = prismExtensions[lang] || 'markup';
        }

        return prism.highlight(code, prism.languages[lang]);
    }
};

var navConfig = {
    sideBar: {
        sortBy: 'nav_sort',
        filterProperty: 'nav_groups'
    }
};

var navSettings = {
    navListProperty: 'navs'
};

// Trim /content/ & /index.html from collections path for cleaner navigation links
var filePathTask = function (files, metalsmith, done) {
    for (var file in files) {
        files[file].path = file;

        if (~files[file].path.indexOf('content/')) {
            files[file].path = files[file].path.slice(7);
        }
        if (~files[file].path.indexOf('index.html')) {
            files[file].path = files[file].path.slice(0, -10);
        }
        // Add 'exclude' attribute to links which have the same title as their parent collection
        if (files[file].title && files[file].title.toLowerCase() === files[file].collection[0]) {
            files[file].exclude = true;
        }
    }

    done();
};

/**
 * Generate table of contents in the file's metadata based on heading elements found in content
 *
 * @returns {function} Metalsmith build step
 */
var tableOfContentsTask = function () {
    var selectors = 'h2[id], h3[id]',
        data, contents, $, lastIndex, $headings, $heading;

    return function(files, metalsmith, done) {
        Object.keys(files).forEach(function(file) {
            if (extname(file) !== '.html') return;

            data          = files[file];
            contents      = data.contents.toString();
            $             = cheerio.load(contents);
            lastIndex     = 0;
            $headings     = $(selectors);
            data.headings = [];

            $headings.each(function(i) {
                $heading = $headings[i];

                if ($heading.attribs.id) {
                    if ($heading.name === 'h2') {
                        data.headings.push({
                            id: $heading.attribs.id,
                            tag: $heading.name,
                            text: $heading.children[0].data,
                            haveChildren: false,
                            children: []
                        });
                        lastIndex = data.headings.length - 1;
                    } else {
                        data.headings[lastIndex].children.push({
                            id: $heading.attribs.id,
                            tag: $heading.name,
                            text: $heading.children[0].data
                        });
                        data.headings[lastIndex].haveChildren = true;
                    }
                }
            });
        });

        done();
    };
};

Handlebars.registerHelper('is', function (value, test, options) {
    if (value === test) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

// An {{is}} helper that also strips the path slashes
// (necessary to check if list heading is the currently active nav item)
Handlebars.registerHelper('path', function (path, test, options) {
    if (path) {
        path = path.substring(1, path.length - 1);

        if (path === test) {
            return options.fn(this);
        }
    }

    return options.inverse(this);
});

// A helper that checks if path contains the parent dir
// (necessary to check if a sub-list should be active/open by default)
Handlebars.registerHelper('path-contains', function (path, test, options) {
    if (path && ~path.indexOf(test)) {
      return options.fn(this);
    }

    return options.inverse(this);
});

var ms = Metalsmith(__dirname)
    .source('./src')
    // Ignore CSS and JS since they're added through build scripts
    .use(ignore('assets/css/*'))
    .use(ignore('assets/js/*'))
    .use(ignore('assets/js/dist/*'))
    // Filter drafts and process contents
    .use(drafts())
    .use(markdown(markdownOptions))
    // Generate ToC
    .use(tableOfContentsTask())
    // Restructure file tree
    .use(collections({
        guidelines: {
            pattern: 'content/guidelines/*',
            refer: false
        },
        components: {
            pattern: 'content/components/*',
            refer: false
        },
        modules: {
            pattern: 'content/modules/*',
            refer: false
        },
        documentation: {
            pattern: 'content/documentation/*',
            refer: false
        }
    }))
    .use(permalinks({
        pattern: ':collections/:title',
        relative: false
    }))
    .use(filePathTask)
    // Setup navigation
    .use(navigation(navConfig, navSettings))
    // Process templates
    .use(layouts({
        engine: 'handlebars',
        directory: 'layouts',
        partials: 'layouts/partials',
        default: 'default.hbs'
    }))
    .use(datamarkdown())
    // Import assets (don't need js/ and scss/)
    .use(assets({
        source: './assets/css',
        destination: './assets/css'
    }))
    .use(assets({
        source: './assets/fonts',
        destination: './assets/fonts'
    }))
    .use(assets({
        source: './assets/img',
        destination: './assets/img'
    }))
    .use(assets({
        source: './src/assets/img',
        destination: './assets/img'
    }))
    .use(assets({
        source: './assets/svg',
        destination: './assets/svg'
    }))
    .use(assets({
        source: './assets/bundles',
        destination: './assets'
    }))
    .use(assets({
        source: './src/assets/js/dist',
        destination: './assets/js'
    }))
    // Build site
    .destination('./build');

ms.build(function (err) {
    if (err) throw err;
});
