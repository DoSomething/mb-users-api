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

      if (self.request.body.address1 !== undefined) {
        updateArgs['$set'].address1 = self.request.body.address1;
      }

      if (self.request.body.address2 !== undefined) {
        updateArgs['$set'].address2 = self.request.body.address2;
      }

      if (self.request.body.city !== undefined) {
        updateArgs['$set'].city = self.request.body.city;
      }

      if (self.request.body.state !== undefined) {
        updateArgs['$set'].state = self.request.body.state;
      }

      if (self.request.body.zip !== undefined) {
        updateArgs['$set'].zip = self.request.body.zip;
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

      if (self.request.body.hs_gradyear !== undefined) {
        updateArgs['$set'].hs_gradyear = self.request.body.hs_gradyear;
      }

      if (self.request.body.race !== undefined) {
        updateArgs['$set'].race = self.request.body.race;
      }

      if (self.request.body.religion !== undefined) {
        updateArgs['$set'].religion = self.request.body.religion;
      }

      if (self.request.body.hs_name !== undefined) {
        updateArgs['$set'].hs_name = self.request.body.hs_name;
      }

      if (self.request.body.college_name !== undefined) {
        updateArgs['$set'].college_name = self.request.body.college_name;
      }

      if (self.request.body.major_name !== undefined) {
        updateArgs['$set'].major_name = self.request.body.major_name;
      }

      if (self.request.body.degree_type !== undefined) {
        updateArgs['$set'].degree_type = self.request.body.degree_type;
      }

      if (self.request.body.sat_math !== undefined) {
        updateArgs['$set'].sat_math = self.request.body.sat_math;
      }

      if (self.request.body.sat_verbal !== undefined) {
        updateArgs['$set'].sat_verbal = self.request.body.sat_verbal;
      }

      if (self.request.body.sat_writing !== undefined) {
        updateArgs['$set'].sat_writing = self.request.body.sat_writing;
      }

      if (self.request.body.act_math !== undefined) {
        updateArgs['$set'].act_math = self.request.body.act_math;
      }

      if (self.request.body.gpa !== undefined) {
        updateArgs['$set'].gpa = self.request.body.gpa;
      }

      if (self.request.body.role !== undefined) {
        updateArgs['$set'].role = self.request.body.role;
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
