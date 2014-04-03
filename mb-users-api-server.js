var express = require('express')
    , mongoose = require('mongoose')
    ;

/**
 * Express Setup
 */
var app = express();

app.configure(function() {
  // Parses request body and populates request.body
  app.use(express.bodyParser());

  // Checks request.body for HTTP method override
  app.use(express.methodOverride());

  // Perform route lookup based on url and HTTP method
  app.use(app.router);

  // Show all errors in development
  app.use(express.errorHandler({dumpException: true, showStack: true}));
});

// Start server
var port = process.env.MB_USER_API_PORT || 4722;
app.listen(port, function() {
  console.log('Message Broker User API server listening on port %d in %s mode...\n\n', port, app.settings.env);
});


/**
 * Mongo setup and config.
 */
var mongoUri = 'mongodb://localhost/mb-users';
mongoose.connect(mongoUri);

// User schema
var userSchema = new mongoose.Schema({
  email: {type: String, index: true},
  drupal_uid: Number,
  mailchimp_status: Number,
  subscribed: Number,
  campaigns:[{
    nid: Number,
    signup: Date,
    reportback: Date
  }]
});
userSchema.set('autoIndex', false);

var userModel = mongoose.model('mailchimp-user', userSchema);


/**
 * Routes
 */

/**
 * GET from /user
 */
app.get('/user', function(request, response) {

  if (request.query.email === undefined) {
    response.send(400, 'No email specified.');
    console.log('GET /user request. No email specified.');
  }
  else {
    userModel.findOne(
      { 'email': request.query.email },
      function(err, doc) {
        if (err) {
          response.send(500, err);
          console.log(err);
        }

        // Respond with the user doc if found.
        if (doc) {
          response.send(200, doc);
          console.log('GET /user request. Responding with user doc for: ' + doc.email);
        }
        else {
          // Return an empty object if no doc is found.
          response.send(204, {});
          console.log('GET /user request. No doc found for: ' + request.query.email);
        }
      }
    );
  }
});


/**
 * POST to /user
 */
app.post('/user', function(request, response) {

  // Find out if there's a document that already exists for this user.
  userModel.findOne(
    { 'email': request.body.email },
    function(err, doc) {
      if (err) {
        response.send(500, err);
        console.log(err);
      }

      // Only update the fields that are provided by the request.
      var updateArgs = {};

      if (request.body.subscribed !== undefined) {
        updateArgs.subscribed = request.body.subscribed;
      }
      else if (doc.subscribed !== undefined) {
        updateArgs.subscribed = doc.subscribed;
      }

      if (request.body.drupal_uid !== undefined) {
        updateArgs.drupal_uid = request.body.drupal_uid;
      }
      else if (doc.drupal_uid !== undefined) {
        updateArgs.drupal_uid = doc.drupal_uid;
      }

      if (request.body.mailchimp_status !== undefined) {
        updateArgs.mailchimp_status = request.body.mailchimp_status;
      }
      else if (doc.mailchimp_status !== undefined) {
        updateArgs.mailchimp_status = doc.mailchimp_status;
      }

      // If there are campaigns to update, we need to handle on our own how
      // that field gets updated in the document.
      if (request.body.campaigns !== undefined) {
        if (doc && doc.campaigns !== undefined) {
          // Add old campaigns data to ensure it doesn't get lost.
          updateArgs.campaigns = doc.campaigns;

          // Update old data with any matching data from the request.
          for(var i = 0; i < request.body.campaigns.length; i++) {

            var reqCampaign = request.body.campaigns[i];
            var matchFound = false;

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
          updateArgs.campaigns = request.body.campaigns;
        }
      }

      // Update the user document.
      updateUser(request.body.email, updateArgs, response);
    }
  );
});

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
var updateUser = function(email, args, response) {
  userModel.update(
    { 'email': email },
    args,
    { upsert: true },
    function(err, num, raw) {
      if (err) {
        response.send(500, err);
        console.log(err);
      }

      console.log('Update/upsert executed on: %s. Raw response from mongo:', email);
      console.log(raw);

      response.send(true);
    }
  );
}
