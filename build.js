const metalsmith = require('metalsmith');
const markdown = require('metalsmith-markdown');
const drafts = require('metalsmith-drafts');
const collections = require('metalsmith-collections');
const permalinks = require('metalsmith-permalinks');
const navigation = require('metalsmith-navigation');
const layouts = require('metalsmith-layouts');
// const assets = require('metalsmith-assets');
const Handlebars = require('handlebars');
const extname = require('path').extname;

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
// var tableOfContentsTask = function () {
//     var selectors = 'h2[id], h3[id]',
//         data, contents, $, lastIndex, $headings, $heading;
//
//     return function(files, metalsmith, done) {
//         Object.keys(files).forEach(function(file) {
//             if (extname(file) !== '.html') return;
//
//             data          = files[file];
//             contents      = data.contents.toString();
//             $             = cheerio.load(contents);
//             lastIndex     = 0;
//             $headings     = $(selectors);
//             data.headings = [];
//
//             $headings.each(function(i) {
//                 $heading = $headings[i];
//
//                 if ($heading.attribs.id) {
//                     if ($heading.name === 'h2') {
//                         data.headings.push({
//                             id: $heading.attribs.id,
//                             tag: $heading.name,
//                             text: $heading.children[0].data,
//                             haveChildren: false,
//                             children: []
//                         });
//                         lastIndex = data.headings.length - 1;
//                     } else {
//                         data.headings[lastIndex].children.push({
//                             id: $heading.attribs.id,
//                             tag: $heading.name,
//                             text: $heading.children[0].data
//                         });
//                         data.headings[lastIndex].haveChildren = true;
//                     }
//                 }
//             });
//         });
//
//         done();
//     };
// };

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

metalsmith(__dirname)
  .metadata({
    site: {
      name: 'Habanero',
      description: "The whimsical recipes and doings of Lia Virkus.",
      generatorname: "Metalsmith",
      generatorurl: "http://metalsmith.io/"
    }
  })
  .source('./src')
  .destination('./build')
  .clean(false)
  // Filter drafts and process contents
  .use(drafts())
  .use(markdown())
  // Generate ToC
  // .use(tableOfContentsTask())
  .use(collections({
      posts: 'posts/*.md',
  }))
  .use(permalinks())
  // .use(filePathTask)
  .use(navigation(navConfig, navSettings))
  .use(layouts({
      engine: 'handlebars'
  }))
  .build(function (err) {
      if (err) throw err;
  });
