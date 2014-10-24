var fs = require('fs'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser();

/**
 * GET /
 */
exports.index = function(req, res, next){
	res.render('index', {
	});
};

var cachedData;
var useCache = true;
var lastStat = null;

/**
 * GET /data.json
 */
exports.data = function(req, res, next){

	function wayToPolygon(dataObj, wayElement, nodesObject){

		// Traverse nodeRefs
		var poly = [];
		var usedRefs = {};
		for (var j = 0; j < wayElement.nd.length; j++) {
			var nodeRefElement = wayElement.nd[j];
			var nodeRef = parseInt(nodeRefElement.$.ref, 10);
			if(usedRefs[nodeRef]) continue;
			usedRefs[nodeRef] = true;
			poly.push(nodesObject[nodeRef]);
		}
		return poly;
	}

	function parseNodePosition(nodeElement){
		return [parseFloat(nodeElement.$.lon), parseFloat(nodeElement.$.lat)];
	}

	var mapFile = __dirname + '/../map.osm';

	fs.stat(mapFile, function (err, stats) {
		if (err) throw err;

		if(!lastStat || stats.mtime.getTime() != lastStat)
			cachedData = false;

		lastStat = stats.mtime.getTime();

		if(cachedData && useCache){
			console.log('cached!')
			return res.send(cachedData);
		}

		fs.readFile(mapFile, function (err, data) {
			if(err) throw err;

			parser.parseString(data, function (err, result) {
				if(err) throw err;

				var bounds = result.osm.bounds[0].$;

				var data = {
					polys: [],
					trees: [],
					highways: [],
					bounds: [
						[parseFloat(bounds.minlon), parseFloat(bounds.minlat)],
						[parseFloat(bounds.maxlon), parseFloat(bounds.maxlat)]
					]
				};

				// Parse nodes
				var nodes = {};
				var ways = {};
				for (var i = 0; i < result.osm.node.length; i++) {
					var nodeElement = result.osm.node[i];
					nodes[nodeElement.$.id] = parseNodePosition(nodeElement);
				}

				// Get ways
				for (var i = 0; i < result.osm.way.length; i++) {
					var wayElement = result.osm.way[i];
					ways[wayElement.$.id] = wayElement;

					if(!wayElement.tag) continue;

					if(wayElement.tag.some(function(t){ return t.$.k == "building"; })){
						var poly = wayToPolygon(data, wayElement, nodes);
						data.polys.push(poly);
					} else if(wayElement.tag.some(function(t){ return t.$.k == "highway"; })){
						var poly = wayToPolygon(data, wayElement, nodes);
						data.highways.push(poly);
					}
				}

				// Multipolygons!
				for (var i = 0; i < result.osm.relation.length; i++) {
					var relationElement = result.osm.relation[i];

					// Make sure it has a building tag
					if(!relationElement.tag || (relationElement.tag && !relationElement.tag.some(function(t){
						return t.$.k == "building" && t.$.v == "yes";
					})) || (relationElement.tag && !relationElement.tag.some(function(t){
						return t.$.k == "type" && t.$.v == "multipolygon";
					}))){
						continue;
					}

					// Get all the outers
					var outerMemberElements = relationElement.member.filter(function (m){
						return m.$.role == "outer";
					});

					for (var j = 0; j < outerMemberElements.length; j++) {
						var wayRef = parseInt(outerMemberElements[j].$.ref, 10);
						var poly = wayToPolygon(data, ways[wayRef], nodes);
						data.polys.push(poly);
					}
				}

				// Trees!
				for (var i = 0; i < result.osm.node.length; i++) {
					var nodeElement = result.osm.node[i];
					if(nodeElement.tag && nodeElement.tag.some(function(t){ return t.$.k === 'natural' && t.$.v === 'tree'; })){
						data.trees.push(parseNodePosition(nodeElement));
					}
				}

				cachedData = data;

				// Find houses
				res.send(data);
			});
		});
	});
};
