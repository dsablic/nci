'use strict';

define([
	'react', 'reflux', 'app/actions/buildLog', 'app/stores/buildLog',
	'ansi_up', 'underscore', 'templates/app/components/buildLog/index'
], function(
	React, Reflux, BuildLogActions, buildLogStore,
	ansiUp, _, template
) {
	var chunkSize = 20;

	return React.createClass({
		mixins: [
			Reflux.connectFilter(buildLogStore, 'data', function(data) {
				data.output = data.lines.join('');
				data.output = data.output.replace(
					/(.*)\n/gi,
					'<span class="terminal_code_newline">$1</span>'
				);
				data.output = ansiUp.ansi_to_html(data.output);
				return data;
			})
		],
		statics: {
			willTransitionTo: function(transition, params, query) {
				BuildLogActions.getTail({buildId: params.buildId, length: chunkSize});
			}
		},
		onFromChange: function(event) {
			var from = Number(event.target.value);
			this.setState({from: from});

			BuildLogActions.getLines({
				buildId: this.props.params.buildId,
				from: from,
				to: from + chunkSize - 1
			});
		},
		render: template
	});
});