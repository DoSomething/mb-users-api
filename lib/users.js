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

    // Date object 0-indexes the month, but we save it in its regular form.
    query.birthdate = {
      day: birthdate.getDate(),
      month: birthdate.getMonth() + 1
    };
  }

  if (req.query.drupal_register_date !== undefined) {
    var drupalRegisterDate = new Date(req.query.drupal_register_date);

    // Date object 0-indexes the month, but we save it in its regular form.
    query.drupal_register_date = {
      day: drupalRegisterDate.getDate(),
      month: drupalRegisterDate.getMonth() + 1
    };
  }

  var self = this;
  self.request = req;
  self.response = res;

  // Search for matching documents.
  this.docModel.find(
    query,
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
