goog.provide('waterfall.WaterFall');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require("goog.dom.pattern");
goog.require('goog.style');

goog.require('goog.fx');
goog.require('goog.fx.dom');

goog.require("goog.net.Jsonp");
goog.require('goog.Uri');
goog.require('goog.Uri.QueryData');

goog.require('goog.Timer');
goog.require('goog.Delay');

waterfall.WaterFall = function(source) {
  this.drops = goog.dom.$('drops');
  this.queries = [];
  this.ranks = ['sizzle', 'hot', 'warm', 'room', 'cold', 'freeze'];
  this.maxDrops = 20;
  this.timer = null;
  this.timerInterval = 3000;
  // when we run out of queries, we should re-grab some.
  this.lowWaterMark = 2;
  this.source = source;
  this.source.callback = this.addData;
};

// The waterfall run loop.
waterfall.WaterFall.prototype.run = function() {
  this.timer = new goog.Timer(this.timerInterval);
  this.timer.start();
  goog.events.listen(this.timer, goog.Timer.TICK, function() {
    wf.runOnce();
  });
};

// One iteration of the waterfall runloop.
waterfall.WaterFall.prototype.runOnce = function() {
  if (this.queries.length > 0) {
    var head = this.queries.pop();
    this.add(head.text, head.subtext, this.ranks[head.rank % this.ranks.length]);
  }
  // start fetching again if less than than the low water mark.
  if (this.queries.length == this.lowWaterMark) {
     this.source.grab();
   }
};

// Pause the runloop.
waterfall.WaterFall.prototype.pause = function() {
  this.timer.stop();
  this.timer = null;
};

// Toggle the runloop on and off.
waterfall.WaterFall.prototype.toggle = function() {
  if (this.timer) {
    this.pause();
  } else {
    this.run();
  }
};


// Add a new drop into the waterfall.
waterfall.WaterFall.prototype.add = function(text, country, rank) {
  var dropClass = 'droplet pop' + rank;
  var drop = goog.dom.createDom('div', {'class': dropClass, 'style': 'z-index: 0;'}, text);
  var suffix = goog.dom.createDom('span', {'class': 'country'}, country)
  goog.dom.appendChild(drop, suffix); 
  // Append drop.
  var topDrop = goog.dom.getFirstElementChild(this.drops);
  if (topDrop) {
    goog.dom.insertSiblingBefore(drop, topDrop);
  } else {
    goog.dom.appendChild(this.drops, drop);
  }
  var anim = new goog.fx.dom.FadeInAndShow(drop, 500);
  anim.play();
  
  // Kill older drops.
  var drops = this.drops.childNodes;
  for (var i = this.maxDrops; i < drops.length; i++) {
    goog.dom.removeNode(drops[i]);
  }
  
  // Experimenting with doing some post insert animation to make the text
  // look springy.
  drops = this.drops.childNodes;
  for (var i = 1; i < drops.length; i++) {
    goog.dom.classes.add(drops[i], 'droplet-spring');
    // Randomized duration to make it look messy
    var randomDuration = i * 0.05 + 0.25;
    goog.style.setStyle(drops[i], 'webkitAnimationDuration', randomDuration + 's');
    goog.style.setStyle(drops[i], 'zIndex', i);
  }
  
  // Unspring the css so it can animate again for the next round.
  var unspring = new goog.Delay(function() {
    var nodes = this.drops.childNodes;
    for (var i = 0; i < nodes.length; i++) {
      goog.dom.classes.remove(nodes[i], 'droplet-spring');
    }
    unspring.dispose();
  }, 1000)
  unspring.start();
};

// TODO(altse): shouldn't be prototype if it can't access this.
waterfall.WaterFall.prototype.addData = function(obj) {
  wf.queries.push(obj);
};

// The main function.
var wf = null;
function main() {
  wf = new waterfall.WaterFall(new waterfall.Source("queries"));
  wf.source.grab();
  wf.run();
}