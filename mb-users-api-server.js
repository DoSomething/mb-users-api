var express = require('express')
    , mongoose = require('mongoose')
    , User = require('./lib/user')
    , Users = require('./lib/users')
    , dslogger = require('./lib/dslogger')
    ;

// Initialize the logging mechanism. Defines filename to write to and whether
// or not to also log to the console.
dslogger.init('mb-users-api-server', false);

/**
 * Parse command line arguments.
 *
 * -port -p
 *   Allows the caller to set the port that this app should run on.
 */
var listenForPort = false;
var overridePort = false;
var defaultPort = 4722;

process.argv.forEach(function(val, idx, arr) {
  if (listenForPort) {
    listenForPort = false;
    overridePort = parseInt(val);
  }

  if (val === '-port' || val === '-p') {
    listenForPort = true;
  }
});

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
var port = overridePort || process.env.MB_USER_API_PORT || defaultPort;
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
var userCollectionName = 'mailchimp-user';
mongoose.connection.once('open', function() {

  // User schema
  var userSchema = new mongoose.Schema({
    email: {type: String, index: true},
    birthdate: Date,
    drupal_register_date: Date,
    drupal_uid: Number,
    first_name: String,
    last_name: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    mailchimp_status: Number,
    mobile: String,
    subscribed: Number,
    campaigns:[{
      nid: Number,
      signup: Date,
      reportback: Date
    }],
    hs_gradyear: Number,
    race: String,
    religion: String,
    hs_name: String,
    college_name: String,
    major_name: String,
    degree_type: String,
    sat_math: Number,
    sat_verbal: Number,
    sat_writing: Number,
    act_math: Number,
    gpa: Number,
    role: String
  });
  userSchema.set('autoIndex', false);

  // User model
  userModel = mongoose.model(userCollectionName, userSchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});


/**
 * Routes
 */

/**
 * GET from /user
 */
app.get('/user', function(req, res) {
  if (req.query.email === undefined && req.query.drupal_uid === undefined) {
    res.send(400, 'No email or drupal_uid specified.');
    dslogger.error('GET /user request. No email or drupal_uid specified.');
  }
  else {
    var user = new User(userModel);
    user.get(req, res);
  }
});

/**
 * GET from /users
 */
app.get('/users', function(req, res) {
  var users = new Users(userModel);
  users.get(req, res);
});

/**
 * POST to /user
 */
app.post('/user', function(req, res) {
  if (req.body.email === undefined) {
    res.send(400, 'No email specified.');
    dslogger.error('POST /user request. No email specified.');
  }
  else {
    var user = new User(userModel);
    user.post(req, res);
  }
});

/**
 * DELETE /user
 */
app.delete('/user', function(req, res) {
  if (req.query.email === undefined) {
    res.send(400, 'No email specified.');
    dslogger.error('DELETE /user request. No email specified.');
  }
  else {
    var user = new User(userModel);
    user.delete(req, res);
  }
});
