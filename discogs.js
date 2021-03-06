var discogs = function() {

	var baseURL = 'http://api.discogs.com/';
	var queue = new Array();
	var throttle = null;

	return {

		request: function(reqid, url, success, fail) {

			for (var i in queue) {
				if (url == queue[i].url && reqid == queue[i].reqid) {
					debug.debug("DISCOGS","New request for",url,"is a duplicate");
					queue[i].dupes.push({reqid: reqid, url: url, success: success, fail: fail});
					return;
				}
			}
			queue.push( {flag: false, reqid: reqid, url: url, success: success, fail: fail, dupes: new Array()} );
			debug.debug("DISCOGS","New request",url,"throttle is",throttle,"length is",queue.length);
			if (throttle == null && queue.length == 1) {
				discogs.getrequest();
			}

		},

		getrequest: function() {

			var req = queue[0];
			clearTimeout(throttle);

            if (req !== undefined) {
            	if (req.flag) {
            		debug.error("DISCOGS","Request just pulled from queue is already being handled",req.url);
            		return;
            	}
				queue[0].flag = true;
				debug.debug("DISCOGS","Taking next request from queue",req.url);
		        $.jsonp({
		            url: req.url+"callback=?",
		            success: function(data) {
		            	debug.debug("DISCOGS", "Request Success");
	                	throttle = setTimeout(discogs.getrequest, 1500);
	                	req = queue.shift();
	                	if (data === null) {
		                	data = {error: "There was a network error or Discogs refused to reply"}
	                	}
	                	if (req.reqid != '') {
	                		data.id = req.reqid;
	                	}
		                if (data.error) {
		                    req.fail(data);
		                    for (var i in req.dupes) {
		                    	// If the request failed and there were duplicates, don't throw them away,
		                    	// stick them back on the queue as retries
		                    	discogs.request(req.dupes[i].reqid, req.dupes[i].url, req.dupes[i].success, req.dupes[i].fail);
		                    }
		                } else {
		                    req.success(data);
		                    for (var i in req.dupes) {
		                    	req.dupes[i].success(data);
		                    }
		                }
		            },
	                error: function(data) {
	                	throttle = setTimeout(discogs.getrequest, 1500);
	                	req = queue.shift();
	                	debug.warn("DISCOGS","Request failed",req,data);
	                	data = {error: "There was a network error or Discogs refused to reply"}
	                	if (req.reqid != '') {
	                		data.id = req.reqid;
	                	}
	                	req.fail(data);
	                    for (var i in req.dupes) {
	                    	discogs.request(req.dupes[i].reqid, req.dupes[i].url, req.dupes[i].success, req.dupes[i].fail);
	                    }
	                }
		        });
	        } else {
				throttle = null;
	        }
		},

		artist: {

			search: function(name, success, fail) {
				var url = baseURL+'database/search?type=artist&q='+name+'&';
				discogs.request('', url, success, fail);
			},

			getInfo: function(reqid, id, success, fail) {
				var url = baseURL+'artists/'+id+'?';
				discogs.request(reqid, url, success, fail);
			},

			getReleases: function(name, page, reqid, success, fail) {
				debug.log("DISCOGS","Get Artist Releases",name,page);
				var url = baseURL+'artists/'+name+'/releases?per_page=25&page='+page+'&';
				discogs.request(reqid, url, success, fail);
			}
		},

		album: {

			getInfo: function(reqid, id, success, fail) {
				// NOTE id must be either release/id or master/id
				var url = baseURL+id+'?';
				discogs.request(reqid, url, success, fail);
			},

			search: function(term, success, fail) {
				var url = baseURL+'database/search?type=master&q='+term+'&';
				discogs.request('', url, success, fail);
			}

		},

		track: {

			getInfo: function(reqid, id, success, fail) {
				// NOTE id must be either release/id or master/id
				var url = baseURL+id+'?';
				discogs.request(reqid, url, success, fail);
			},

			search: function(term, success, fail) {
				var url = baseURL+'database/search?type=master&q='+term+'&';
				discogs.request('', url, success, fail);
			}

		}


	}

}();