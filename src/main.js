var isMobile;
var lastFrameTime = Date.now() / 1000;
var nameList;
var byJsonList;
var nameUrl = "assets/name.json";
var byJsonUrl = "assets/byJson.json";
var change = false;
var byJson = false;
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
var chosenAnimation = "normal";
var activeSkeleton;
var msg;

function getUrlParam(){
	var url = window.location.href;
	url = url.split("?")[1];
	if(url === undefined){
		return;
	}
	var paramList = url.split("&");
	if(paramList.length > 2 || paramList.length < 1){
		return;
	}
	for(i in nameList){
		var skeletonName = nameList[i];
		if(paramList[0] === nameList[i]){
			chosenSkeleton = paramList[0];
			if(paramList[1] != undefined){
				chosenAnimation = paramList[1];
			}
			break;
		}
	}
}
function setUrlParam(){
	var url = window.location.href;
	url = url.split("?")[0];
	url += "?" + $("#skeletonList option:selected").text() + "&" + $("#animationList option:selected").text();
	return url;
}
function checkMobile() {
	if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		return true;
	} else {
		return false;
	}
}
function setupUI () {
	//set options
	var skeletonList = $("#skeletonList");
	for (var i in nameList) {
		var skeletonName = nameList[i];
		var option = $("<option></option>").attr("value", skeletonName).text(skeletonName);
		if (skeletonName === chosenSkeleton) option.attr("selected", "selected");
		skeletonList.append(option);
	}
	skeletonList.change(function() {
		choose($("#skeletonList option:selected").text());
	})
	$.getJSON(byJsonUrl, function(data){
		byJsonList = eval(data);
	})

	//Selectable searchbox
	$(function(){
		$("#skeletonBox").attr("value", chosenSkeleton);
		$(document).bind("click", function(e) {
			var e = e || window.event;
	        var elem = e.target || e.srcElement;
	        while (elem) {
	            if (elem.id && (elem.id == "skeletonList" || elem.id == "skeletonBox")) {
	            	return;
	            }
                elem = elem.parentNode;
			}
			$("#skeletonList").css("display", "none");
		});
	})
	$("#skeletonList").bind("change", function(){
		$(this).prev("input").val($(this).find("option:selected").text());
		$("#skeletonList").css("display", "none");
	})
	$("#skeletonBox").bind("focus", function(){
		$("#skeletonList").css("display", "");
	})
	$("#skeletonBox").bind("input", function(){
		var skeletonList = $("#skeletonList");
		skeletonList.html("");
		for(i in nameList){
			var skeletonName = nameList[i];
			if(skeletonName.substring(0, this.value.length).indexOf(this.value) == 0){
				var option = $("<option></option>").attr("value", skeletonName).text(skeletonName);
				if (skeletonName === chosenSkeleton) option.attr("selected", "selected");
				skeletonList.append(option);
			}
		}
	})

	//set share method
	$("#share").bind("click", function(){
		var url = setUrlParam();
		var input = $("<input>").attr("value", url).attr("readonly", "readonly");
		$("body").append(input);
		input.select();
		document.execCommand("copy");
		input.remove();
	})
	$("#share").bind("mouseenter", function(){
		showMessage("点击左上分享按钮，即可将当前角色及动作分享给他人", 4000);
	})
	$("#share").bind("click", function(){
		showMessage("链接已复制至剪贴板", 1000);
	})
}
function showMessage(text, delay){
	if(msg === undefined){
		msg = $("<div></div>").attr("class", "message");
		$("body").append(msg);
	}
	if(msg.css("display") != "none"){
		msg.finish();
	}
	msg.html(text);
	msg.fadeIn(500).delay(delay).fadeOut(500);
}
function init(){
	isMobile = checkMobile();
	showMessage("点击左上分享按钮，即可将当前角色及动作分享给他人", 4000);
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
	//load name list.
	$.getJSON(nameUrl, function(data){
		nameList = eval(data);

		getUrlParam();
		setupUI();
		loadAsset(chosenSkeleton);
		
		requestAnimationFrame(load);
	})
}
function loadAsset(name){
	if(byJson){
		assetManager.loadText("assets/AL/" + name + "/" + name + ".json");
	} else {
		assetManager.loadBinary("assets/AL/" + name + "/" + name + ".skel");
	}
	assetManager.loadTextureAtlas("assets/AL/" + name + "/" + name + ".atlas");
}
function choose(name){
	if(name === chosenSkeleton){
		return;
	} 
	for(i in byJsonList){
		if(name === byJsonList[i]){
			byJson = true;
			break;
		}
	}
	loadAsset(name);
	change = true;
	chosenSkeleton = name;
}
function load() {
	loading.style.display = "";
	// Wait until the AssetManager has loaded all resources, then load the skeletons.
	if (assetManager.isLoadingComplete()) {
		activeSkeleton = loadSkeleton(chosenSkeleton, chosenAnimation, false);
		change = false;
		byJson = false;
		chosenAnimation = "normal";
		setupAnimationUI();
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
	var skeletonData;
	if(byJson){
		var skeletonJson = new spine.SkeletonJson(atlasLoader);
		skeletonData = skeletonJson.readSkeletonData(assetManager.get("assets/AL/" + name + "/" + name + ".json"));
	} else {
		skeletonData = skeletonBinary.readSkeletonData(assetManager.get("assets/AL/" + name + "/" + name + ".skel"));
	}
	var skeleton = new spine.Skeleton(skeletonData);
	skeleton.setSkinByName(skin);
	var bounds = calculateBounds(skeleton);
	// Create an AnimationState, and set the initial animation in looping mode.
	animationStateData = new spine.AnimationStateData(skeleton.data);
	var animationState = new spine.AnimationState(animationStateData);
	if(skeleton.data.findAnimation(initialAnimation) == null){
		initialAnimation = skeleton.data.animations[0].name;
	}
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
function render () {
	loading.style.display = "none";
	if(change){
		load();
		return;
	}
	var now = Date.now() / 1000;
	var delta = now - lastFrameTime;
	lastFrameTime = now;
	// Update the MVP matrix to adjust for canvas size changes
	resize();
	gl.clearColor(0.5, 0.5, 0.5, 1);
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