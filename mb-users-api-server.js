var express = require('express')
    , mongoose = require('mongoose')
    , User = require('./lib/user')
    , Users = require('./lib/users')
    , UsersCursor = require('./lib/usersCursor')
    , UserBanned = require('./lib/userBanned')
    , mb_config = require(__dirname + '/config/mb_config.json')
    , dslogger = require('./lib/dslogger');

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
var port = overridePort || process.env.MB_USER_API_PORT || mb_config.default.port;
app.listen(port, function() {
  console.log('Message Broker User API server listening on port %d in %s mode.', port, app.settings.env);
});


/**
 * Mongo setup and config.
 */
if (app.get('env') == 'production') {
  var mongoUri = mb_config.mongo.production;
}
else {
  var mongoUri = mb_config.mongo.development;
}
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

var userModel;
var userCollectionName = 'mailchimp-user';
mongoose.connection.once('open', function() {

  // User schema
  // @todo: name schema rather that allowing the default plurailized naming
  // http://stackoverflow.com/questions/5794834/how-to-access-a-preexisting-collection-with-mongoose?answertab=votes#tab-top
  var userSchema = new mongoose.Schema({
    created: {type: Date, default: Date.now},
    email: {type: String, index: true},
    birthdate: Date,
    drupal_register_date: Date,
    drupal_uid: Number,
    source: String,
    first_name: String,
    last_name: String,
    language: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    country_code: String,
    zip: String,
    mailchimp_status: Number,
    mobile: String,
    subscribed: Number,
    subscriptions:{
      mailchimp: Boolean,
      digest: Boolean,
      user_events: Boolean,
      banned: {
        reason: String,
        when: Date,
        source: String
      }
    },
    campaigns:[{
      nid: Number,
      language: String,
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

  console.log("YO! - Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});


/**
 * Routes
 */

/**
 * GET from /user
 */
app.get('/user', function(req, res) {

  if (!req.query.email && !req.query.drupal_uid) {
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

  if (req.query.type == 'cursor') {
    if (typeof req.query.pageSize === 'undefined') {
      res.send(400, 'The required "pageSize" parameter is not defined.');
    }
    var usersCursor = new UsersCursor(userModel);
    usersCursor.get(req, res);
  }
  else {
    var users = new Users(userModel);
    users.get(req, res);
  }

});

/**
 * POST to /user
 */
app.post('/user', function(req, res) {

  if (typeof req.body.email === 'undefined') {
    console.log('/user undefined req.body.email');
    res.send(400, 'No email specified.');
    dslogger.error('POST /user request. No email specified.');
  }
  else {
    var user = new User(userModel);
    user.post(req, res);
  }
});

/**
 * POST to /user/banned
 */
app.post('/user/banned', function(req, res) {

  if (typeof req.body.email === 'undefined') {
    res.send(400, 'No email specified.');
    dslogger.error('POST /user/banned request. No email specified.');
  }
  else {
    var userBanned = new UserBanned(userModel);
    userBanned.post(req, res);
  }
});

/**
 * DELETE /user
 */
app.delete('/user', function(req, res) {

  console.log('DELETE /user');

  if (typeof req.body.email === 'undefined') {
    res.send(400, 'No email specified.');
    dslogger.error('DELETE /user request. No email specified.');
  }
  else {
    var user = new User(userModel);
    user.delete(req, res);
  }
});
