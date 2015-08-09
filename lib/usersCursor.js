/**
 * Interface to bulk user requests using cursor method of access.
 */
var dslogger = require('./dslogger');

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
  
  
  
  
  
  
  
  
  
  
    // Execute the query.
  var query = self.docModel.find(conditions).limit(limit).sort({_id: -1});
  query.exec(function(err, docs) {
    if (err) {
      data.response.send(500, err);
      dslogger.error(err);
      return;
    }

    var results = {
      page: data.page,
      pageSize: data.pageSize,
      limit: data.limit,
      results: docs
    };

    data.response.send(results);
  });

};

  /**
 * Retrieve user documents.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 */
Users.prototype.get = function(request, response) {
  if (request.query.type) {
    getAllUsers(request, response, this);
  }
};

module.exports = UsersCursor;
