define([
	'goo/renderer/MeshData',
],
/** @lends */
function (
	MeshData,
) {
	'use strict';

	/**
	 * @class
	 * Creates a procedural house mesh from a 2D polygon
	 */
	function House(polygon) {
		this.polygon = polygon;

		var attributeMap = MeshData.defaultMap([MeshData.POSITION]);

		MeshData.call(this, attributeMap, polygon.length / 3, polygon.length / 3);

		this.indexModes = ['Triangles'];

		this.rebuild();
	}
	House.prototype = Object.create(MeshData.prototype);

	/**
	 * @description Builds or rebuilds the mesh data
	 * @returns {House} Self for chaining
	 */
	House.prototype.rebuild = function () {
		this.getAttributeBuffer(MeshData.POSITION).set(this.verts);

		var indices = [];
		var nVerts = this.verts.length / 3;
		for (var i = 0; i < nVerts; i++) {
			indices.push(i);
		}

		this.getIndexBuffer().set(indices);

		return this;
	};

	return House;
});