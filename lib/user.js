/**
 * Interface to the User model.
 */
var dslogger = require('./dslogger')
    ;

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
function User(model) {
  this.docModel = model;
}

/**
 * Converts a timestamp in seconds to a Date object.
 *
 * @param timestamp
 *   Timestamp in seconds.
 */
var convertToDate = function(timestamp) {
  return new Date(timestamp * 1000);
};

/**
 * Finds a user document for a given email.
 *
 * @param req
 *   The request object in a GET callback.
 * @param res
 *   The reponse object in a GET callback.
 */
User.prototype.get = function(req, res) {
  // Store handle to this in self so that it can be accessed within callback.
  var self = this;
  self.response = res;

  var query = {};
  if (req.query.email) {
    query.email = req.query.email.toLowerCase();
  }
  else if (req.query.drupal_uid) {
    query.drupal_uid = req.query.drupal_uid;
  }

  self.queryString = JSON.stringify(query);

  this.docModel.find(
    query,
    function(err, doc) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Respond with the user doc if found.
      if (doc) {
        self.response.send(200, doc);
        dslogger.log('GET /user request. Responding with user doc for: ' + doc.email);
      }
      else {
        // Return an empty object if no doc is found.
        self.response.send(204, {});
        dslogger.log('GET /user request. No doc found for query: ' + self.queryString);
      }
    }
  ).limit(1);
};

/**
 * Creates or updates a user document for a given email.
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
User.prototype.post = function(req, res) {
  var self = this;
  self.request = req;
  self.response = res;
  self.email = req.body.email.toLowerCase();

  this.docModel.find(
    {email: self.email},
    function(err, doc) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Only update the fields that are provided by the request.
      var updateArgs = {'$set':{}};

      if (self.request.body.subscribed !== undefined) {
        updateArgs['$set'].subscribed = self.request.body.subscribed;
      }

      if (self.request.body.drupal_uid !== undefined) {
        updateArgs['$set'].drupal_uid = self.request.body.drupal_uid;
      }

      if (self.request.body.first_name !== undefined) {
        updateArgs['$set'].first_name = self.request.body.first_name;
      }

      if (self.request.body.last_name !== undefined) {
        updateArgs['$set'].last_name = self.request.body.last_name;
      }

      if (self.request.body.mailchimp_status !== undefined) {
        updateArgs['$set'].mailchimp_status = self.request.body.mailchimp_status;
      }

      if (self.request.body.mobile !== undefined) {
        updateArgs['$set'].mobile = self.request.body.mobile;
      }

      if (self.request.body.drupal_register_timestamp !== undefined) {
        // Convert timestamp string to Date object
        var timestamp = parseInt(self.request.body.drupal_register_timestamp);
        updateArgs['$set'].drupal_register_date = convertToDate(timestamp);
      }

      if (self.request.body.birthdate_timestamp !== undefined) {
        var timestamp = parseInt(self.request.body.birthdate_timestamp);
        updateArgs['$set'].birthdate = convertToDate(timestamp);
      }

      // @todo Look into using $push for updating the 'campaigns' array
      // If there are campaigns to update, we need to handle on our own how
      // that field gets updated in the document.
      if (self.request.body.campaigns !== undefined) {

        // Convert timestamps to Date objects.
        for(var i = 0; i < self.request.body.campaigns.length; i++) {
          var reqCampaign = self.request.body.campaigns[i];
            if (reqCampaign.signup !== undefined) {
              self.request.body.campaigns[i].signup = convertToDate(reqCampaign.signup);
            }
            if (reqCampaign.reportback !== undefined) {
              self.request.body.campaigns[i].reportback = convertToDate(reqCampaign.reportback);
            }
        }

        if (doc && doc.campaigns !== undefined) {
          // Add old campaigns data to ensure it doesn't get lost.
          updateArgs.campaigns = doc.campaigns;

          // Update old data with any matching data from the request.
          for(var i = 0; i < self.request.body.campaigns.length; i++) {

            var matchFound = false;
            var reqCampaign = self.request.body.campaigns[i];

            for (var j = 0; j < updateArgs.campaigns.length; j++) {

              if (parseInt(reqCampaign.nid) === updateArgs.campaigns[j].nid) {
                // Update only the fields provided by the request.
                if (reqCampaign.signup !== undefined) {
                  updateArgs.campaigns[j].signup = reqCampaign.signup;
                }

                if (reqCampaign.reportback !== undefined) {
                  updateArgs.campaigns[j].reportback = reqCampaign.reportback;
                }

                matchFound = true;
                break;
              }

            }

            // No matching nid. Add to end of the updateArgs.campaigns array.
            if (!matchFound) {
              updateArgs.campaigns[updateArgs.campaigns.length] = reqCampaign;
            }
          }
        }
        else {
          // If no old data to worry about, just update with the request's campaign data.
          updateArgs.campaigns = self.request.body.campaigns;
        }
      }

      // Update the user document.
      self.updateUser(self.email, updateArgs, self.response);
    }
  ).limit(1);
};

/**
 * Deletes a user document for a given email.
 *
 * @param request
 *  The request object in a POST callback.
 * @param response
 *  The response object in a POST callback.
 */
User.prototype.delete = function(request, response) {
  var self = this;
  self.email = request.query.email.toLowerCase();
  self.response = response;

  this.docModel.remove(
    {email: self.email},
    function (err, num) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
      }

      if (num == 0) {
        self.response.send(304, 'Found no document to delete for email: ' + self.email);
        dslogger.error('Found no document to delete for email: ' + self.email);
      }
      else {
        self.response.send(200, 'Delete ' + num + ' document(s) for email: ' + self.email);
        dslogger.log('Deleted ' + num + ' document(s) for email: ' + self.email);
      }
    }
  );
};

/**
 * Updates a user document if it already exists, or upserts one if it doesn't.
 *
 * @param email
 *  Email address of the user document to update/upsert.
 * @param args
 *  Values to update the document with.
 * @param response
 *  Response object to handle responses back to the sender.
 */
User.prototype.updateUser = function(email, args, response) {
  var self = {};
  self.email = email;
  self.args = args;
  self.response = response;

  this.docModel.update(
    { 'email': self.email },
    self.args,
    { upsert: true },
    function(err, num, raw) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
      }

      dslogger.log('Update/upsert executed on: ' + self.email + '. Raw response from mongo:');
      dslogger.log(raw);

      self.response.send(true);
    }
  );
};

/**
 * Helper function to determine if an object is empty or not.
 *
 * @param obj
 *   The object to check.
 */
var isObjectEmpty = function(obj) {
  for(var key in obj) {
    return true;
  }

  return false;
};

module.exports = User;
