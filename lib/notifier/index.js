'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	logger = require('../logger')('notifier'),
	BaseNotifierTransport = require('./transport/base').Transport,
	ConsoleNotifierTransport = require('./transport/console').Transport;

var constructors = {
	console: ConsoleNotifierTransport
};

exports.register = function(type, constructor) {
	constructors[type] = constructor;
};

exports.BaseNotifierTransport = BaseNotifierTransport;


function Notifier(params) {
	this.db = params.db;

	this.instances = {};
}

exports.Notifier = Notifier;

Notifier.prototype.init = function(params, callback) {
	var self = this;

	Steppy(
		function() {
			var initGroup = this.makeGroup();
			_(constructors).each(function(Constructor, type) {
				self.instances[type] = new Constructor();
				self.instances[type].init(params[type], initGroup.slot());
			});
		},
		callback
	);
};

// Returns previous (by number) build from the same project
Notifier.prototype._getPrevBuild = function(build, callback) {
	var self = this;

	Steppy(
		function() {
			// get id of prev build
			self.db.builds.find({
				start: {
					projectName: build.project.name,
					number: build.number - 1
				},
				limit: 1
			}, this.slot());
		},
		function(err, builds) {
			// get prev build by id
			self.db.builds.find({start: {id: builds[0].id}}, this.slot());
		},
		function(err, builds) {
			this.pass(builds[0]);
		},
		callback
	);
};

/*
 * Check if that's completed build should be notified, then notify
 */
Notifier.prototype.send = function(build, callback) {
	callback = callback || function(err) {
		if (err) {
			logger.error('Error during send:', err.stack || err);
		}
	};
	var self = this;

	Steppy(
		function() {
			if (!build.completed) {
				throw new Error('Build should be completed before notify');
			}

			var notify = build.project.notify;

			// TODO: move to project validation during load
			if (!notify || !notify.on || !notify.to) {
				return callback();
			}

			this.pass(notify);

			// get previous build (for some strategies)
			if (
				build.number > 1 &&
				_(notify.on).intersection(['change']).length
			) {
				self._getPrevBuild(build, this.slot());
			}
		},
		function(err, notify, prevBuild) {
			var strategy = _(notify.on).find(function(strategy) {
				if (strategy === 'done') {
					return build.status === 'done';
				} else if (strategy === 'error') {
					return build.status === 'error';
				} else if (strategy === 'change') {
					// notify on status change or about first build
					return prevBuild ? build.status !== prevBuild.status: true;
				}
			});

			// Nothing to notify about
			if (!strategy) {
				return callback();
			}

			var notifyGroup = this.makeGroup();
			_(notify.to).each(function(recipients, type) {
				logger.log(
					'Notify about ' + build.project.name + ' build #' +
					build.number + ' "' + strategy + '" via ' + type
				);
				if (type in self.instances) {
					self.instances[type].send({
						build: build,
						notifyReason: {strategy: strategy}
					}, notifyGroup.slot());
				} else {
					throw new Error('Unknown notifier: ' + type);
				}
			});
		},
		callback
	);
};
