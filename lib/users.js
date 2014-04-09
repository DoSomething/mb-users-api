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

    query.birthdate = {
      day: birthdate.getDate(),
      month: birthdate.getMonth()
    };
  }

  if (req.query.anniversary !== undefined) {
    var anniversary = new Date(req.query.anniversary);
    query.anniversary = {
      day: anniversary.getDate(),
      month: anniversary.getMonth()
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
      }

      // Send results
      self.response.send(docs);
    }
  );
};

// Export the Users class
module.exports = Users;
