goog.provide('waterfall.Source');
goog.require("goog.net.Jsonp");
goog.require('goog.Uri');
goog.require('goog.Uri.QueryData');
goog.require('goog.string');
goog.require('goog.date');
goog.require('goog.i18n.DateTimeParse');
goog.require('goog.i18n.DateTimeFormat');

waterfall.Source = function(sourceType, params) {
  this.sourceType = sourceType;
  this.params = params ? params : null;
  this.callback = null;
  window.waterfall_source = this;
};

waterfall.Source.prototype.grab = function() {
  if (this.sourceType == "queries") {
    this.grabQueries();
  } else if (this.sourceType == "tweets") {
    this.grabTweets();
  } else if (this.sourceType == "trends") {
    this.grabTrend();
  } else if (this.sourceType == "tweetsearch") {
    this.grabTweetSearch();
  } else {
    console.log("unknown source type");
  }
};

// Grab more content from twitter's public timeline.
waterfall.Source.prototype.grabTweetSearch = function() {
  var twitter_search_base = 'http://search.twitter.com/search.json';
  var uri = new goog.Uri(twitter_search_base);
  var query = new goog.Uri.QueryData();
  var q = this.params.q ? this.params.q : 'google';
  var page = this.params.page ? this.params.page : 1;
  query.extend({
    'callback': 'waterfall_source.updateTweetSearch',
    'seed': Math.random(),    
    'rpp': 20,
    'page': page,
    'q': q,
  });
  // increment page count.
  this.params.page = page + 1;
  //
  uri.setQueryData(query);
  var request = new goog.net.Jsonp(uri.toString(), null);
  request.send();
};

// Grab more content from twitter's public timeline.
waterfall.Source.prototype.grabTweets = function() {
  var twitter_search_base = 'http://twitter.com/statuses/public_timeline';
  var uri = new goog.Uri(twitter_search_base);
  var query = new goog.Uri.QueryData();
  query.extend({
    'callback': 'waterfall_source.updateTweets',
    'seed': Math.random(),    
  });  //
  uri.setQueryData(query);
  var request = new goog.net.Jsonp(uri.toString(), null);
  request.send();
};

// Grab more content from twitter's search trends.
waterfall.Source.prototype.grabTrend = function() {
  var twitter_search_base = 'http://search.twitter.com/trends/current.json';
  var uri = new goog.Uri(twitter_search_base);
  var query = new goog.Uri.QueryData();
  query.extend({
    'callback': 'waterfall_source.updateTrend',
    'seed': Math.random(),
  });
  uri.setQueryData(query);
  var request = new goog.net.Jsonp(uri.toString(), null);
  request.send();
};

// Grab more content from twitter's search trends.
waterfall.Source.prototype.grabQueries = function() {
  var queries_base = 'http://qoov.i.corp.google.com:9000/';
  var uri = new goog.Uri(queries_base);
  var query = new goog.Uri.QueryData();
  query.extend({
    'callback': 'waterfall_source.updateQueries',
    'seed': Math.random(),    
  });
  uri.setQueryData(query);
  var request = new goog.net.Jsonp(uri.toString(), null);
  request.send();
};

// Update the queries list from twitter's search trends.
waterfall.Source.prototype.updateTrend = function(response) {
  if (response && response.trends) {
    console.log(response.trends);    
    for (var timestamp in response.trends) {
      var current_trends = response.trends[timestamp];
      for (var i in current_trends) {
        this.callback({
          'text':  goog.string.unescapeEntities(current_trends[i].name),
          'subtext': '#',
          'rank': this.autoRank(current_trends[i].name),
        });
      }
    }
  }
};

waterfall.Source.prototype.timeSince = function(datetime) {
  var time_since = (new Date()) - datetime;  // in ms
  var interval = new goog.date.Interval(
    Math.floor(time_since / (3600000 * 24 * 365)),  // year
    Math.floor(time_since / (3600000 * 24 * 31)) % 12,  // months
    Math.floor(time_since / (3600000 * 24)) % 31,  // days
    Math.floor(time_since / 3600000) % 24,  // hours 
    Math.floor(time_since / 60000) % 60,  // minutes
    Math.floor(time_since / 1000) % 60);  // seconds
  var since_string = 'now';
  if (interval.years) {
    since_string = interval.years + ' years ago';
  } else if (interval.months) {
    since_string = interval.months + ' months ago';
  } else if (interval.days) {
    since_string = interval.days + ' days ago';
  } else if (interval.hours) {
    since_string = interval.hours + ' hours ago';
  } else if (interval.minutes) {
    since_string = interval.minutes + ' minutes ago';
  } else if (interval.seconds) {
    since_string = interval.seconds + ' seconds ago';
  }
  return since_string;
};

// Update the queries list from twitter's public timeline.
waterfall.Source.prototype.updateTweetSearch = function(response) {
  if (response) {
    var tags = /<.*?>/gi;
    var reverse_results = response.results.reverse();
    for (var i in reverse_results) {
      var status = reverse_results[i];
      var subtext = status.from_user;
      // work out the time since.
      var time_since = this.timeSince(new Date(status.created_at));
      subtext = subtext + ', ' + time_since;
      this.callback({
        'text':  goog.string.unescapeEntities(status.text), 
        'subtext': subtext,
        'image': status.profile_image_url,
        'rank': this.tweetRank(status.from_user),
      });
    }
  }
};

// Update the queries list from twitter's public timeline.
waterfall.Source.prototype.updateTweets = function(response) {
  console.log("got response");
  if (response) {
    var tags = /<.*?>/gi;
    for (var i in response) {
      var status = response[i];
      var subtext = status.user.screen_name;
      // work out the time since.
      var time_since = this.timeSince(new Date(status.created_at));
      subtext = subtext + ', ' + time_since;
      this.callback({
        'text':  goog.string.unescapeEntities(status.text), 
        'subtext': subtext,
        'image': status.user.profile_image_url,
        'rank': this.tweetRank(status.user.screen_name),
      });
    }
  }
};

// Update the queries list from twitter's public timeline.
waterfall.Source.prototype.updateQueries = function(response) {
  if (response) {
    for (var i in response) {
      var platform_query = response[i];
      this.callback({
        'text':  platform_query[1],
        'subtext': platform_query[0],
        'rank': this.uttRank(platform_query[0]),
      });
    }
  }
};


// Guess the "rank" by the length of the text.
waterfall.Source.prototype.autoRank = function(text) {
  return Math.floor(Math.min(text.length / 4, 4));
};

waterfall.Source.prototype.tweetRank = function(text) {
  return Math.floor(Math.min((text.length - 2) / 3, 4));
};

waterfall.Source.prototype.uttRank = function(platform) {
  if (platform == "iPhone") {
    return 0;
  } else if (platform == "Symbian") {
    return 1;
  } else if (platform == "BlackBerry") {
    return 2;
  } else {
    return 4;
  }
}