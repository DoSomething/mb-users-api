/**
 * Interface to bulk user requests.
 */

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
    var birthdate = req.query.birthdate.split('-');

    // Find all users who share this birthday from any year.
    if (birthdate.length == 2) {
      var queryMonth = parseInt(birthdate[0]);
      var queryDay = parseInt(birthdate[1]);

      query = [
        {$match: {birthdate: {$exists: 1}}},
        {$project: {
          month: {$month: '$birthdate'},
          day: {$dayOfMonth: '$birthdate'},
          email: '$email'
        }},
        {$match: {month: queryMonth, day: queryDay}}
      ];
    }
    // Find all users who share this birthday from the given year.
    else if (birthdate.length == 3) {
      var queryMonth = parseInt(birthdate[0]);
      var queryDay = parseInt(birthdate[1]);
      var queryYear = parseInt(birthdate[2]);

      query = [
        {$match: {birthdate: {$exists: 1}}},
        {$project: {
          month: {$month: '$birthdate'},
          day: {$dayOfMonth: '$birthdate'},
          year: {$year: '$birthdate'},
          email: '$email'
        }},
        {$match: {month: queryMonth, day: queryDay, year: queryYear}}
      ];
    }
    else {
      // Bad request. Respond with empty array.
      res.send(400, []);
      return;
    }
  }
  else if (req.query.drupal_register_date !== undefined) {
    var drupalRegisterDate = req.query.drupal_register_date.split('-');

    // Find all users who share this drupal registration date from any year.
    if (drupalRegisterDate.length == 2) {
      var queryMonth = parseInt(drupalRegisterDate[0]);
      var queryDay = parseInt(drupalRegisterDate[1]);

      query = [
        {$match: {drupal_register_date: {$exists: 1}}},
        {$project: {
          month: {$month: '$drupal_register_date'},
          day: {$dayOfMonth: '$drupal_register_date'},
          email: '$email'
        }},
        {$match: {month: queryMonth, day: queryDay}}
      ];
    }
    // Find all users who share this drupal registration date from the given year.
    else if (drupalRegisterDate.length == 3) {
      var queryMonth = parseInt(drupalRegisterDate[0]);
      var queryDay = parseInt(drupalRegisterDate[1]);
      var queryYear = parseInt(drupalRegisterDate[2]);

      query = [
        {$match: {drupal_register_date: {$exists: 1}}},
        {$project: {
          month: {$month: '$drupal_register_date'},
          day: {$dayOfMonth: '$drupal_register_date'},
          year: {$year: '$drupal_register_date'},
          email: '$email'
        }},
        {$match: {month: queryMonth, day: queryDay, year: queryYear}}
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
        console.log(err);
        return;
      }

      // Send results
      self.response.send(docs);
    }
  );
};

// Export the Users class
module.exports = Users;
