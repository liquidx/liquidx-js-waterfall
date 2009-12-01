goog.provide('waterfall.DJ');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require("goog.dom.pattern");
goog.require('goog.style');
goog.require('goog.cssom');

goog.require('goog.fx');
goog.require('goog.fx.dom');
goog.require('goog.math');
goog.require('goog.Timer');
goog.require('goog.Delay');

waterfall.DJ = function(source) {
  this.timer = null;
  this.timerInterval = 10000;
  // color schemes from colourlovers.com
  //this.colors = ['#ed8282', '#ed9482', '#ebb181', '#edc482', '#aec499'];  // pastel fruit
  //this.colors = ['#FFDBEB', '#D9F6FF', '#FFF7DB', '#F2D9FF', '#D9FFE9'];  // pastel
  //this.colors = ['#FE4365', '#FC9D9A', '#F9CDAD', '#C8C8A9', '#83AF9B'];  // cute
  this.colors = ['#F2D9FF', '#4ECDC4', '#C7F464', '#FF6B6B', '#C44D58'];  // cheer up emo
  this.counter = 0;
  this.source = source;
  this.source.callback = this.addData;
  this.data = [];
  this.lowWaterMark = 2;
  
  // cover mode.
  this.coverCount = 0;
  var size = goog.style.getContentBoxSize(goog.dom.getElement('djcanvas'));
  this.center = {'left': size.width/2, 'top': size.height/2};
  this.origin = {'left': size.width/2, 'top': size.height/2};
  this.coverSize = {'width': size.width * 2 / 3, 'height': size.height * 2 / 3 };
  this.extents = {'north': 0, 'south': 0, 'east': 0, 'west': 0};
  // TODO(altse): figure out the dimensions of the screen and modify the cssom.
  this.resetCss();
};

waterfall.DJ.prototype.resetCss = function() {
  var windowHeight = window.innerHeight;
  var windowWidth = window.innerWidth;
  this.fontSize = Math.floor(windowHeight / 13);
};

waterfall.DJ.prototype.addData = function(obj) {
  dj.data.push(obj);
};

waterfall.DJ.prototype.run = function() {
  dj.rotateBackground();
  this.timer = new goog.Timer(this.timerInterval);
  this.timer.start();
  goog.events.listen(this.timer, goog.Timer.TICK, function() {
    dj.runOnce();
  });
};

waterfall.DJ.prototype.runOnce = function() {
  this.rotateBackground();
  
  if (this.data.length > 0) {
    var head = this.data.pop();
    //this.fadeIn(head.text);
    this.addPuzzle(head.text, head.subtext, head.image);
  }
  // start fetching again if less than than the low water mark.
  if (this.data.length == this.lowWaterMark) {
     this.source.grab();
   }
};

waterfall.DJ.prototype.rotateBackground = function() {
  goog.style.setStyle(document.body, 'backgroundColor', this.colors[this.counter]);
  this.counter = (this.counter + 1) % this.colors.length;
};

waterfall.DJ.prototype.fadeIn = function(text) {
  var canvas = goog.dom.getElement('djcanvas');

  // fade out old canvas nodes
  var nodes = canvas.childNodes;
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].style) {
      goog.dom.classes.remove(nodes[i], 'rotatein');
      goog.dom.classes.add(nodes[i], 'rotateout');
    }
  }

  // remove the nodes after animation.
  var removeTimer = new goog.Delay(function() {
    for (var i = 0; i < nodes.length; i++) {
      goog.dom.removeNode(nodes[i]);
    }
    removeTimer.dispose();
  }, 2000)
  removeTimer.start();  
  
  var track = goog.dom.createDom('div', {'class': 'track'}, text);
  goog.dom.appendChild(canvas, track);
  
  // fade in after 0.5s
  var fadeTimer = new goog.Delay(function() {
    goog.dom.classes.add(track, 'rotatein');
    fadeTimer.dispose();
  }, 100);
  fadeTimer.start();  
};

