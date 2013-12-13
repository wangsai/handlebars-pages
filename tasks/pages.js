'use strict';

module.exports = function(grunt) {

  var path = require('path'),
      handlebars = require('handlebars').create(),
      helpers = require('handlebars-helpers'),
      async = require('async'),
      jsYaml = require('js-yaml'),
      _ = require('underscore'),
      inspect = require('eyes').inspector({ stream: null }),
      temp = require('temp');

  // Automatically track and cleanup files at exit
  temp.track();

  grunt.registerMultiTask('pages', 'Compiles templates with contents to html pages.', function() {

    var options = this.options({
      context: function(src, dest){return {};}, //extra data to template, and will integrate other data
      marked: {}
    });

    helpers.register(handlebars, {marked: options.marked});

    //create express-hbs with parameters
    var hbs = require('express-hbs').express3(_.extend({handlebars: handlebars}, options));
    

    grunt.log.debug(inspect(this.files));
    // Iterate over all specified file groups.
    async.eachSeries(this.files, function (file, next) {
        convert(file.src, file.dest, next);
    }.bind(this), this.async());

    function convert(src, dest, next){
      var afile = _.first(src),
        content;
      if(afile)
      {
          //compose 'context' 
          var context = {};
          if(grunt.util.kindOf(options.context) === 'function')
          {
            context = options.context(afile, dest);
          }
          else
          {
            context = options.context;
          }


          
          //create a temp file
          temp.open({suffix: options.extname || ".hbs"}, function(err, info) {
            if(err)
            {
              next(err);
            }

            //set 'content'
            content = grunt.file.read(afile).replace(/^-{3}[\w\W]+?-{3}/, ''); //remove yaml-front-matter;
            grunt.file.write(info.path, content);

            grunt.log.debug("temp file path: " + info.path);

            //merge page yfm and user added options
            context = _.extend({}, context, extractYfm(afile));

            hbs(info.path, context, function(err, res){

              if(err)
              {
                next(err);
              }


              grunt.file.write(dest, res, 'utf8');
              grunt.log.writeln('File "' + dest + '" created.');
              
              next();
            });

          });
          
      }
      else
      {
        // grunt.log.errorlns('No source file for creating"' + dest + '" !');
        next();
      }
    }

    function extractYfm(src)
    {
        var re = /^-{3}([\w\W]+?)(-{3})([\w\W]*)*/;
        var text = grunt.file.read(src);
        var results = re.exec(text), 
          conf = {};

        if(results) {
          conf = jsYaml.load(results[1]);

          //Add content if set
          // if(options.includeContent) 
          // {
          //   conf[options.contentName] = results[3] || '';
          // }

        }

        return conf;
    }

  });

};
