var load = function (
	currentSkeleton = 'salatuojia',
	currentAnimation = 'normal',
	dir = './assets/spine/',
	nameUrl = './assets/names.json',
	byJsonUrl = './assets/byJson.json'
) {
	var isMobile;
	var lastFrameTime = Date.now() / 1000;
	var nameList;
	var byJsonList;
	var change = false;
	var byJson = false;
	var canvas;
	var shader;
	var batcher;
	var gl;
	var mvp = new spine.webgl.Matrix4();
	var assetManager;
	var skeletonRenderer;
	var debugRenderer;
	var shapes;
	var activeSkeleton = [];
	var scaling = 1.0;
	var offsetX = 0, offsetY = 0;
	var msg;

	var getUrlParam = function () {
		var url = window.location.href;
		url = url.split('?')[1];
		if (url === undefined) {
			return;
		}
		var paramList = url.split('&');
		if (paramList.length > 2 || paramList.length < 1) {
			return;
		}
		for (var i in nameList) {
			if (paramList[0] === nameList[i]) {
				currentSkeleton = paramList[0];
				if (paramList[1] != undefined) {
					currentAnimation = paramList[1];
				}
				break;
			}
		}
	}
	var setUrlParam = function () {
		var url = window.location.href;
		url = url.split('?')[0];
		url += '?' + $('#skeletonList option:selected').text() + '&' + $('#animationList option:selected').text();
		return url;
	}
	var checkMobile = function () {
		if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			return true;
		} else {
			return false;
		}
	}
	var setupUI = function () {
		// set options
		var skeletonList = $('#skeletonList');
		for (var skeletonName in nameList) {
			var option = $('<option></option>').attr('value', skeletonName).text(skeletonName);
			if (skeletonName === currentSkeleton) option.attr('selected', 'selected');
			skeletonList.append(option);
		}
		skeletonList.change(function () {
			choose($('#skeletonList option:selected').text());
		});
		if (byJsonUrl != '') {
			$.getJSON(byJsonUrl, function (data) {
				byJsonList = eval(data);
			});
		}

		// set selectable searchbox
		$(function () {
			$('#skeletonBox').attr('value', currentSkeleton);
			$(document).on('click', function (e) {
				e = e || window.event;
				var elem = e.target || e.srcElement;
				while (elem) {
					if (elem.id && (elem.id == 'skeletonList' || elem.id == 'skeletonBox')) {
						return;
					}
					elem = elem.parentNode;
				}
				$('#skeletonList').css('display', 'none');
			});
		});
		$('#skeletonList').on('change', function () {
			$(this).prev('input').val($(this).find('option:selected').text());
			$('#skeletonList').css('display', 'none');
		});
		$('#skeletonBox').on('focus', function () {
			$('#skeletonList').css('display', '');
		}).on('input', function () {
			var skeletonList = $('#skeletonList');
			skeletonList.html('');
			for (var skeletonName in nameList) {
				if (skeletonName.indexOf(this.value) != -1) {
					var option = $('<option></option>').attr('value', skeletonName).text(skeletonName);
					if (skeletonName === currentSkeleton) option.attr('selected', 'selected');
					skeletonList.append(option);
				}
			}
		});

		// set share method
		$('#share').on('click', function () {
			var url = setUrlParam();
			var input = $('<input>').attr('value', url).attr('readonly', 'readonly');
			$('body').append(input);
			input.select();
			document.execCommand('copy');
			input.remove();
			showMessage('链接已复制至剪贴板', 1000);
		});

		// set scale method
		$('#scaler').on('input', function () {
			scaling = 1.0 / this.value;
		});
		$('#canvas').on('wheel', function (e) {
			if (e.originalEvent.wheelDelta > 0) {
				scaling *= 0.9;
			}
			else {
				scaling *= 1.1;
			}
			if (scaling > 5.0) {
				scaling = 5.0;
			}
			if (scaling < 0.5) {
				scaling = 0.5;
			}
			$('#scaler').val(1.0 / scaling);
		});

		// set translate method
		$('#canvas').on('mousedown', function (e) {
			if (e.which != 1) {
				return;
			}
			var startX = e.clientX, startY = e.clientY;
			$(this).on('mousemove', function (e) {
				offsetX += e.clientX - startX, offsetY += e.clientY - startY;
				startX = e.clientX, startY = e.clientY;
			}).on('mouseup', function () {
				$(this).off('mousemove');
			});
		});

		// set reset method
		$('#reset').on('click', function () {
			resetTransform();
		});

		//set capture method
		$('#capture').on('click', function () {
			canvas.toBlob(function (blob) {
				var url = URL.createObjectURL(blob);
				$('#screenshot>img').attr('src', url);
			});
			$('#screenshot').css('display', 'block');
		});
		$('#screenshot').on('mousedown', function (e) {
			if (e.which == 1) {
				e.preventDefault();
				var sx, sy, ex, ey;
				sx = e.clientX, sy = e.clientY;
				$(this).css({
					'--sx': sx + 'px',
					'--sy': sy + 'px'
				}).on('mousemove', function (e) {
					ex = e.clientX, ey = e.clientY;
					$(this).css({
						'--ex': ex + 'px',
						'--ey': ey + 'px'
					});
				}).on('mouseup', function () {
					var cvs = $('<canvas></canvas>')[0];
					var ctx = cvs.getContext('2d');
					var dx = Math.abs(ex - sx), dy = Math.abs(ey - sy);
					cvs.width = dx, cvs.height = dy;
					ctx.drawImage($(this).children()[0], sx * 2, sy * 2, dx * 2, dy * 2, 0, 0, dx, dy);
					cvs.toBlob(function (blob) {
						var url = URL.createObjectURL(blob);
						var a = $('<a></a>').attr({
							'href': url,
							'download': currentSkeleton + '_' + currentAnimation
						});
						a[0].click();
					});
					showMessage('截图成功', 1000);
					$(this).attr('style', '').off('mousemove').off('mouseup');
				});
			}
			else if (e.which == 3) {
				$(this).css('display', 'none');
			}
		});
	}
	var resetTransform = function () {
		// reset scaler
		if (currentSkeleton.indexOf('_painting') != -1) {
			scaling = 2.0;
			$('#scaler').val('0.5');
		}
		else {
			scaling = 1.0;
			$('#scaler').val('1.0');
		}
		// reset translation
		offsetX = offsetY = 0;
	}
	var showMessage = function (text, delay) {
		if (msg === undefined) {
			msg = $('<div></div>').attr('class', 'message');
			$('body').append(msg);
		}
		if (msg.css('display') != 'none') {
			msg.finish();
		}
		msg.html(text);
		msg.fadeIn(500).delay(delay).fadeOut(500);
	}
	var init = function () {
		isMobile = checkMobile();
		showMessage('拖动鼠标以移动，点击左下角以重置', 4000);
		// Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
		// loading textures. That is handled separately by PolygonBatcher.
		canvas = document.getElementById('canvas');
		canvas.width = window.innerWidth * 2;
		canvas.height = window.innerHeight * 2;
		var config = { alpha: false, preserveDrawingBuffer: true };
		gl = canvas.getContext('webgl', config) || canvas.getContext('experimental-webgl', config);
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
		$.getJSON(nameUrl, function (data) {
			nameList = eval(data);

			getUrlParam();
			setupUI();

			loadAsset(currentSkeleton);

			requestAnimationFrame(load);
		});
	}
	var loadAsset = function (name) {
		for (var i in nameList[name]) {
			path = dir + name + '/' + nameList[name][i];
			if (byJson) {
				assetManager.loadText(path + '.json');
			} else {
				assetManager.loadBinary(path + '.skel');
			}
			assetManager.loadTextureAtlas(path + '.atlas');
		}
	}
	var choose = function (name) {
		if (name === currentSkeleton) {
			return;
		}
		for (var i in byJsonList) {
			if (name === byJsonList[i]) {
				byJson = true;
				break;
			}
		}
		loadAsset(name);
		change = true;
		currentSkeleton = name;
	}
	var load = function () {
		$('#loading').css('display', '');
		// Wait until the AssetManager has loaded all resources, then load the skeletons.
		if (assetManager.isLoadingComplete()) {
			activeSkeleton = [];
			for (var i in nameList[currentSkeleton]) {
				path = dir + currentSkeleton + '/' + nameList[currentSkeleton][i];
				if (currentSkeleton.indexOf('_painting') != -1) {
					activeSkeleton[i] = loadSkeleton(path, currentAnimation, true);
				}
				else {
					activeSkeleton[i] = loadSkeleton(path, currentAnimation, false);
				}
			}
			change = false;
			byJson = false;
			currentAnimation = 'normal';
			setupAnimationUI();
			requestAnimationFrame(render);
		} else {
			requestAnimationFrame(load);
		}
	}
	var loadSkeleton = function (path, initialAnimation, premultipliedAlpha, skin) {
		if (skin === undefined) skin = 'default';
		// Load the texture atlas using name.atlas from the AssetManager.
		var atlas = assetManager.get(path + '.atlas');
		// Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
		var atlasLoader = new spine.AtlasAttachmentLoader(atlas);
		// Create a SkeletonBinary instance for parsing the .skel file.
		// var skeletonBinary = new spine.SkeletonBinary(atlasLoader);
		var skeletonBinary = new spine.SkeletonBinary(atlasLoader);
		// Set the scale to apply during parsing, parse the file, and create a new skeleton.
		skeletonBinary.scale = 2;
		var skeletonData;
		if (byJson) {
			var skeletonJson = new spine.SkeletonJson(atlasLoader);
			skeletonData = skeletonJson.readSkeletonData(assetManager.get(path + '.json'));
		} else {
			skeletonData = skeletonBinary.readSkeletonData(assetManager.get(path + '.skel'));
		}
		var skeleton = new spine.Skeleton(skeletonData);
		skeleton.setSkinByName(skin);
		var bounds = calculateBounds(skeleton);
		// Create an AnimationState, and set the initial animation in looping mode.
		animationStateData = new spine.AnimationStateData(skeleton.data);
		var animationState = new spine.AnimationState(animationStateData);
		if (skeleton.data.findAnimation(initialAnimation) == null) {
			initialAnimation = skeleton.data.animations[0].name;
		}
		animationState.setAnimation(0, initialAnimation, true);
		// Pack everything up and return to caller.
		return { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
	}
	var calculateBounds = function (skeleton) {
		skeleton.setToSetupPose();
		skeleton.updateWorldTransform();
		var offset = new spine.Vector2();
		var size = new spine.Vector2();
		skeleton.getBounds(offset, size, []);
		return { offset: offset, size: size };
	}
	var setupAnimationUI = function () {
		var animationList = $('#animationList');
		animationList.empty();
		var skeleton = activeSkeleton[0].skeleton;
		var state = activeSkeleton[0].state;
		var activeAnimation = state.tracks[0].animation.name;
		for (var i = 0; i < skeleton.data.animations.length; i++) {
			var name = skeleton.data.animations[i].name;
			var option = $('<option></option>');
			option.attr('value', name).text(name);
			if (name === activeAnimation) option.attr('selected', 'selected');
			animationList.append(option);
		}
		animationList.change(function () {
			for (var i in activeSkeleton) {
				var state = activeSkeleton[i].state;
				var skeleton = activeSkeleton[i].skeleton;
				currentAnimation = $('#animationList option:selected').text();
				skeleton.setToSetupPose();
				state.setAnimation(0, currentAnimation, true);
			}
		});

		resetTransform();
	}
	var render = function () {
		loading.style.display = 'none';
		if (change) {
			requestAnimationFrame(load);
			return;
		}
		var now = Date.now() / 1000;
		var delta = now - lastFrameTime;
		lastFrameTime = now;
		// Update the MVP matrix to adjust for canvas size changes
		resize();
		gl.clearColor(0.5, 0.5, 0.5, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		// Apply the animation state based on the delta time.
		for (var i in activeSkeleton) {
			var state = activeSkeleton[i].state;
			var skeleton = activeSkeleton[i].skeleton;
			var bounds = activeSkeleton[i].bounds;
			var premultipliedAlpha = activeSkeleton[i].premultipliedAlpha;
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
		}
		requestAnimationFrame(render);
	}
	var resize = function () {
		var w = canvas.clientWidth;
		var h = canvas.clientHeight;
		var bounds = activeSkeleton[0].bounds;
		if (canvas.width != w * 2 || canvas.height != h * 2) {
			canvas.width = w * 2;
			canvas.height = h * 2;
		}
		// magic
		var centerX = bounds.offset.x + bounds.size.x / 2;
		var centerY = bounds.offset.y + bounds.size.y / 2;
		// var scaleX = bounds.size.x / canvas.width;
		// var scaleY = bounds.size.y / canvas.height;
		// var scale = Math.max(scaleX, scaleY) * 1.2;
		var width = canvas.width * scaling;
		var height = canvas.height * scaling;
		mvp.ortho2d(centerX - offsetX * scaling * 2 - width / 2, centerY + offsetY * scaling * 2 - height / 2, width, height);
		gl.viewport(0, 0, canvas.width, canvas.height);
	}

	$(function () {
		init();
	});
}