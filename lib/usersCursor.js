/**
 * Interface to bulk user requests using cursor method of access.
 */
var mongoose = require('mongoose');
var async = require('async');
var dslogger = require('./dslogger');
var util = require('util');

// For debugging, consider using util to output objects with console.log
// util = require('util');
// console.log("/process request: " + util.inspect(request, false, null));

// Initialize logger.
dslogger.init('mb-users-api-server', false);

/**
 * Constructor to the User object.
 *
 * @param email
 *   The email of the user doc to execute commands on.
 * @param model
 *   The model of the user document.
 */
function UsersCursor(model) {
  this.docModel = model;
}

/**
 * GET to retrieve all users using cursor method for lookup. Cursor method suports
 * paged result from real time data where data set changes while bing pagged.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 * @param self
 *   Reference to the Users object that'll execute the query.
 */
var getAllUsers = function(request, response, self) {

  console.log('/users GET: ' + request.originalUrl);

  var conditions = {};
  var startTime = Math.floor(Date.now() / 1000);
  if (request.query.cursorStartTime) {
    var cursorStartTime = request.query.cursorStartTime;
  }
  else {
    var cursorStartTime = startTime;
  }
  var pageSize = parseInt(request.query.pageSize);
  if (request.query.page) {
    var page = request.query.page;
  }
  else {
    var page = 1;
  }

  // By default, only return non-banned users or users who have not expressed a preference.
  // This flag allows the inclusion of banned users.
  if (request.query.includeBanned != 1) {
    conditions['subscriptions.banned'] = {"$exists": false};
  }

  // By default, only return subscribed to digest users or users who have not expressed a preference.
  // This flag allows the inclusion of unsubscribed to digest users.
  if (request.query.includeUnsubscribed != 1) {
    conditions = {
      $or: [
        {"subscriptions.digest": {"$exists": false}},
        {"subscriptions.digest": false}
      ]
    };
  }

  // Limit results to specific source (affiliate / country code).
  if (request.query.source) {
    conditions['source'] = request.query.source;
  }

  // Only return users who have taken campaign actions, defaults to include users
  // with no campaign data.
  if (request.query.excludeNoCampaigns == 1) {
    conditions['campaigns'] = {$exists: true};
  }

  // Use direction parameter or the presence of min_id/max_id
  // parameters to define the direction of the paging

  // Decending - previous_page: min_id (of the current page) defines the starting id
  // to decend from
  if (typeof request.query.min_id != 'undefined') {
    if (!mongoose.Types.ObjectId.isValid(request.query.min_id)) {
        console.log('Invalid "min_id" parameter.');
        response.send(400, 'Invalid "min_id" parameter.');
    }
    var direction = -1;
    conditions['_id'] = {$lt: mongoose.Types.ObjectId(request.query.min_id)};
  }
  // Assending - next_page: max_id (of the current page) defines the starting id
  // to assend from
  else if (typeof request.query.max_id != 'undefined') {
    if (!mongoose.Types.ObjectId.isValid(request.query.max_id)) {
      console.log('Invalid "max_id" parameter.');
      response.send(400, 'Invalid "max_id" parameter.');
    }
    var direction = 1;
    conditions['_id'] = {$gt: mongoose.Types.ObjectId(request.query.max_id)};
  }
  else if (typeof request.query.direction === 'undefined') {
     var direction = 1;
  }
  else {
    var direction = parseInt(request.query.direction);
  }

  // Make these values available to the query callback.
  var refresh_url = request.originalUrl;
  
  var responseData = {
    meta: {
      direction: direction,
      page: page,
      page_size: pageSize,
      source: request.query.source,
      refresh_url: refresh_url,
      start_time: startTime,
      cursor_start_time: cursorStartTime
    }
  };

  // http://www.sebastianseilund.com/nodejs-async-in-practice
  async.parallel({

    collection_min_id: function(cbMinID) {

      // Lookup the collection min _id value if not included in query
      if (typeof request.query.collection_min_id === 'undefined') {

        console.log('Looking up collection min _id');
        var query = self.docModel.find().limit(1).sort({_id: 1});
        query.exec(function(err, firstDoc) {
          if (err) {
            console.log("Min query failed");
            data.response.send(500, err);
            dslogger.error(err);
            return;
          }

          responseData.meta.collection_min_id = firstDoc[0]._id;
          cbMinID();
        });

      }
      // Use value provided in request
      else {
        responseData.meta.collection_min_id = request.query.collection_max_id;
        cbMinID();
      }

    },

    collection_max_id: function(cbMaxID) {

      if (typeof request.query.collection_max_id === 'undefined') {

        console.log('Looking up collection max _id');
        var query = self.docModel.find().limit(1).sort({_id: -1});
        query.exec(function(err, firstDoc) {
          if (err) {
            console.log("Max query failed");
            data.response.send(500, err);
            dslogger.error(err);
            return;
          }

          responseData.meta.collection_max_id = firstDoc[0]._id;
          cbMaxID();
        });

      }
      else {
        responseData.meta.collection_max_id = request.query.collection_max_id;
        cbMaxID();
      }

    },

    page: function(cbPage) {

      console.log('Looking up page docs');
      var query = self.docModel.find(conditions).limit(pageSize).sort({_id: direction});
      query.exec(function(err, docs) {
        if (err) {
          console.log("Docs query failed");
          data.response.send(500, err);
          dslogger.error(err);
          return;
        }

        responseData.meta.min_id = docs[0]._id;
        responseData.meta.max_id = docs[docs.length - 1]._id;
        responseData.meta.document_count = docs.length;

        responseData.results = docs;
        cbPage();
      });

    }
  },
  function(err, queriesResult) {
    if (err) return next(err);
    // queriesResult is now equals to: {collection_min_id: xxx, collection_max_id: xxx}

    // Convert to string via +'' - thanks Joe
    if (responseData.meta.min_id+'' != responseData.meta.collection_min_id+'') {
      var previous_page_url = request.path + '?' +
        'type=cursor&min_id=' + responseData.meta.min_id +
        '&page=' + (parseInt(responseData.meta.page,10) + 1) +
        '&pageSize=' + responseData.meta.page_size;

      // @todo: DRY
      // Optional params
      if (!(typeof request.query.excludeNoCampaigns === 'undefined')) {
        previous_page_url += '&excludeNoCampaigns=' + request.query.excludeNoCampaigns;
      }
      if (!(typeof request.query.includeBanned === 'undefined')) {
        previous_page_url += '&includeBanned=' + request.query.includeBanned;
      }
      if (!(typeof request.query.includeUnsubscribed === 'undefined')) {
        previous_page_url += '&includeUnsubscribed=' + request.query.includeUnsubscribed;
      }

      responseData.meta.previous_page_url = previous_page_url;
    }

    if (responseData.meta.max_id+'' != responseData.meta.collection_max_id+'') {
      var next_page_url = request.path + '?' +
        'type=cursor&max_id=' + responseData.meta.max_id +
        '&page=' + (parseInt(responseData.meta.page,10) + 1) +
        '&pageSize=' + responseData.meta.page_size;

      // @todo: DRY
      // Optional params
      if (!(typeof request.query.excludeNoCampaigns === 'undefined')) {
        next_page_url += '&excludeNoCampaigns=' + request.query.excludeNoCampaigns;
      }
      if (!(typeof request.query.includeBanned === 'undefined')) {
        next_page_url += '&includeBanned=' + request.query.includeBanned;
      }
      if (!(typeof request.query.includeUnsubscribed === 'undefined')) {
        next_page_url += '&includeUnsubscribed=' + request.query.includeUnsubscribed;
      }

      responseData.meta.next_page_url = next_page_url;
    }

    var duration = (Date.now() / 1000) - responseData.meta.start_time;
    responseData.meta.duration = duration;

    response.send(200, responseData);
    console.log('*BAM* 200 OK' + "\n");
  });

};

/**
 * Retrieve user documents using cursor method of lookup.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 */
UsersCursor.prototype.get = function(request, response) {
  if (request.query.type) {
    getAllUsers(request, response, this);
  }
};


module.exports = UsersCursor;
