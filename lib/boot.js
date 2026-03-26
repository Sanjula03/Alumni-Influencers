// boot.js - auto loads controllers from the controllers folder
// based on the mvc boilerplate pattern from tutorials
var express = require('express');
var fs = require('node:fs');
var path = require('node:path');

module.exports = function(parent, options) {
  var dir = path.join(__dirname, '..', 'controllers');
  var verbose = options.verbose;

  fs.readdirSync(dir).forEach(function(name) {
    var file = path.join(dir, name);
    if (!fs.statSync(file).isDirectory()) return;

    verbose && console.log('\n   %s:', name);
    var obj = require(file);
    var prefix = obj.prefix || '';
    var app = express();

    // if controller has a setup function, use that for custom routes
    if (typeof obj.setup === 'function') {
      obj.setup(app);
      verbose && console.log('     custom routes loaded');
    } else {
      // auto generate routes based on exported method names
      var handler;
      var method;
      var url;

      for (var key in obj) {
        if (~['name', 'prefix', 'engine', 'before', 'setup'].indexOf(key)) continue;

        switch (key) {
          case 'show':
            method = 'get';
            url = '/' + name + '/:' + name + '_id';
            break;
          case 'list':
            method = 'get';
            url = '/' + name + 's';
            break;
          case 'edit':
            method = 'get';
            url = '/' + name + '/:' + name + '_id/edit';
            break;
          case 'update':
            method = 'put';
            url = '/' + name + '/:' + name + '_id';
            break;
          case 'create':
            method = 'post';
            url = '/' + name;
            break;
          case 'remove':
            method = 'delete';
            url = '/' + name + '/:' + name + '_id';
            break;
          case 'index':
            method = 'get';
            url = '/';
            break;
          default:
            continue;
        }

        handler = obj[key];
        url = prefix + url;

        if (obj.before) {
          app[method](url, obj.before, handler);
          verbose && console.log('     %s %s -> before -> %s', method.toUpperCase(), url, key);
        } else {
          app[method](url, handler);
          verbose && console.log('     %s %s -> %s', method.toUpperCase(), url, key);
        }
      }
    }

    parent.use(app);
  });
};
