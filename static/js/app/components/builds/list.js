'use strict';

define([
	'react',
	'reflux',
	'underscore',
	'./item',
	'app/stores/builds',
	'templates/app/components/builds/list'
], function(React, Reflux, _, Item, buildsStore, template) {
	template = template.locals({
		Item: Item
	});

	var Component = React.createClass({
		mixins: [
			Reflux.connectFilter(buildsStore, 'items', function(items) {
				var projectName = this.props.projectName;
				if (projectName) {
					return _(items).filter(function(item) {
						return item.project && item.project.name === projectName;
					});
				} else {
					return items;
				}
			})
		],
		render: template
	});

	return Component;
});