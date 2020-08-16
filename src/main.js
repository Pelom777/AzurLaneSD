var isMobile;
var lastFrameTime = Date.now() / 1000;
var json;
var url="assets/name.json";
var change = false;
var loaded = false;
var canvas;
var loading;
var shader;
var batcher;
var gl;
var mvp = new spine.webgl.Matrix4();
var assetManager;
var skeletonRenderer;
var debugRenderer;
var shapes;
var chosenSkeleton = "z23_h";
var activeSkeleton;
var swirlEffect = new spine.SwirlEffect(0);
var jitterEffect = new spine.JitterEffect(20, 20);
var swirlTime = 0;
function checkMobile() {
	if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		return true;
	}
	else {
		return false;
	}
}
function loadJson() {
	//load name list.
	$.getJSON(url, function(data){
		json = eval(data);
	})
}
function init () {
	isMobile = checkMobile();
	// Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
	// loading textures. That is handled separately by PolygonBatcher.
	canvas = document.getElementById("canvas");
	loading = document.getElementById("loading");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	var config = { alpha: false };
	gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
	if (!gl) {
		alert('WebGL is unavailable.');
		return;
	}
	// Create a simple shader, mesh, model-view-projection matrix and SkeletonRenderer.
	shader = spine.webgl.Shader.newTwoColoredTextured(gl);
	batcher = new spine.webgl.PolygonBatcher(gl);
	mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
	skeletonRenderer = new spine.webgl.SkeletonRenderer(gl);
	debugRenderer = new spine.webgl.SkeletonDebugRenderer(gl);
	debugRenderer.drawRegionAttachments = true;
	debugRenderer.drawBoundingBoxes = true;
	debugRenderer.drawMeshHull = true;
	debugRenderer.drawMeshTriangles = true;
	debugRenderer.drawPaths = true;
	debugShader = spine.webgl.Shader.newColored(gl);
	shapes = new spine.webgl.ShapeRenderer(gl);
	assetManager = new spine.webgl.AssetManager(gl);
	// Tell AssetManager to load the resources for each model, including the exported .skel file, the .atlas file and the .png
	// file for the atlas. We then wait until all resources are loaded in the load() method.
	loadJson();
	assetManager.loadBinary("assets/AL/" + chosenSkeleton + "/" + chosenSkeleton + ".skel");
	assetManager.loadTextureAtlas("assets/AL/" + chosenSkeleton + "/" + chosenSkeleton + ".atlas");

	// setupUI();
	requestAnimationFrame(load);
}
function choose(name){
	change = true;
	assetManager.loadBinary("assets/AL/" + name + "/" + name + ".skel");
	assetManager.loadTextureAtlas("assets/AL/" + name + "/" + name + ".atlas");
	chosenSkeleton = name;
}
function load() {
	loading.style.display = "block";
	// console.log("load:" + assetManager.isLoadingComplete());
	// Wait until the AssetManager has loaded all resources, then load the skeletons.
	if (assetManager.isLoadingComplete()) {
		// for(i in json){
		// 	skeletons[json[i]] = loadSkeleton(json[i], "normal", false);
		// }
		activeSkeleton = loadSkeleton(chosenSkeleton, "normal", false);
		change = false;
		if(!loaded){
			setupUI();
		}
		setupAnimationUI();
		loaded = true;
		requestAnimationFrame(render);
	} else {
		requestAnimationFrame(load);
	}
}
function loadSkeleton (name, initialAnimation, premultipliedAlpha, skin) {
	if (skin === undefined) skin = "default";
	// Load the texture atlas using name.atlas from the AssetManager.
	var atlas = assetManager.get("assets/AL/" + name + "/" + name + ".atlas");
	// Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
	var atlasLoader = new spine.AtlasAttachmentLoader(atlas);
	// Create a SkeletonBinary instance for parsing the .skel file.
	// var skeletonBinary = new spine.SkeletonBinary(atlasLoader);
	var skeletonBinary = new spine.SkeletonBinary(atlasLoader);
	// Set the scale to apply during parsing, parse the file, and create a new skeleton.
	skeletonBinary.scale = isMobile ? 0.75 : 1;
	var skeletonData = skeletonBinary.readSkeletonData(assetManager.get("assets/AL/" + name + "/" + name + ".skel"));
	var skeleton = new spine.Skeleton(skeletonData);
	skeleton.setSkinByName(skin);
	var bounds = calculateBounds(skeleton);
	// Create an AnimationState, and set the initial animation in looping mode.
	animationStateData = new spine.AnimationStateData(skeleton.data);
	var animationState = new spine.AnimationState(animationStateData);
	animationState.setAnimation(0, initialAnimation, true);
	// Pack everything up and return to caller.
	return { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
}
function calculateBounds(skeleton) {
	skeleton.setToSetupPose();
	skeleton.updateWorldTransform();
	var offset = new spine.Vector2();
	var size = new spine.Vector2();
	skeleton.getBounds(offset, size, []);
	return { offset: offset, size: size };
}
function setupAnimationUI(){
	var animationList = $("#animationList");
	animationList.empty();
	var skeleton = activeSkeleton.skeleton;
	var state = activeSkeleton.state;
	var activeAnimation = state.tracks[0].animation.name;
	for (var i = 0; i < skeleton.data.animations.length; i++) {
		var name = skeleton.data.animations[i].name;
		var option = $("<option></option>");
		option.attr("value", name).text(name);
		if (name === activeAnimation) option.attr("selected", "selected");
		animationList.append(option);
	}
	animationList.change(function() {
		var state = activeSkeleton.state;
		var skeleton = activeSkeleton.skeleton;
		var animationName = $("#animationList option:selected").text();
		skeleton.setToSetupPose();
		state.setAnimation(0, animationName, true);
	})
}
function setupUI () {
	var skeletonList = $("#skeletonList");
	for (var i in json) {
		skeletonName = json[i];
		var option = $("<option></option>");
		option.attr("value", skeletonName).text(skeletonName);
		if (skeletonName === chosenSkeleton) option.attr("selected", "selected");
		skeletonList.append(option);
	}
	skeletonList.change(function() {
		choose($("#skeletonList option:selected").text());
		// setupAnimationUI();
	})
	// setupAnimationUI();
}
function render () {
	loading.style.display = "none";
	// console.log("render:" + assetManager.isLoadingComplete());
	if(change){
		load();
		return;
	}
	var now = Date.now() / 1000;
	var delta = now - lastFrameTime;
	lastFrameTime = now;
	// Update the MVP matrix to adjust for canvas size changes
	resize();
	gl.clearColor(0.3, 0.3, 0.3, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	// Apply the animation state based on the delta time.
	var state = activeSkeleton.state;
	var skeleton = activeSkeleton.skeleton;
	var bounds = activeSkeleton.bounds;
	var premultipliedAlpha = activeSkeleton.premultipliedAlpha;
	state.update(delta);
	state.apply(skeleton);
	skeleton.updateWorldTransform();
	// Bind the shader and set the texture and model-view-projection matrix.
	shader.bind();
	shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
	shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);
	// Start the batch and tell the SkeletonRenderer to render the active skeleton.
	batcher.begin(shader);
	skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
	skeletonRenderer.draw(batcher, skeleton);
	batcher.end();
	shader.unbind();
	requestAnimationFrame(render);
}
function resize () {
	var w = canvas.clientWidth;
	var h = canvas.clientHeight;
	var bounds = activeSkeleton.bounds;
	if (canvas.width != w || canvas.height != h) {
		canvas.width = w;
		canvas.height = h;
	}
	// magic
	var centerX = bounds.offset.x + bounds.size.x / 2;
	var centerY = bounds.offset.y + bounds.size.y / 2;
	var scaleX = bounds.size.x / canvas.width;
	var scaleY = bounds.size.y / canvas.height;
	var scale = Math.max(scaleX, scaleY) * 1.2;
	if (scale < 1) scale = 1;
	var width = canvas.width * scale;
	var height = canvas.height * scale;
	mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
	gl.viewport(0, 0, canvas.width, canvas.height);
}