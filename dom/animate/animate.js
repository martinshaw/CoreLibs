steal('jquery', 'jquery/dom/styles').then(function () {

	var animationNum = 0,
		//Animation events implies animations right?
		supportsAnimations = !!window.WebKitAnimationEvent,
		//gets the last editable stylesheet or creates one
		getLastStyleSheet = function () {
			var sheets = document.styleSheets,
				x = sheets.length - 1,
				foundSheet = null,
				style;

			while (x >= 0 && !foundSheet) {
				if (sheets[x].cssRules || sheets[x].rules) {
					//any stylesheet which we can access cssRules is good
					foundSheet = sheets[x];
				}
				x -= 1;
			}

			if (!foundSheet) {
				style = document.createElement('style');
				document.getElementsByTagName('head')[0].appendChild(style);
				if (!window.createPopup) { /* For Safari */
					style.appendChild(document.createTextNode(''));
				}
				foundSheet = sheets[sheets.length - 1];
			}

			return foundSheet;
		},

		//removes an animation rule from a sheet
		removeAnimation = function (sheet, name) {
			for (var j = sheet.cssRules.length - 1; j >= 0; j--) {
				var rule = sheet.cssRules[j];
				// 7 means the keyframe rule
				if (rule.type === 7 && rule.name == name) {
					sheet.deleteRule(j)
					return;
				}
			}
		},

		cssString = function(props) {
			var ret = '';
			$.each(props, function(prop, val) {
				ret += prop + ' : ' + val + ';';
			});
			return ret;
		},

		oldanimate = jQuery.fn.animate,
		oldCustom = jQuery.fx.prototype.custom,
		currentAnimation = null;

	jQuery.fx.prototype.custom = function( from, to, unit ) {
		if(supportsAnimations) {
			this.startTime = new Date().getTime();
			this.end = to;
			this.now = this.start = from;
			this.pos = this.state = 0;
			this.unit = unit || this.unit || ( jQuery.cssNumber[ this.prop ] ? "" : "px" );

			currentAnimation.properties.push(this.prop);
			currentAnimation.from[this.prop] = from + this.unit;
			currentAnimation.to[this.prop] = to + this.unit;

			if(this.options.hide !== currentAnimation.hide) {
				currentAnimation.hide = this.options.hide;
			}
			if(this.options.show !== currentAnimation.show) {
				currentAnimation.show = this.options.show;
			}
		} else {
			oldCustom.apply(this, arguments);
		}
	}

	/**
	 * @function jQuery.fn.animate
	 * @parent jQuery.animate
	 *
	 * Animate CSS properties using native CSS animations, if possible.
	 * Uses the original [jQuery.fn.animate()](http://api.jquery.com/animate/) otherwise.
	 *
	 * @param {Object} props The CSS properties to animate
	 * @param {Integer|String|Object} [speed=400] The animation duration in ms.
	 * Will use jQuery.fn.animate if a string or object is passed
	 * @param {Function} [callback] A callback to execute once the animation is complete
	 * @return {jQuery} The jQuery element
	 */

	jQuery.fn.animate = function (props, speed, easing, callback) {
		currentAnimation = {
			from : {},
			to : {},
			properties : []
		}

		var optall = jQuery.speed(speed, easing, callback);
		optall.queue = false;

		oldanimate.call(this, props, optall);
		// Store the original properties
		currentAnimation.original = $(this).styles.apply($(this), currentAnimation.properties);

		// Most of of these calls need to happen once per element
		this.each(function() {
			// Add everything to the animation queue
			jQuery(this).queue('fx', function() {
				var self = $(this),
					//the animation keyframe name
					animationName = "animate" + (animationNum++),
					// The key used to store the animation hook
					dataKey = animationName + '.run',
					// The last stylesheet
					lastSheet = getLastStyleSheet(),
					//the text for the keyframe
					style = "@-webkit-keyframes " + animationName + " { from {"
						+ cssString(currentAnimation.from) + "} to {"
						+ cssString(currentAnimation.to) + " }}",
					// The animation end event handler.
					// Will be called both on animation end and after calling .stop()
					animationEnd = function (styles, executeCallback) {
						// Hide the element if the "hide" operation was done
						if ( currentAnimation.hide ) {
							this.hide();
						}

						// Reset the properties, if the item has been hidden or shown
						if ( currentAnimation.hide || currentAnimation.show ) {
							this.css(currentAnimation.original);
						} else {
							this.css(this.styles.apply(this, currentAnimation.properties));
						}

						this.css({
							"-webkit-animation-duration" : "",
							"-webkit-animation-name" : "",
							"-webkit-animation-fill-mode" : ""
						});

						// remove the animation keyframe
						removeAnimation(lastSheet, animationName);
						// Remove .run data
						jQuery.removeData(self, dataKey, true);

						if (optall.complete && executeCallback) {
							// Call success, pass the DOM element as the reference
							optall.complete.apply(self[0])
						}
					}

				lastSheet.insertRule(style, lastSheet.cssRules.length);

				// Add a hook which will be called when the animation stops
				jQuery._data(this, dataKey, {
					stop : function(gotoEnd) {
						// Pause the animation
						self.css('-webkit-animation-play-state', 'paused');
						// Unbind the animation end handler
						self.off('webkitAnimationEnd', animationEnd);
						if(!gotoEnd) { // We were told not to finish the animation
							// Call animationEnd but set the CSS to the current computed style
							animationEnd.call(self, self.styles.apply(self, currentAnimation.properties), false);
						} else {
							// Finish animaion
							animationEnd.call(self, currentAnimation.to, true);
						}
					}
				});

				// set this element to point to that animation
				self.css({
					"-webkit-animation-duration" : optall.duration + "ms",
					"-webkit-animation-name" : animationName,
					"-webkit-animation-fill-mode" : "forwards"
				});

				self.one('webkitAnimationEnd', function() {
					// Call animationEnd using the current properties
					animationEnd.call(self, currentAnimation.to, true);
					self.dequeue();
				});
			});
		});

		return this;
	};
});
