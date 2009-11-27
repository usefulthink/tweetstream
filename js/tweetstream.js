jQuery(function($) {
	// provide some stubs if firebug isn't available
	if(typeof(console) === 'undefined') {
		var f = function() {};
		console = { log: f, dir: f };
	}
	
	// Note: if subsequent searches have more than 100 results, some of the
	//   entries will be skipped...
	// Another Note: with 4 seconds per tweet, a maximum of 15 tweets per
	//   minute can be displayed. Streams that exceed this frequency will
	//   currently lead to ever increasing memory-usage for buffering the
	//   tweets. Also an issue to be worked on...
	var twitter = {
		SEARCH_INTETRVAL : 30000,
		SEARCH_TERM : '',
		SEARCH_URL_FORMAT : "http://search.twitter.com/search.json"
				+ "?q={q}&rpp=100&since_id={sinceId}&callback=?",
		
		_searchTimer : null,
		_sinceId : 0,
		
		tweets : [],
		
		startSearching : function(searchTerm) {
			if(twitter._searchTimer !== null) return;
			
			console.log('twitter.startSearching(' +  + ')');
			twitter.SEARCH_TERM = searchTerm;
			twitter.search();
			twitter._searchTimer = window.setInterval(twitter.search, twitter.SEARCH_INTETRVAL);
		},
		
		stopSearching : function() {
			console.log('twitter.restartSearching()');
			window.clearInterval(twitter._searchTimer);
			twitter._searchTimer = null;
			twitter._sinceId = 0;
		},
		
		search : function() {
			console.log('twitter.search()');
			twitter._doSearch(twitter.SEARCH_TERM, twitter._sinceId, function(data) {
				console.dir({r: data});
				twitter._sinceId = data.max_id;
				jQuery.each(data.results.reverse(), function() {
					var date  = new Date(this.created_at);
					var author = '@' + this.from_user;
					var profileImage = this.profile_image_url;
					var message = this.text;
					var timestamp = "am " + date.toLocaleDateString() + " um " + date.toLocaleTimeString() + " Uhr";
					
					twitter.tweets.unshift([message, author, timestamp, profileImage]);
				});
				
				updater.start();
			});			
		},
		
		_doSearch : function(q, sinceId, callback) {
			console.log('twitter._doSearch()');
			var url = twitter.SEARCH_URL_FORMAT
					.replace('{q}', escape(q))
					.replace('{sinceId}', sinceId);
			$.getJSON(url, function(response) {
				if(typeof callback == 'function') {
					callback.call(this, response);
				}
			});
		}
	};
	
	var updater = {
		UPDATE_INTERVAL : 4000,
		
		_timer : null,
		_runCount : 0,
		_nothingNewCount : 0,
		_tweetTemplate : $('.tweet.template').remove().removeClass('template'),

		start : function() {
			console.log('updater::start()');
			if(updater._timer !== null) return;
			
			updater._nextTweet();
			updater._timer = window.setInterval(updater._nextTweet, updater.UPDATE_INTERVAL);
		},
		
		stop : function() {
			console.log('updater::stop()');
			window.clearInterval(updater._timer);
			updater._timer = null;
		},
		
		_nextTweet : function () {
			console.log('updater::_nextTweet()');
			if(twitter.tweets.length == 0) {
				updater._nothingNewCount++;
				console.log('no new tweets');
				//console.log('no more tweets (' + updater._nothingNewCount + '/10)');
				
				if(updater._nothingNewCount > 80) {
					updater.stop();
					twitter.stopSearching();
					
					$('.tweet').fadeOut(5000, function() {
						$('.tweet').remove();
						twitter.startSearching();
					});
				}
				
				return;
			}
			
			++updater._runCount;
			if((updater._runCount % 5) == 0) {
				updater._cleanup();
			}

			var data = twitter.tweets.pop();
			updater._nothingNewCount = 0;
			updater._addTweet(data[0], data[1], data[2], data[3]);
		},
		
		_addTweet : function(message, author, timestamp, profileImage) {
			var newTweet = updater._tweetTemplate.clone();
			
			$('.message', newTweet).html(message);
			$('.author', newTweet).html(author);
			$('.timestamp', newTweet).html(timestamp);
			$('.image', newTweet).html(
					'<img src="'+profileImage+'" />');
			
			newTweet.children().css({visibility:'hidden'});
			newTweet.hide().addClass('colored t1').prependTo('.tweets').show(1000, function() {
				newTweet.children().hide().css({visibility:'visible'}).fadeIn(500);
			});
			
			// update color-classes
			var coloredTweets = $('.tweet.colored');
			coloredTweets.each(function(i) {
				var el = $(this);
				
				var currClass = el.attr('class').match(/t[1-7]/)[0];
				
				if(currClass == 't7') {
					el.removeClass('colored t7', 500);
				} else {
					var newClass = 't' + (i+1);
					if(newClass !== currClass) {
						el.switchClass(currClass, newClass, 500, function() {
							el.removeClass(currClass).addClass(newClass);
						});
					}
				}
			});
		},
		
		_cleanup : function() {
			console.log('updater::_cleanup()');
			$('.tweet').each(function() {
				if($(this).offset().top < 2000) { return true; }
				$(this).remove();
			});
		}
	};

	jQuery.twitter = twitter;
});
