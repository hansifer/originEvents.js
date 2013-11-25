module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '// <%= pkg.title || pkg.name %>.js <%= pkg.version %>' /*+ ' - ' + '<%= grunt.template.today("yyyy-mm-dd") %>'*/ + '\n' + '<%= pkg.homepage ? "// " + pkg.homepage + "\\n" : "" %>' + '// (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' + ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n',
		jshint: {
			gruntfile: {
				src: 'Gruntfile.js',
				options: {
					jshintrc: '.jshintrc'
				}
			},
			src: {
				src: ['originEvents.js'],
				options: {
					jshintrc: '.jshintrc'
				}
			},
			test: {
				src: ['test/originEvents_test.js'],
				options: {
					jshintrc: 'test/.jshintrc'
				}
			}
		},
		uglify: {
			options: {
				report: 'gzip',
				banner: '<%= banner %>\n'
			},
			build: {
				src: '<%= pkg.name %>.js',
				dest: '<%= pkg.name %>.min.js'
			}
		},
		qunit: {
			dev: ['test/originEvents_test_dev.html'],
			dist: ['test/originEvents_test_dist.html']
		},
		copy: {
			src_to_docs: {
				src: ['originEvents.js'],
				dest: 'docs/intro_site/js/',
				filter: 'isFile'
			},
			docs_to_publish: {
				expand: true,
				cwd: 'docs/intro_site/',
				src: ['**'],
				dest: '../intro_site_publish/'
			}
		},
		smart_clean: {
			docs_publish: '../intro_site_publish/'
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('default', ['jshint', 'qunit:dev', 'uglify', 'qunit:dist']);
	grunt.registerTask('doc', ['copy:src_to_docs', 'smart_clean:docs_publish', 'copy:docs_to_publish']);

	// A very basic default task.
	grunt.registerMultiTask('smart_clean', 'Delete all items in directory except .git directory', function() {
		var arr, i, dir;

		arr = grunt.file.expand({
			cwd: this.data,
			filter: 'isDirectory'
		}, "**");

		for (i = 0; i < arr.length; i++) {
			if (arr[i].length > 1 && arr[i] !== '.git') {
				dir = this.data + arr[i];
				grunt.file.delete(dir, {
					force: true
				});
				grunt.log.write('DELETED: ' + dir).ok();
			}
		}

		 arr = grunt.file.expand({
			cwd: this.data,
			filter: 'isFile'
		}, "**");

		for (i = 0; i < arr.length; i++) {
			if (arr[i].length > 1 && arr[i] !== '.git') {
				dir = this.data + arr[i];
				grunt.file.delete(dir, {
					force: true
				});
				grunt.log.write('DELETED: ' + dir).ok();
			}
		}

		// grunt.file.delete(this.data, {force: true});
		// grunt.log.write('Logging some stuff...').ok();
	});
};
