/**
 * Interface to bulk user requests.
 */
var dslogger = require('./dslogger');

// For debugging, consider using util to output objects with console.log
//    util = require('util');

// Initialize logger.
var logToConsole = false;
dslogger.init('mb-users-api-server', logToConsole);

/**
 * Users constructor.
 *
 * @parm model
 *   The model of the user document.
 */
function Users(model) {
  this.docModel = model;

  this.defaults = {
    limit: 100,
    pageSize: 100
  };
}

/**
 * Basic GET to retrieve all users. Supports pagination and limiting the number
 * of results returned.
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

  var usingCustomPage = false,
      usingCustomPageSize = false,
      usingCustomLimit = false;

  // Page number. Can't be set to less than 1.
  var page = 1;
  if (request.query.page) {
    usingCustomPage = true;
    var requestPage = parseInt(request.query.page);
    page = requestPage < 1 ? 1 : requestPage;
  }

  // Page size.
  var pageSize = self.defaults.pageSize;
  if (request.query.pageSize) {
    usingCustomPageSize = true;
    pageSize = parseInt(request.query.pageSize);
  }

  // Determine skip value based on page and page size.
  var skip = (page - 1) * pageSize;

  // Limit how many docs get returned from the query. Separate from page logic.
  var limit = self.defaults.limit;
  if (request.query.limit) {
    usingCustomLimit = true;
    limit = parseInt(request.query.limit);
  }

  // Don't allow requests that specify 'pageSize' but not 'page'
  if (usingCustomPageSize && !usingCustomPage) {
    response.send(400, 'Need to also set the "page" param when setting the "pageSize"');
    return;
  }

  // If page size is set, but no custom limit, then set the limit to equal the page size.
  // ex: /users?page=1&pageSize=100
  if (usingCustomPageSize && !usingCustomLimit) {
    limit = pageSize;
  }
  // If both the page size and limit is set, then just make sure the number of
  // returned docs is no greater than the page size.
  // ex: /users?page=1&pageSize=100&limit=200
  else if (usingCustomPageSize && usingCustomLimit && limit > pageSize) {
      limit = pageSize;
  }

  // Make these values available to the query callback.
  var data = {
    request: request,
    response: response,
    page: page,
    pageSize: pageSize,
    limit: limit
  };

  // Execute the query.
  var query = self.docModel.find(conditions).skip(skip).limit(limit).sort({email: -1});
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
 * Retrieves users based on their birthday.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 * @param self
 *   Reference to the Users object that'll execute the query.
 */
