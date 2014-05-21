/**
 * Interface to bulk user requests.
 */
var dslogger = require('./dslogger')
    ;

// Initialize logger.
dslogger.init('mb-users-api-server', false);

/**
 * Users constructor.
 *
 * @parm model
 *   The model of the user document.
 */
function Users(model) {
  this.docModel = model;
}

/**
 * Finds user documents that match the query critria in received request.
 *
 * @param req
 *   The request object in the GET callback.
 * @param res
 *   The response object in the GET callback.
 */
Users.prototype.get = function(req, res) {
  // Build the query based on the params received.
  var query = {};
  if (req.query.birthdate !== undefined) {
    var birthdateSplit = req.query.birthdate.split('-');

    // Find all users who share this birthday from any year.
    if (birthdateSplit.length == 2) {
      var queryMonth = parseInt(birthdateSplit[0]);
      var queryDay = parseInt(birthdateSplit[1]);

      // First find docs that have a birthdate field.
      var matchBirthdateExists = {$match: {birthdate: {$exists: 1}}};

      // Select which fields to include from matched documents - extracting
      // month, day, and year values from the 'birthdate' field.
      var project = {$project: {
        month: {$month: '$birthdate'},
        day: {$dayOfMonth: '$birthdate'},
        year: {$year: '$birthdate'},
        drupal_uid: '$drupal_uid',
        email: '$email',
        first_name: '$first_name',
        last_name: '$last_name',
        subscribed: '$subscribed'
      }};

      // Find docs that match the birthdate query.
      var matchBday = {$match: {
        month: queryMonth,
        day: queryDay
      }};

      // By default, only return users who are subscribed. Adding
      // includeUnsubscribed=1 to the query will include unsubscribed users.
      if (req.query.includeUnsubscribed != 1) {
        matchBday['$match']['$or'] = [
          {subscribed: {$exists: 0}},
          {subscribed: 1}
        ];
      }

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

      // First find docs that have a birthdate field.
      var matchBirthdateExists = {$match: {birthdate: {$exists: 1}}};

      // Select which fields to include from matched documents - extracting
      // month, day, and year values from the 'birthdate' field.
      var project = {$project: {
        month: {$month: '$birthdate'},
        day: {$dayOfMonth: '$birthdate'},
        year: {$year: '$birthdate'},
        drupal_uid: '$drupal_uid',
        email: '$email',
        first_name: '$first_name',
        last_name: '$last_name',
        subscribed: '$subscribed'
      }};

      // Find docs that match the birthdate query.
      var matchBday = {$match: {
        month: queryMonth,
        day: queryDay,
        year: queryYear
      }};

      // By default, only return users who are subscribed. Adding
      // includeUnsubscribed=1 to the query will include unsubscribed users.
      if (req.query.includeUnsubscribed != 1) {
        matchBday['$match']['$or'] = [
          {subscribed: {$exists: 0}},
          {subscribed: 1}
        ];
      }

      // Aggregate all the steps in the query var.
      query  = [
        matchBirthdateExists,
        project,
        matchBday
      ];
    }
    else {
      // Bad request. Respond with empty array.
      res.send(400, []);
      return;
    }
  }
  else if (req.query.drupal_register_date !== undefined) {
    var regDateSplit = req.query.drupal_register_date.split('-');

    // Find all users who share this drupal registration date from any year.
    if (regDateSplit.length == 2) {
      var queryMonth = parseInt(regDateSplit[0]);
      var queryDay = parseInt(regDateSplit[1]);

      // First find docs that have a drupal_register_date field.
      var matchRegDateExists = {$match: {drupal_register_date: {$exists: 1}}};

      // Select which fields to include from matched documents - extracting
      // month, day, and year values from the 'drupal_register_date' field.
      var project = {$project: {
        month: {$month: '$drupal_register_date'},
        day: {$dayOfMonth: '$drupal_register_date'},
        year: {$year: '$drupal_register_date'},
        drupal_uid: '$drupal_uid',
        email: '$email',
        first_name: '$first_name',
        last_name: '$last_name',
        subscribed: '$subscribed'
      }};

      // Find docs that match the drupal_register_date query.
      var matchRegDate = {$match: {
        month: queryMonth,
        day: queryDay
      }};

      // By default, only return users who are subscribed. Adding
      // includeUnsubscribed=1 to the query will include unsubscribed users.
      if (req.query.includeUnsubscribed != 1) {
        matchRegDate['$match']['$or'] = [
          {subscribed: {$exists: 0}},
          {subscribed: 1}
        ];
      }

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

      // First find docs that have a drupal_register_date field.
      var matchRegDateExists = {$match: {drupal_register_date: {$exists: 1}}};

      // Select which fields to include from matched documents - extracting
      // month, day, and year values from the 'drupal_register_date' field.
      var project = {$project: {
        month: {$month: '$drupal_register_date'},
        day: {$dayOfMonth: '$drupal_register_date'},
        year: {$year: '$drupal_register_date'},
        drupal_uid: '$drupal_uid',
        email: '$email',
        first_name: '$first_name',
        last_name: '$last_name',
        subscribed: '$subscribed'
      }};

      // Find docs that match the drupal_register_date query.
      var matchRegDate = {$match: {
        month: queryMonth,
        day: queryDay,
        year: queryYear
      }};

      // By default, only return users who are subscribed. Adding
      // includeUnsubscribed=1 to the query will include unsubscribed users.
      if (req.query.includeUnsubscribed != 1) {
        matchRegDate['$match']['$or'] = [
          {subscribed: {$exists: 0}},
          {subscribed: 1}
        ];
      }

      // Aggregate all the steps in a query var.
      query  = [
        matchRegDateExists,
        project,
        matchRegDate
      ];
    }
    else {
      // Bad request. Respond with empty array.
      res.send(400, []);
      return;
    }
  }

  var self = this;
  self.request = req;
  self.response = res;

  // Execute the aggregate query.
  this.docModel.aggregate(query).exec(
    function(err, docs) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Send results
      self.response.send(docs);
    }
  );
};

// Export the Users class
module.exports = Users;
