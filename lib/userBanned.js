/**
 * Interface to the User model.
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
function UserBanned(model) {
  this.docModel = model;
}





/**
 * Creates or updates a user document for a given email.
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
UserBanned.prototype.post = function(req, res) {

  var self = this;
  self.request = req;
  self.response = res;
  self.email = req.body.email.toLowerCase();

  this.docModel.findOne(
    {email: self.email},
    function(err, doc) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Build field values to set user document ban settings.
      var updateArgs = {'$set':{}};
      updateArgs['$set'].subscriptions.banned.reason = self.request.body.reason;
      updateArgs['$set'].subscriptions.banned.source = self.request.body.source;
      
      this.docModel.update(
        { 'email': self.email },
        updateArgs,
        { upsert: true },
        function(err, num, raw) {
          if (err) {
            self.response.send(500, err);
            dslogger.error(err);
          }
    
          dslogger.log('Banned update/upsert executed on: ' + self.email + '.');
          dslogger.log(raw);
    
          self.response.send(true);
        }
      );
    }
  );
};

module.exports = UserBanned;