var getByBirthdate = function(request, response, self) {
  var query = {};
  var birthdateSplit = request.query.birthdate.split('-');

  // First find docs that have a birthdate field.
  var matchBirthdateExists = {$match: {birthdate: {$exists: true}}};

  // Excluded addresses that have been banned
  var notBanned = {$match: {or: [
    {"subscriptions.banned": {$exists: false}},
    {"subscriptions.banned": false}
  ]}};

  // Select which fields to include from matched documents - extracting
  // month, day, and year values from the 'birthdate' field.
  var project = {$project: {
    month: {$month: '$birthdate'},
    day: {$dayOfMonth: '$birthdate'},
    year: {$year: '$birthdate'},
    drupal_uid: '$drupal_uid',
    email: '$email',
    source: '$source',
    first_name: '$first_name',
    last_name: '$last_name',
    subscribed: '$subscribed',
    subscriptions: '$subscriptions'
  }};

  // Find all users who share this birthday from any year.
  if (birthdateSplit.length == 2) {
    var queryMonth = parseInt(birthdateSplit[0]);
    var queryDay = parseInt(birthdateSplit[1]);

    // Find docs that match the birthdate query.
    var matchBday = {$match: {
      month: queryMonth,
      day: queryDay
    }};

    // Sort by year ascending.
    var sort = {$sort: {year: 1}};

    // Aggregate all the steps in the query var.
    query  = [
      matchBirthdateExists,
      project,
      matchBday,
      sort
    ];

  }
  // Find all users who share this birthday from the given year.
  else if (birthdateSplit.length == 3) {
    var queryMonth = parseInt(birthdateSplit[0]);
    var queryDay = parseInt(birthdateSplit[1]);
    var queryYear = parseInt(birthdateSplit[2]);

    // Find docs that match the birthdate query.
    var matchBday = {$match: {
      month: queryMonth,
      day: queryDay,
      year: queryYear
    }};

    // Aggregate all the steps in the query var.
    query  = [
      matchBirthdateExists,
      notBanned,
      project,
      matchBday
    ];

  }
  else {
    // Bad request. Respond with empty array.
    response.send(400, []);
    return;
  }

  // Add includeUnsubscribed=1 to the query will include unsubscribed users
  if (request.query.includeUnsubscribed == 1) {
    var user_events = {$match: {$or: [
      {"subscriptions.user_events": {$exists: false}},
      {"subscriptions.user_events": false}
    ]}};
  }
  else {
    var user_events = {$match: {$or: [
      {"subscriptions.user_events": {$exists: false}},
      {"subscriptions.user_events": true}
    ]}};
  }
  query.push(user_events);

  // Limit results to specific source (affiliate / country code).
  if (request.query.source) {
    var source = {$match: {source: request.query.source}};
    query.push(source);
  }

  var data = {
    request: request,
    response: response
  };

  // Execute the aggregate query.
  self.docModel.aggregate(query).exec(
    function(err, docs) {
      if (err) {
        data.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Send results
      data.response.send(docs);
    }
  );
};

/**
 * Retrieves users based on their Drupal registration date.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 * @param self
 *   Reference to the Users object that'll execute the query.
 */
var getByDrupalRegisterDate = function(request, response, self) {
  var query = {};
  var regDateSplit = request.query.drupal_register_date.split('-');

  // First find docs that have a drupal_register_date field.
  var matchRegDateExists = {$match: {drupal_register_date: {$exists: true}}};

  // Excluded addresses that have been banned
  var notBanned = {$match: {or: [
    {"subscriptions.banned": {$exists: false}},
    {"subscriptions.banned": false}
  ]}};

  // Select which fields to include from matched documents - extracting
  // month, day, and year values from the 'drupal_register_date' field.
  var project = {$project: {
    month: {$month: '$drupal_register_date'},
    day: {$dayOfMonth: '$drupal_register_date'},
    year: {$year: '$drupal_register_date'},
    drupal_uid: '$drupal_uid',
    email: '$email',
    source: '$source',
    first_name: '$first_name',
    last_name: '$last_name',
    subscribed: '$subscribed',
    subscriptions: '$subscriptions'
  }};

  // Find all users who share this drupal registration date from any year.
  if (regDateSplit.length == 2) {
    var queryMonth = parseInt(regDateSplit[0]);
    var queryDay = parseInt(regDateSplit[1]);

    // Find docs that match the drupal_register_date query.
    var matchRegDate = {$match: {
      month: queryMonth,
      day: queryDay
    }};

    // Sort by year ascending.
    var sort = {$sort: {year: 1}};

    // Aggregate all the steps in a query var.
    query  = [
      matchRegDateExists,
      project,
      matchRegDate,
      sort
    ];
  }
  // Find all users who share this drupal registration date from the given year.
  else if (regDateSplit.length == 3) {
    var queryMonth = parseInt(regDateSplit[0]);
    var queryDay = parseInt(regDateSplit[1]);
    var queryYear = parseInt(regDateSplit[2]);

    // Find docs that match the drupal_register_date query.
    var matchRegDate = {$match: {
      month: queryMonth,
      day: queryDay,
      year: queryYear
    }};

    // Aggregate all the steps in a query var.
    query  = [
      matchRegDateExists,
      notBanned,
      project,
      matchRegDate
    ];
  }
  else {
    // Bad request. Respond with empty array.
    response.send(400, []);
    return;
  }

  // Add includeUnsubscribed=1 to the query will include unsubscribed users
  if (request.query.includeUnsubscribed == 1) {
    var user_events = {$match: {$or: [
      {"subscriptions.user_events": {$exists: false}},
      {"subscriptions.user_events": false}
    ]}};
  }
  else {
    var user_events = {$match: {$or: [
      {"subscriptions.user_events": {$exists: false}},
      {"subscriptions.user_events": true}
    ]}};
  }
  query.push(user_events);

  // Limit results to specific ssource (affiliate / country code).
  if (request.query.source) {
    var source = {$match: {source: request.query.source}};
    query.push(source);
  }

  var data = {
    request: request,
    response: response
  };

  // Execute the aggregate query.
  self.docModel.aggregate(query).exec(
    function(err, docs) {
      if (err) {
        data.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Send results
      data.response.send(docs);
    }
  );
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
  if (request.query.birthdate) {
    getByBirthdate(request, response, this);
  }
  else if (request.query.drupal_register_date) {
    getByDrupalRegisterDate(request, response, this);
  }
  else {
    getAllUsers(request, response, this);
  }
};

// Export the Users class
module.exports = Users;
