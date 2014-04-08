var express = require('express')
    , mongoose = require('mongoose')
    , User = require('./lib/user')
    ;

/**
 * Express Setup
 */
var app = express();

app.configure(function() {
  // Replaces express.bodyParser() - parses request body and populates request.body
  app.use(express.urlencoded());
  app.use(express.json());

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
  console.log('Message Broker User API server listening on port %d in %s mode.', port, app.settings.env);
});


/**
 * Mongo setup and config.
 */
var mongoUri = 'mongodb://localhost/mb-users';
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

var userModel;
mongoose.connection.once('open', function() {
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

  // User model
  userModel = mongoose.model('mailchimp-user', userSchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});


/**
 * Routes
 */

/**
 * GET from /user
 */

app.get('/user/email/:email', function(req, res) {
  if (req.params.email === undefined) {
    res.send(400, 'No email specified.');
    console.log('GET /user/email/:email request. No email specified.');
  }
  else {
    var user = new User(req.params.email, userModel);
    user.get(req, res);
  }
});

app.get('/user', function(req, res) {
  if (req.query.email === undefined) {
    res.send(400, 'No email specified.');
    console.log('GET /user request. No email specified.');
  }
  else {
    var user = new User(req.query.email, userModel);
    user.get(req, res);
  }
});


/**
 * POST to /user
 */

app.post('/user/email/:email', function(req, res) {
  if (req.params.email === undefined) {
    res.send(400, 'No email specified.');
    console.log('POST /user/email/:email request. No email specified.');
  }
  else {
    var user = new User(req.params.email, userModel);
    user.post(req, res);
  }
});

app.post('/user', function(req, res) {
  if (req.body.email === undefined) {
    res.send(400, 'No email specified.');
    console.log('POST /user request. No email specified.');
  }
  else {
    var user = new User(req.body.email, userModel);
    user.post(req, res);
  }
});
