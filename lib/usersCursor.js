/**
 * Interface to bulk user requests using cursor method of access.
 */
var mongoose = require('mongoose');
var dslogger = require('./dslogger');
var util = require('util');

// For debugging, consider using util to output objects with console.log
//    util = require('util');

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

  var conditions = {};
  var startTime = Date.now() / 1000;
  var pageSize = parseInt(request.query.pageSize);

  // Only return subscribed users or users who have not expressed a preference.
  if (request.query.includeUnsubscribed != 1) {
    conditions = {
      $or: [
        {"subscriptions.banned": {"$exists": false}},
        {"subscriptions.banned": false}
      ]
    };
  }

  // Limit results to specific source (affiliate / country code).
  if (request.query.source) {
    conditions['source'] = request.query.source;
  }

  // Only return users who have taken campaign actions.
  if (request.query.excludeNoCampaigns == 1) {
    conditions['campaigns'] = {$exists: true};
  }

  // Use direction parameter or the presence of min_id/max_id
  // parameters to define the direction of the paging
  // Decending
  if (request.query.min_id != undefined) {
    if (!mongoose.Types.ObjectId.isValid(request.query.min_id)) {
        response.send(400, 'Invalid "min_id" parameter.');
    }
    var direction = -1;
    conditions['_id'] = {$lt: mongoose.Types.ObjectId(request.query.min_id)};
  }
  // Assending
  else if (request.query.max_id != undefined) {
    if (!mongoose.Types.ObjectId.isValid(request.query.max_id)) {
      response.send(400, 'Invalid "max_id" parameter.');
    }
    var direction = 1;
    conditions['_id'] = {$gt: mongoose.Types.ObjectId(request.query.max_id)};
  }
  else if (request.query.direction === undefined) {
     var direction = 1;
  }
  else {
    var direction = parseInt(request.query.direction);
  }

  // Make these values available to the query callback.
  var refresh_url = request.protocol + '://' + request.get('host') + request.originalUrl;
  var data = {
    request: request,
    response: response,
    direction: direction,
    page_size: pageSize,
    source: request.query.source,
    refresh_url: refresh_url,
    start_time: startTime
  };
  
  // Execute the query.
  var query = self.docModel.find(conditions).limit(pageSize).sort({_id: direction});
  query.exec(function(err, docs) {
    if (err) {
      data.response.send(500, err);
      dslogger.error(err);
      return;
    }

    var min_id = docs[0]._id;
    var max_id = docs[docs.length - 1]._id;
    var document_count = docs.length;
    var previous_page_url = request.protocol + '://' + request.get('host') + request.path + '?type=realTime&max_id=' + min_id + '&page_size=' + data.page_size;
    var next_page_url = request.protocol + '://' + request.get('host') + request.path + '?type=realTime&min_id=' + max_id + '&page_size=' + data.page_size;
    var duration = (Date.now() / 1000) - data.start_time;

    var results = {
      meta: {
        min_id: min_id,
        max_id: max_id,
        direction: data.direction,
        page_size: data.pageSize,
        count: document_count,
        duration: duration,
        source: data.source,
        refresh_url: data.refresh_url,
        previous_page_url: previous_page_url,
        next_page_url: next_page_url
      },
      results: docs
    };

    data.response.send(results);
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