waterfall.DJ.prototype.addPuzzle = function(text, subtext, image) {
  var canvas = goog.dom.getElement('djcanvas');
  
  // Reset after 16.
  if (this.coverCount >= 16) {
    this.coverCount = 0;
    goog.dom.removeChildren(canvas);
    this.extents['north'] = 0;
    this.extents['south'] = 0;
    this.extents['east'] = 0;
    this.extents['west'] = 0;
  }
  
  
  var cover = goog.dom.createDom('div', {'class': 'cover cover-fadeout'}, text);
  if (subtext) {
    var caption = goog.dom.createDom('div', {'class': 'caption'});
    if (image) {
      var icon = goog.dom.createDom('img', {'src': image, 'alt': '', 'class': 'icon'});
      goog.dom.appendChild(caption, icon);
    }
    goog.dom.appendChild(caption, goog.dom.createTextNode(subtext));
    goog.dom.appendChild(cover, caption);    
  }
  
  goog.dom.appendChild(canvas, cover);

  // Place the puzzle piece
  var round = Math.floor(this.coverCount / 4);
  var position = this.coverCount % 4;  // n,s,e,w
  var angle = position * 90;
  var height = this.coverSize.height;
  var width = this.coverSize.width;
  var offset = {'left': 0, 'top': 0};
  var vertPadding = 10;

  goog.style.setStyle(cover, {
    'width': width + 'px',
    'fontSize': this.fontSize + 'px',
    'lineHeight': '1.0em'
  });
  var contentSize = goog.style.getBorderBoxSize(cover);
  
  switch (position) {
    case 0:  // south
      this.origin['left'] = this.center['left'];
      this.origin['top'] = this.center['top'] + this.extents['south'];
      offset['left'] = -contentSize.width / 3;
      offset['top'] = -contentSize.height / 2;
      this.extents['south'] = this.extents['south'] + contentSize.height + vertPadding;
      break;
    case 1:  // west
      this.origin['left'] = this.center['left'] - this.extents['west'];
      this.origin['top'] = this.center['top'];
      offset['left'] = contentSize.height / 2;
      offset['top'] = -contentSize.width / 3;
      this.extents['west'] = this.extents['west'] + contentSize.height + vertPadding;
      break;
    case 2:
      this.origin['left'] = this.center['left'];
      this.origin['top'] = this.center['top'] - this.extents['north'];
      offset['left'] = contentSize.width / 3;
      offset['top'] = contentSize.height / 2;      
      this.extents['north'] = this.extents['north'] + contentSize.height + vertPadding;
      break;
    case 3:
      this.origin['left'] = this.center['left'] + this.extents['east'];
      this.origin['top'] = this.center['top'];
      offset['left'] = -contentSize.height / 2;
      offset['top'] = contentSize.width / 3;
      this.extents['east'] = this.extents['east'] + contentSize.height + vertPadding;
      break;
    default:
      break;
  }
  goog.style.setStyle(cover, {
    'left': this.origin['left'] + 'px',
    'top':  this.origin['top'] + 'px',
    'webkitTransform': 'rotate(' + angle + 'deg)',
    'webkitTransitionDelay': Math.floor(this.timerInterval/1000) + 's',
  });

  // fade out the cover right now so that when the animation finishes
  // it ends in the correct state.
  goog.events.listen(cover, 'webkitAnimationStart', function() {
    goog.style.setStyle(cover, {'opacity': '0.3'});
  });

  // zoom and rotate view port.
  var transform = {
     'left':  this.center['left'] - this.origin['left'],
     'top': this.center['top'] - this.origin['top'],
  };
  goog.style.setStyle(canvas, 'webkitTransform',
    'rotate(' + (360 - angle) + 'deg)' + 
    'translate(' + transform.left + 'px, ' + transform.top + 'px) ' +
    'translate(' + offset.left + 'px,' + offset.top + 'px)');
  
  // increment
  this.coverCount++;
};

// Pause the runloop.
waterfall.DJ.prototype.pause = function() {
  this.timer.stop();
  this.timer = null;
};

// Toggle the runloop on and off.
waterfall.DJ.prototype.toggle = function() {
  if (this.timer) {
    this.pause();
  } else {
    this.run();
  }
};


// The main function.
var dj = null;
function main() {
  var params = {'q': 'google mobile app'};
  if (window.location.hash) {
    params['q'] = decodeURIComponent(window.location.hash.slice(1));
  }
  dj = new waterfall.DJ(new waterfall.Source("tweetsearch", params));
  dj.source.grab();
  dj.run();
}