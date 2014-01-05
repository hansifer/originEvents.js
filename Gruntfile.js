module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '// <%= pkg.title || pkg.name %>.js <%= pkg.version %>' /*+ ' - ' + '<%= grunt.template.today("yyyy-mm-dd") %>'*/ + '\n' + '<%= pkg.homepage ? "// " + pkg.homepage + "\\n" : "" %>' + '// (c) 2013-<%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' + ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n',
		banner_dep: '<%= banner %>//\n// Depends:\n// underscore (https://github.com/jashkenas/underscore)\n// node-uuid (https://github.com/broofa/node-uuid)\n// snorkel (https://github.com/hansifer/snorkel.js)\n',
		jshint: {
			gruntfile: {
				src: 'Gruntfile.js',
				options: {
					jshintrc: '.jshintrc'
				}
			},
			src: {
				src: ['src/originEvents.js'],
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
		clean: {
			dist: ['dist/dependent/*', 'dist/standalone/*'],
			intro_site_js: 'docs/intro_site/js/originEvents.js'
		},
		usebanner: {
			dist_dep_dev: {
				options: {
					position: 'top',
					banner: '<%= banner_dep %>\n',
					linebreak: false
				},
				files: {
					src: 'dist/dependent/originEvents.dep.js'
				}
			},
			dist_dep_prod: {
				options: {
					position: 'top',
					banner: '<%= banner_dep %>\n',
					linebreak: false
				},
				files: {
					src: 'dist/dependent/originEvents.dep.min.js'
				}
			},
			dist_standalone_dev: {
				options: {
					position: 'top',
					banner: '<%= banner %>\n',
					linebreak: false
				},
				files: {
					src: 'dist/standalone/originEvents.js'
				}
			},
			dist_standalone_prod: {
				options: {
					position: 'top',
					banner: '<%= banner %>\n',
					linebreak: false
				},
				files: {
					src: 'dist/standalone/originEvents.min.js'
				}
			}
		},
		uglify: {
			src_to_dist_dep: {
				// options: {
				// 	xreport: 'gzip', // using file_info instead
				// 	xbanner: '<%= banner_dep %>\n' // using usebanner instead
				// },
				src: 'src/<%= pkg.name %>.js',
				dest: 'dist/dependent/<%= pkg.name %>.dep.min.js'
			},
			underscore_mod: {
				options: {
					preserveComments: 'some'
				},
				src: 'lib/underscore.mod.js',
				dest: 'lib/underscore.mod.min.js'
			},
			uuid_mod: {
				options: {
					preserveComments: 'some'
				},
				src: 'lib/uuid.mod.js',
				dest: 'lib/uuid.mod.min.js'
			}
		},
		qunit: {
			dist_dependent_dev: ['test/originEvents_test_dist_dependent_dev.html'],
			dist_dependent_prod: ['test/originEvents_test_dist_dependent_prod.html'],
			dist_standalone_dev: ['test/originEvents_test_dist_standalone_dev.html'],
			dist_standalone_prod: ['test/originEvents_test_dist_standalone_prod.html']
		},
		copy: {
			src_to_dist_dep: {
				banner: '<%= banner %>\n',
				expand: true,
				cwd: 'src/',
				src: 'originEvents.js',
				dest: 'dist/dependent',
				filter: 'isFile',
				rename: function(dest) {
					return dest + '/originEvents.dep.js';
				}
			},
			dist_standalone_to_docs: {
				expand: true,
				cwd: 'dist/standalone/',
				src: 'originEvents.js',
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
		concat: {
			orig: {
				options: {
					separator: grunt.util.linefeed + grunt.util.linefeed
				},
				src: ['src/intro.js', 'dist/dependent/originEvents.dep.js', 'lib/underscore.mod.js', 'lib/uuid.mod.js', 'lib/snorkel/snorkel.dep.js', 'src/outro.js'],
				dest: 'dist/standalone/originEvents.js'
			},
			min: {
				options: {
					separator: grunt.util.linefeed + grunt.util.linefeed
				},
				src: ['src/intro.js', 'dist/dependent/originEvents.dep.min.js', 'lib/underscore.mod.min.js', 'lib/uuid.mod.min.js', 'lib/snorkel/snorkel.dep.min.js', 'src/outro.js'],
				dest: 'dist/standalone/originEvents.min.js'
			}
		},
		file_info: {
			Dependent_size: {
				src: ['dist/dependent/originEvents.dep.js', 'dist/dependent/originEvents.dep.min.js'],
				options: {
					inject: {
						dest: 'README.md',
						text: '###Size' + grunt.util.linefeed + grunt.util.linefeed + '|          | Dependent Version | Standalone Version |' + grunt.util.linefeed + '| :------- | ----------------: | -----------------: |' + grunt.util.linefeed + '| Original | {{= sizeText(size(src[0]), 17) }} | {{= _.lpad(pass(), 18) }} |' + grunt.util.linefeed + '| Minified | {{= sizeText(size(src[1]), 17) }} | {{= _.lpad(pass(), 18) }} |' + grunt.util.linefeed + '| Gzipped  | {{= sizeText(gzipSize(src[1]), 17) }} | {{= _.lpad(pass(), 18) }} |'
					}
				}
			},
			Standalone_size: {
				src: ['dist/standalone/originEvents.js', 'dist/standalone/originEvents.min.js'],
				options: {
					inject: {
						dest: 'README.md',
						text: '###Size' + grunt.util.linefeed + grunt.util.linefeed + '|          | Dependent Version | Standalone Version |' + grunt.util.linefeed + '| :------- | ----------------: | -----------------: |' + grunt.util.linefeed + '| Original | {{= _.lpad(pass(), 17) }} | {{= sizeText(size(src[0]), 18) }} |' + grunt.util.linefeed + '| Minified | {{= _.lpad(pass(), 17) }} | {{= sizeText(size(src[1]), 18) }} |' + grunt.util.linefeed + '| Gzipped  | {{= _.lpad(pass(), 17) }} | {{= sizeText(gzipSize(src[1]), 18) }} |'
					}
				}
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
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-file-info');
	grunt.loadNpmTasks('grunt-banner');

	grunt.registerTask('default', ['jshint', 'clean:dist', 'copy:src_to_dist_dep', 'uglify:src_to_dist_dep', 'concat:orig', 'concat:min', 'usebanner', 'qunit:dist_dependent_dev', 'qunit:dist_dependent_prod', 'qunit:dist_standalone_dev', 'qunit:dist_standalone_prod', 'file_info']);

	grunt.registerTask('doc', ['clean:intro_site_js', 'copy:dist_standalone_to_docs', 'smart_clean:docs_publish', 'copy:docs_to_publish']);


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
