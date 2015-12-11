'use strict';

var React = require('react'),
	Router = require('react-router'),
	Header = require('../header'),
	ProjectActions = require('../../actions/project'),
	template = require('./index.jade');

var Component = React.createClass({
	componentDidMount: function() {
		console.log('read all projects in component');
		console.log(ProjectActions);
		ProjectActions.readAll();
	},
	render: function() { 
		return template({
			Link: Router.Link,
			Header: Header,
			RouteHandler: Router.RouteHandler
		});
	}
});

module.exports = Component;