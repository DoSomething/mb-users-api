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
    var birthdate = new Date(req.query.birthdate);
    var queryDay = birthdate.getDate();
    // Javascript Date object 0-indexes the month. But Mongo's $month aggregate
    // operator does not 0-index it.
    var queryMonth = birthdate.getMonth() + 1;

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

  if (req.query.drupal_register_date !== undefined) {
    var drupalRegisterDate = new Date(req.query.drupal_register_date);
    var queryDay = drupalRegisterDate.getDate();
    var queryMonth = drupalRegisterDate.getMonth() + 1;

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
