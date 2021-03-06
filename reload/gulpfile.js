var gulp = require('gulp');
var ftp = require('vinyl-ftp');
var connect = require('gulp-connect');
var prompt = require('gulp-prompt');
var gutil = require('gulp-util');
var fs = require('fs');
var path = require('path');
var watch = require('gulp-watch');
var livereload = require('gulp-livereload');

function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

function buildItemLinks(linkArray) {
    var result = "<ul>";

    for (var i = 0, len = linkArray.length; i < len; i++) {
        result += '<li >' +
        '<a href="'+linkArray[i]+'" target="_blank">'+linkArray[i]+'</a>'+
        '</li>\n';
    }

    result += "</ul>\n";

    return result;


}

function buildHtmlItem(srcItem,siteDataJSON) {
    var result = "TODO#"+srcItem;

    try {
        result = '<ul class="details">';
        result += '<li><a href="src/'+srcItem+'" target="_blank">Live demo</a></li>';
        result += '<li>Title: '+siteDataJSON.title+'</li>';
        result += '<li>Description: '+siteDataJSON.description+'</li>';
        result += '<li>Links: '+buildItemLinks(siteDataJSON.links)+'</li>';
        result += '</ul>';

    } catch (e) {
        if(e.code === 'ENOENT') {
            console.log('File not found!', srcItem);
        } else {
            throw e;
        }
    }

    console.log(result);

    return result;
}


function buildHtmlTagList(tagList) {
    var result = '';

    for (var i = 0, len = tagList.length; i < len; i++) {
        result += '<span class="label">'+tagList[i]+'</span>\n ';
    }

    return result;
}

/**
Return json string
*/
function buildJSONList(list) {
  var result = [];

  for (var i = 0, len = list.length; i < len; i++) {

      try {
          var siteDataJSON = fs.readFileSync("./src/"+list[i]+'/site-data.json' , "utf8");
          siteDataJSON = JSON.parse(siteDataJSON);
          siteDataJSON.folder=list[i];
          result.push(siteDataJSON);
      } catch (e) {
        // Here you get the error when the file was not found,
        // but you also get any other error
      }
  }

  return JSON.stringify(result);
}

function buildHtmlList(list) {

    var result = "<ul class='accordion' data-accordion>\n";
    var siteDataJSON = '';

    for (var i = 0, len = list.length; i < len; i++) {

        try {
            siteDataJSON = fs.readFileSync("./src/"+list[i]+'/site-data.json' , "utf8");

            siteDataJSON = JSON.parse(siteDataJSON);

            console.log("JES " + typeof(siteDataJSON.tags));
            var tags =siteDataJSON.tags+"";
            //var tags ="HTML5, JS";
            var tagsArray = (tags)? tags.split(','): [];

            result += '<li class="accordion-item" data-accordion-item>' +
                            '<a href="#" class="accordion-title"><h4 class="subheader">'+list[i]+'</h4>'+buildHtmlTagList(tagsArray)+' </a>'+
                            '<div class="accordion-content" data-tab-content>'+ buildHtmlItem(list[i],siteDataJSON) + '</div>' +
                        '</li>\n';
        } catch (e) {
          // Here you get the error when the file was not found,
          // but you also get any other error
        }

    }

    result += "</ul>\n";

    return result;
}

gulp.task('generate-json-catalog', function(cb) {
  var folders = getFolders('src');
  console.log("Generating catalog.json" , folders);
  var jsonList = buildJSONList(folders);

  return fs.writeFile('catalog.json', jsonList, cb);

});

// Read site projects and build index.html.tpl
gulp.task('generate-html-catalog', function(cb) {
    var folders = getFolders('src');
    console.log("Generating index.html.tpl for catalog" , folders);

    var htmlList = buildHtmlList(folders);

    var content = fs.readFileSync("./index.html.tpl", "utf8");
    content = content.replace('@PROJECT-LIST', htmlList);

    return fs.writeFile('index.html', content, cb);
});

gulp.task('deploy:src', function () {
    return gulp.src('/')//it may be anything
        .pipe(prompt.prompt({
            type: 'password',
            name: 'pass',
            message: 'Please enter your password'
        }, function(res){

            var conn = ftp.create( {
                host:     'www.jesidea.com',
                user:     'jesidea.com',
                password: res.pass,
                parallel: 10,
                log:      gutil.log
            } );

            var globs = ['src/**/*.*',
                        '!src/**/*.zip',
                        '!src/**/*.psd',
                        '!src/**/*.mp3'];

            // using base = '.' will transfer everything to /public_html correctly
            // turn off buffering in gulp.src for best performance
            return gulp.src( globs, { buffer: false } )
                .pipe( conn.newer( '/jesites/src' ) ) // only upload newer files
                .pipe( conn.dest( '/jesites/src' ) );

        }));
});

gulp.task('deploy:site', function () {
    return gulp.src('/')//it may be anything
        .pipe(prompt.prompt({
            type: 'password',
            name: 'pass',
            message: 'Please enter your password'
        }, function(res){

            var conn = ftp.create( {
                host:     'www.jesidea.com',
                user:     'jesidea.com',
                password: res.pass,
                parallel: 10,
                log:      gutil.log
            } );

            //var globs = 'src/index.html';

            var globs = ['index.html',
                        '**/*.*',
                        '!node_modules/**/*.*',
                        '!src/**/*.*',
                        '!**/*.zip'];

            // using base = '.' will transfer everything to /public_html correctly
            // turn off buffering in gulp.src for best performance
            return gulp.src( globs, { buffer: false } )
                .pipe( conn.newer( '/jesites' ) ) // only upload newer files
                .pipe( conn.dest( '/jesites' ) );

        }));
});

gulp.task('reload', function() {
  return gulp.src(['./*.html','./css/*.css','./js/*.js'])
  .pipe(livereload());
});

gulp.task('watch', function () {
	// Endless stream mode
    return watch(['./*.html','./css/*.css','./js/*.js'], { ignoreInitial: false })
        .pipe(gulp.dest('reload'));
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch']);
