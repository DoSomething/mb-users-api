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
  email: {type: [String], index: true},
  first: String,
  last: String,
  drupal_uid: Number,
  subscribed: Number
});
userSchema.set('autoIndex', false);


/**
 * Routes
 */

app.get('/user', function(request, response) {
  response.send('GET /user OK');
});

app.post('/user', function(request, response) {
  response.send('POST /user OK');
});
