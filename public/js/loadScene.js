require([
	'goo/entities/GooRunner',
	'goo/animationpack/systems/AnimationSystem',
	'goo/fsmpack/statemachine/StateMachineSystem',
	'goo/entities/systems/HtmlSystem',
	'goo/timelinepack/TimelineSystem',
	'goo/loaders/DynamicLoader',
	'goo/util/combine/EntityCombiner',
	'goo/renderer/Renderer',
	'goo/util/rsvp',

	'js/CanvasWrapper',
	'js/WebGLSupport',

	'goo/renderer/Material',
	'goo/renderer/shaders/ShaderLib',
	'goo/shapes/Box',
	'goo/shapes/Quad',
	'goo/shapes/Cone',
	'goo/math/Transform',
	'goo/util/MeshBuilder',
	'goo/geometrypack/PolyLine',
	'goo/geometrypack/FilledPolygon',
	'goo/geometrypack/Triangle',
	'goo/math/Vector3',

	'goo/animationpack/handlers/SkeletonHandler',
	'goo/animationpack/handlers/AnimationComponentHandler',
	'goo/animationpack/handlers/AnimationStateHandler',
	'goo/animationpack/handlers/AnimationLayersHandler',
	'goo/animationpack/handlers/AnimationClipHandler',

	'goo/fsmpack/StateMachineComponentHandler',
	'goo/fsmpack/MachineHandler',
	'goo/timelinepack/TimelineComponentHandler',
	'goo/passpack/PosteffectsHandler',
	'goo/quadpack/QuadComponentHandler',
	'goo/scriptpack/ScriptHandler',
	'goo/scriptpack/ScriptComponentHandler',
	'goo/scriptpack/ScriptRegister',
	'goo/scripts/GooClassRegister'

], function (
	GooRunner,
	AnimationSystem,
	StateMachineSystem,
	HtmlSystem,
	TimelineSystem,
	DynamicLoader,
	EntityCombiner,
	Renderer,
	RSVP,

	CanvasWrapper,
	WebGLSupport,

	Material,
	ShaderLib,
	Box,
	Quad,
	Cone,
	Transform,
	MeshBuilder,
	PolyLine,
	FilledPolygon,
	Triangle,
	Vector3
) {
	'use strict';

	function setup(gooRunner, loader) {
		// Application code goes here!

		var buildingMaterial = new Material(ShaderLib.uber);
		var groundMaterial = new Material(ShaderLib.uber);
		var treeMaterial = new Material(ShaderLib.uber);
		var roadMaterial = new Material(ShaderLib.uber);
		buildingMaterial.cullState.enabled = false;
		groundMaterial.uniforms.materialDiffuse = [0,0.6,0,1];
		treeMaterial.uniforms.materialDiffuse = [0,0.3,0,1];
		roadMaterial.uniforms.materialDiffuse = [1,1,1,1];

		var scale = 1000;
		var height = 0.005 * scale;
		var heightRandomness = 1;

		$.ajax({
			dataType: "json",
			url: '/data.json',
			success: function(data){
				console.log(data)
				// Transform long / lat coordinate to world space
				function transform(p){
					var x = (p[0] - data.bounds[0][0]) / (data.bounds[1][0] - data.bounds[0][0]);
					var y = (p[1] - data.bounds[0][1]) / (data.bounds[1][0] - data.bounds[0][0]);

					x *= scale;
					y *= -scale * 1.75;

					x += -5;
					y += 5;

					return [x, y];
				}


				// Ground Quad
				var tileMin = transform(data.bounds[0]);
				var tileMax = transform(data.bounds[1]);
				var groundQuad = new Quad(Math.abs(tileMax[0] - tileMin[0]), Math.abs(tileMax[1] - tileMin[1]));
				var groundEntity = gooRunner.world.createEntity(groundQuad, [tileMin[0] + groundQuad.xExtent,0,tileMin[1] - groundQuad.yExtent], groundMaterial).addToWorld();
				groundEntity.transformComponent.transform.rotation.rotateX(-Math.PI / 2);
				groundEntity.transformComponent.transform.update();
				groundEntity.transformComponent.setUpdated();


				// Move camera to place
				var cameraPos = transform([18.0988, 59.33412]);
				var initPos = new Vector3(cameraPos[0], 1, cameraPos[1]);
				var goonPos = new Vector3(cameraPos[0], 0, cameraPos[1]);
				// Random!
				goonPos.x = (0.5 - Math.random()) * groundQuad.xExtent + groundEntity.transformComponent.transform.translation.x;
				goonPos.z = (0.5 - Math.random()) * groundQuad.yExtent + groundEntity.transformComponent.transform.translation.z;
				var logoPos = new Vector3(cameraPos[0], height * 4, cameraPos[1]);
				var goon = gooRunner.world.by.name('Goon').first();
				var logo = gooRunner.world.by.name('Goo Logo').first();
				logo.transformComponent.transform.scale.setd(20,20,20);
				goon.transformComponent.transform.scale.setd(3,3,3);
				goon.setTranslation(goonPos);
				logo.setTranslation(logoPos);
				gooRunner.world.by.name('Default Camera').first().setTranslation(initPos);


				// Buildings
				var meshBuilder = new MeshBuilder();
				for (var i = 0; i < data.polys.length; i++) {
					var poly = data.polys[i];
					var p = transform(poly[0]);

					// Just create box for now
					if(false){
						var mesh = new Box(0.1,0.1,0.1);
						var localTrans = new Transform();
						localTrans.translation.seta([p[0],0,p[1]]);
						localTrans.update();
						meshBuilder.addMeshData(mesh, localTrans);
					} else {
						var verts = [];
						poly.forEach(function(vertex){
							var v = transform(vertex);
							verts.push(v[0], 0, v[1]);
						});
						verts.push(verts[0], verts[1], verts[2])
						//console.log(verts)
						var a = new PolyLine(verts, true);
						var h = height * (1 + Math.random()*heightRandomness);
						var b = new PolyLine([0,0,0,  0,h,0], false);
						var mesh = a.pipe(b);

						var localTrans = new Transform();
						var localRoofTrans = new Transform();
						localRoofTrans.rotation.rotateX(Math.PI / 2);
						localRoofTrans.translation.y += h;
						//localTrans.translation.y += h;
						localTrans.update();
						localRoofTrans.update();

						var verts2 = [];
						poly.forEach(function (vertex){
							var v = transform(vertex);
							verts2.push(v[0], v[1], 0);
						});

						var verts3 = [];
						poly.forEach(function (vertex){
							var v = transform(vertex);
							verts3.push(v[0], v[1]);
						})
						if(!PolyK.IsSimple(poly)){
							console.log('nonsimple!')
							continue;
						}
						var indices = PolyK.Triangulate(verts3);
						var verts4 = [];
						if(indices.length == 3 * 3){
							//continue;
						}
						for (var j = 0; j < indices.length; j+=3) {
							var idx0 = indices[j];
							var idx1 = indices[j+1];
							var idx2 = indices[j+2];

							var testTriangle = [
								verts3[2*idx0], verts3[2*idx0+1],
								verts3[2*idx1], verts3[2*idx1+1],
								verts3[2*idx2], verts3[2*idx2+1]
							];
							if(PolyK.GetArea(testTriangle) < 0){
								var tmp = idx0;
								idx0 = idx1;
								idx1 = tmp;
							}
							var tri = new Triangle([
								verts3[2*idx1], verts3[2*idx1+1], 0,
								verts3[2*idx0], verts3[2*idx0+1], 0,
								verts3[2*idx2], verts3[2*idx2+1], 0
							]);
							meshBuilder.addMeshData(tri, localRoofTrans);
						}

						meshBuilder.addMeshData(mesh, localTrans);
					}
				}
				var meshDatas = meshBuilder.build();
				for (var i = 0; i < meshDatas.length; i++) {
					var entity = gooRunner.world.createEntity(meshDatas[i], [0,0,0], buildingMaterial).addToWorld();
				}

				// Trees
				meshBuilder = new MeshBuilder();
				for (var i = 0; i < data.trees.length; i++) {
					var tree = data.trees[i];

					var p = transform(tree);

					var localTrans = new Transform();
					localTrans.translation.setd(p[0], 0, p[1]);
					localTrans.rotation.rotateX(-Math.PI / 2);
					localTrans.update();
					var mesh = new Cone(10, 2, height*1.5);
					meshBuilder.addMeshData(mesh, localTrans);
				}
				meshDatas = meshBuilder.build();
				for (var i = 0; i < meshDatas.length; i++) {
					var entity = gooRunner.world.createEntity(meshDatas[i], [0,0,0], treeMaterial).addToWorld();
				}

				// Highways
				meshBuilder = new MeshBuilder();
				for (var i = 0; i < data.highways.length; i++) {
					var highway = data.highways[i];

					var highwayVerts = [];
					highway.forEach(function(vertex){
						var v = transform(vertex);
						highwayVerts.push(v[0], 0, v[1]);
					});

					// Just create box for now
					var mesh;
					if(false){
						for (var j = 0; j < highwayVerts.length; j+=3) {
							mesh = new Box(1,1,1);
							//console.log(mesh)
							var localTrans = new Transform();
							localTrans.translation.setd(highwayVerts[j], 1, highwayVerts[j+2]);
							localTrans.update();
							meshBuilder.addMeshData(mesh, localTrans);
						}
					} else {
						// Polyline
						/*var highwayVerts = [];
						for (var j = 0; j < highway.length; j++) {
							var p = transform(highway[j]);
							highwayVerts.push(p[0], 0, p[1]);
							//var entity = gooRunner.world.createEntity(mesh, [0,0,0], roadMaterial).addToWorld();
							//console.log(highwayVerts);
						}
						*/

						// console.log(highwayVerts)
						var line = new PolyLine(highwayVerts, false);
						// var orthoLine = new PolyLine([0,0,-1,  0,0,1,  1,0,1, 1,0,-1], false);
						// mesh = orthoLine.pipe(line);

						//console.log(mesh)
						var localTrans = new Transform();
						localTrans.translation.y = 1;
						//localTrans.rotation.rotateX(-Math.PI / 2);
						localTrans.update();
						meshBuilder.addMeshData(line, localTrans);

						var entity = gooRunner.world.createEntity(line, [0,0.01,0], roadMaterial).addToWorld();
						entity.hide();
						entity.setTag('highway');
					}
				}
			},
			error: function(err){
				console.error(err);
			}
		});

		var hidden = true;
		var goonHidden = true;
		document.addEventListener('keyup', function(e){
			if(e.which == 72){
				gooRunner.world.by.tag('highway').each(function(entity){
					if(hidden) entity.show();
					else entity.hide();
				});
				hidden = !hidden;
			}

			if(e.which == 71){
				gooRunner.world.by.name('Goon').each(function(entity){
					entity.transformComponent.transform.translation.y = goonHidden ? 4 * height : 0;
					entity.transformComponent.transform.update();
					entity.transformComponent.setUpdated();
				});
				goonHidden = !goonHidden;
			}
		});

	}

	/**
	 * Converts camelCase (js) to dash-case (html)
	 */
	function camel2dash(str) {
		return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}

	/**
	* Shows the fallback help content on index.html
	*/
	function showFallback(errorObject) {
		// Show the fallback
		var fallbackEl = document.getElementById('fallback');
		fallbackEl.classList.add('show');
		fallbackEl.style.backgroundImage = fallbackEl.getAttribute('data-background');
		var browsers = WebGLSupport.BROWSERS;


		var id;
		if (errorObject.browser === browsers.IOS) {
				id = 'ios-error';
		} else {

			id = camel2dash(errorObject.error);

			if (errorObject.error == WebGLSupport.ERRORS.WEBGL_DISABLED) {
				if (errorObject.browser == browsers.CHROME) {
					id += '-chrome';
				} else if (errorObject.browser == browsers.SAFARI) {
					id += '-safari';
				}
			}
		}

		var errorElement = document.getElementById(id);
		errorElement.classList.add('show');
	}


	function init() {

		// Check that WebGL is supported.
		var result = WebGLSupport.check();
		if (result.error !== WebGLSupport.ERRORS.NO_ERROR) {
			showFallback(result);
			return;
		}

		document.getElementById('canvas-outer').classList.remove('hidden');

		// Prevent browser peculiarities to mess with our controls.
		document.body.addEventListener('touchstart', function (event) {

			if(event.target.nodeName === 'A' ) { return }
			var node = event.target.parentElement;
			for (var i = 0; i < 5; i++) {
				if (!node) {
					break;
				}
				if (node.nodeName === 'A') {
					return;
				}
				node = node.parentElement;
			}
			event.preventDefault();
			return;
		}, false);

		// Show the loading overlay
		document.getElementById('goo-loading-overlay').classList.add('loading');

		// Init the GooEngine
		var gooRunner = initGoo();
		var world = gooRunner.world;

		var transformSystem = world.getSystem('TransformSystem');
		var cameraSystem = world.getSystem('CameraSystem');
		var boundingSystem = world.getSystem('BoundingUpdateSystem');
		var animationSystem = world.getSystem('AnimationSystem');
		var renderSystem = world.getSystem('RenderSystem');
		var renderer = gooRunner.renderer;

		// Load the scene
		loadScene(gooRunner).then(function (loader) {



			world.processEntityChanges();
			transformSystem._process();
			cameraSystem._process();
			boundingSystem._process();
			if (Renderer.mainCamera) { gooRunner.renderer.checkResize(Renderer.mainCamera); }
			return setup(gooRunner, loader);
		}).then(function () {
			new EntityCombiner(world).combine();
			world.processEntityChanges();
			transformSystem._process();
			cameraSystem._process();
			boundingSystem._process();
			animationSystem._process();
			renderSystem._process();

			return renderer.precompileShaders(renderSystem._activeEntities, renderSystem.lights);
		}).then(function () {
			return renderer.preloadMaterials(renderSystem._activeEntities);
		}).then(function () {
			// Hide the loading overlay.
			document.getElementById('goo-loading-overlay').classList.remove('loading');
			CanvasWrapper.show();

			CanvasWrapper.resize();
			// Start the rendering loop!
			gooRunner.startGameLoop();
			gooRunner.renderer.domElement.focus();
		}).then(null, function (e) {
			// If something goes wrong, 'e' is the error message from the engine.
			alert('Failed to load scene: ' + e);
		});
	}


	function initGoo() {

		// Create typical Goo application.
		var gooRunner = new GooRunner({
			antialias: true,
			manuallyStartGameLoop: true,
			useDevicePixelRatio: true,
			logo: false

		});

		gooRunner.world.add(new AnimationSystem());
		gooRunner.world.add(new StateMachineSystem(gooRunner));
		gooRunner.world.add(new HtmlSystem(gooRunner.renderer));
		gooRunner.world.add(new TimelineSystem());

		return gooRunner;
	}


	function loadScene(gooRunner) {
		/**
		 * Callback for the loading screen.
		 *
		 * @param  {number} handled
		 * @param  {number} total
		 */
		var progressCallback = function (handled, total) {
			var loadedPercent = (100 * handled / total).toFixed();
			var progress = document.getElementById("progress");

			progress.style.width = loadedPercent + "%";
		};

		// The loader takes care of loading the data.
		var loader = new DynamicLoader({
			world: gooRunner.world,
			rootPath: 'res'
		});

		return loader.load('root.bundle', {
			preloadBinaries: true,
			progressCallback: progressCallback
		}).then(function(result) {
			var scene = null;

			// Try to get the first scene in the bundle.
			for (var key in result) {
				if (/\.scene$/.test(key)) {
					scene = result[key];
					break;
				}
			}



			if (!scene || !scene.id) {
				alert('Error: No scene in bundle'); // Should never happen.
				return null;
			}

			// Setup the canvas configuration (sizing mode, resolution, aspect
			// ratio, etc).
			var canvasConfig = scene ? scene.canvas : {};
			CanvasWrapper.setup(gooRunner.renderer.domElement, canvasConfig);
			CanvasWrapper.add();
			CanvasWrapper.hide();

			return loader.load(scene.id);
		});
	}
	init();
});