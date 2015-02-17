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

  this.docModel.findOne(
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
  );
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

  this.docModel.findOne(
    {email: self.email},
    function(err, doc) {
      if (err) {
        self.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Only update the fields that are provided by the request.
      var updateArgs = {'$set':{}};

      var keys = Object.keys(self.request.body);
      var keysLength = keys.length;

      // Restrict the keys to be processed to prevent unexpected values submitted to the database
      // @todo: Remove subscribed once subscriptions is deployed and test coverage is in place.
      var allowedKeys = [
        "email",
        "subscribed",
        "subscriptions",
        "campaigns",
        "drupal_uid",
        "signup_application_id",
        "birthdate_timestamp",
        "drupal_register_timestamp",
        "last_name",
        "first_name",
        "mobile",
        "address1",
        "address2",
        "city",
        "state",
        "zip",
        "hs_gradyear",
        "race",
        "religion",
        "hs_name",
        "college_name",
        "major_name",
        "degree_type",
        "sat_math",
        "sat_verbal",
        "sat_writing",
        "act_math",
        "gpa",
        "role",
        "source"
      ];

      for (var i = 0; i < keysLength; i++) {
        if (allowedKeys.indexOf(keys[i]) === -1) {
          dslogger.error('Unsupported key POSTed to /user: ' + keys[i]);
          continue;
        }
        if (self.request.body[keys[i]] && keys[i] !== "campaigns" && keys[i] !== "subscriptions") {
          // Convert timestamps to Date object
          // @todo: support date as string that includes timezone details.
          if (keys[i] == "drupal_register_timestamp") {
            var timestamp = parseInt(self.request.body[keys[i]]);
            updateArgs['$set'].drupal_register_date = convertToDate(timestamp);
          }
          else if (keys[i] == "birthdate_timestamp") {
            var timestamp = parseInt(self.request.body[keys[i]]);
            updateArgs['$set'].birthdate = convertToDate(timestamp);
          }
          updateArgs['$set'][keys[i]] = self.request.body[keys[i]];
        }
      }

      // @todo Look into using $push for updating the 'campaigns' array
      // If there are campaigns to update, we need to handle on our own how
      // that field gets updated in the document.
      //
      // This raises the question when would a campaign signup or reportback
      // value ever need to be updated? The initial value, if set, should always
      // be maintained.
      if (self.request.body.campaigns) {

        // Convert timestamps to Date objects.
        for(var i = 0; i < self.request.body.campaigns.length; i++) {
          var reqCampaign = self.request.body.campaigns[i];
          if (reqCampaign.signup) {
            self.request.body.campaigns[i].signup = convertToDate(reqCampaign.signup);
          }
          if (reqCampaign.reportback) {
            self.request.body.campaigns[i].reportback = convertToDate(reqCampaign.reportback);
          }
        }

        if (doc && "campaigns" in doc) {
          // Add old campaigns data to ensure it doesn't get lost.
          updateArgs.campaigns = doc.campaigns;

          // Update old data with any matching data from the request.
          for(var i = 0; i < self.request.body.campaigns.length; i++) {

            var matchFound = false;
            var reqCampaign = self.request.body.campaigns[i];

            for (var j = 0; j < updateArgs.campaigns.length; j++) {

              if (parseInt(reqCampaign.nid) === updateArgs.campaigns[j].nid) {
                // Update only the fields provided by the request.
                if (reqCampaign.signup) {
                  updateArgs.campaigns[j].signup = reqCampaign.signup;
                }

                if (reqCampaign.reportback) {
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

      if ("subscriptions" in self.request.body) {
        updateArgs.subscriptions = {};
        var reqSubscriptions = self.request.body.subscriptions;

        for (var subscriptionKey in reqSubscriptions) {
          if (reqSubscriptions.hasOwnProperty(subscriptionKey)) {
            updateArgs.subscriptions[subscriptionKey] = reqSubscriptions[subscriptionKey];
          }
        }

      }

      // Update the user document.
      self.updateUser(self.email, updateArgs, self.response);
    }
  );
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
  if (request.query.exactCase == 1) {
    self.email = request.query.email;
  }
  else {
    self.email = request.query.email.toLowerCase();
  }
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
