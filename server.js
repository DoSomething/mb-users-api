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
  first: String,
  last: String,
  drupal_uid: Number,
  subscribed: Number
});
userSchema.set('autoIndex', false);

var userModel = mongoose.model('mailchimp-user', userSchema);


/**
 * Routes
 */

app.get('/user', function(request, response) {
  response.send('GET /user OK');
});

app.post('/user', function(request, response) {
  var email = request.body.email;
  var subscribed = request.body.subscribed;

  // Find a document for the user with the provided email.
  userModel.findOne(
    { 'email': email },
    function(err, doc) {
      if (err) {
        response.send(500, err);
        return console.log(err);
      }

      // If found, update the document with the subscription setting
      if (doc) {
        var updatedDoc = {
          email: doc.email,
          first: doc.first,
          last: doc.last,
          drupal_uid: doc.drupal_uid,
          subscribed: subscribed
        };

        // Execute the update
        userModel.update(
          { 'email': email },
          updatedDoc,
          function(err, num, raw) {
            if (err) {
              response.send(500, err);
              return console.log(err);
            }

            console.log('raw response'); console.log(raw);

            // When successful, send response. Defaults to 200.
            response.send(true);
          }
        );
      }
      else {
        // Still a successful response even if no doc is found.
        console.log('No doc found for email: ' + email);
        response.send(204, true);
      }
    }
  );
});
