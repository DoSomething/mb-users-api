# Message Broker Users API

This interface allows producer and consumer components of the Message Broker system to interact with the Message Broker User database.

## Setup
#### Prerequisites
- Install node: [http://nodejs.org/download/]
- Install mongo: [http://docs.mongodb.org/manual/installation/]

#### Start Mongo
The Node API requires a Mongo database to save and retrieve user data. A couple main ways you could start Mongo:

##### Option 1
- Create the /data/db folder:
```
$ mkdir /data
$ mkdir /data/db
```
  - You may need to use `sudo` for the `mkdir` commands.
- Start mongo:  
```
$ mongod
```

##### Option 2
- Start mongo with a specific database path: `$ mongod --dbpath=<whatever path you want`
  - Depending on the path and permissions, you may also need to `sudo` that command.

#### Start the API
- Install dependencies: `npm install`
- If applicable, set the environment variable `MB_USER_API_PORT` to specify the port you want the server to run on.
- Run the server: `node mb-users-api-server.js`

#### Starting API on Production
The API lives on the apps server in our Rackspace private cloud. We use the forever tool [https://www.npmjs.org/package/forever] to manage the API as a daemon.
- Log in to the apps server on the privat cloud.
- `$ cd /var/www/mb-users-api`
- `$ forever -l /home/dosomething/forever-logs/mb-users-api-server_<date>.log start mb-users-api-server.js`
- Verify that the process is running:  
  `$ forever list`
- If an instance of mb-users-api-server is already running, you can stop it by checking  the index of the process from `forever list` and then running:  
  `$ forever stop <index #>`  
  ex: `$ forever stop 0`

## Usage
#### Get a User Document
URL: `/user`  
Protocol: `HTTP GET`  
Parameters: `email`  
Response: JSON user document for the queried email address. Or an empty object if none is found.

#### Update/Insert a User Document
URL: `/user`  
Protocol: `HTTP POST`  
Parameters _(required)_: `email`  
Parameters _(optional)_:  
- `drupal_uid`: Number  
- `mailchimp_status`: Number  
- `campaigns`: Object array  
```
[  
  {  
    nid (Number),  
    signup (Date),  
    reportback (Date)  
  }, ...  
]
```  
Response: `true` if successful. Otherwise, something else.

#### Get Users Born on a Certain Day from Any Year
URL: `/users`  
Protocol: `HTTP GET`  
Parameters: `birthdate` in the form of `m-d`  
Example query: `\users?birthdate=12-25`  
Response: JSON array of user documents. Or an empty array if none are found.

#### Get Users Born on a Certain Day and Year
URL: `/users`  
Protocol: `HTTP GET`  
Parameters: `birthdate` in the form of `m-d-Y`  
Example query: `\users?birthdate=12-25-2000`  
Response: JSON array of user documents. Or an empty array if none are found.

#### Get Users Registered on a Certain Day from Any Year
URL: `/users`  
Protocol: `HTTP GET`  
Parameters: `drupal_register_date` in the form of `m-d`  
Example query: `\users?drupal_register_date=12-25`  
Response: JSON array of user documents. Or an empty array if none are found.

#### Get Users Registered on a Certain Day and Year
URL: `/users`  
Protocol: `HTTP GET`  
Parameters: `drupal_register_date` in the form of `m-d-Y`  
Example query: `\users?drupal_register_date=12-25-2013`  
Response: JSON array of user documents. Or an empty array if none are found.