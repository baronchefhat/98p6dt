const express = require('express');
const app = express();

const config = require('./config');

const async = require('async');
const _ = require('lodash');

const dbModel = require('./models/dbModel');

const dropTokenRoutes = require('./routes/dropTokenRoutes');

const InputUtility = require('./utilities/inputUtility');
const ResponseUtility = require('./utilities/responseUtility');

// Set the port from the config
app.set('port', config.port);

// Use express's json features
app.use(express.json());

// Initialize the DB
// TODO: Remove this step in a production env
// TODO: Support psql option instead
// NOTE: THIS STEP WOULD NOT BE PERFORMED ON A HOSTED DATABASE
// For more information, please see README.md
let sqliteConn;
dbModel.initDb((err, connection) => {
  if (err) throw err;
  sqliteConn = connection;
});

// Write some middleware for handling bad JSON errors
app.use((err, req, res, next) => {
  // We're only intercepting bad JSON errors because they're remarkably cryptic
  // All other exceptions can be displayed normally
  if (err instanceof SyntaxError) {
    let msg = 'Malformed JSON provided';
    // Response utility has static functions for constructing the responses as
    // objects but then res.json turns those objects into a json response
    res.status(400);
    return res.json(ResponseUtility.error(new Error(msg)));
  } else {
    next();
  }
});

// Routes in this project are objects that just use properties to define their behavior
let routes = [dropTokenRoutes];

let performParamValidation = (expected, provided, cb) => {
  if (expected) { // Do something only if the route has params defined
    let actionParams = {};
    async.forEachOf(expected, (paramData, paramName, callback) => {
      if (_.has(provided, paramName)) { // Check if param was provided
        let providedVal = provided[paramName];
        let paramType = _.get(paramData, 'type'); // See what type route expects
        if (!paramType) { // If expected type was not defined in the route, error
          let msg = `parameter ${paramName} does not have a required type defined`;
          return callback(new Error(msg));
        }
        // Ensure that the provided value is of the type we expect
        InputUtility.validateInput(paramName, providedVal, paramData.type, (err) => {
          if (err) return callback(err); // Forward any errors our input validator threw
          // Assign this param and value to the response object
          actionParams[paramName] = providedVal;
          return callback();
        });
      } else if (paramData.required) { // If not provided but required, throw error
        let msg = `${paramName} must be provided and valid`;
        return callback(new Error(msg));
      } else { // Not provided but also not required, ignore and dont pass along
        return callback();
      }
    }, (err) => {
      return cb(err, actionParams);
    });
  } else {
    return cb(null, {});
  }
}

/*
  The validateInput function checks with the requested route endpoint for what values
  are required and ensures that they are present and of the correct type.
  It also ensures that optional values are the correct type if they are provided.
  This function returns a params object that only populates what is expected by the route
  This function is called later during the route request chain
*/
let validateInput = (routeData, req, cb) => {
  // Validate passed in parameters
  async.parallel({
    urlData: (callback) => {
      let urlParams = _.get(routeData, 'urlParams');
      performParamValidation(urlParams, req.params, callback);
    },
    postData: (callback) => {
      let postParams = _.get(routeData, 'postParams');
      performParamValidation(postParams, req.body, callback);
    },
    queryData: (callback) => {
      let queryParams = _.get(routeData, 'queryParams');
      performParamValidation(queryParams, req.query, callback);
    }
  }, (err, {urlData, postData, queryData}) => {
    if (err) return cb(err);
    let results = _.assign(urlData, postData, queryData);
    return cb(null, results);
  });
};

let assignRoute = (req, res, routeData) => {
  async.auto({

    conn: (cb) => {
      // Removed only because we're using in-memory SQLite
      // TODO: support psql
      //dbModel.getDbConn(cb);
      cb(null, sqliteConn);
    },

    params: (cb) => { validateInput(routeData, req, cb); },
    actionResponse: [
      'conn',
      'params',
      ({conn, params}, cb) => { routeData.action(conn, params, cb); }
    ],
    endConnection: [
      'conn',
      'actionResponse',
      ({conn, actionResponse}, cb) => { dbModel.closeConn(conn, cb); }
    ]
  }, (err, { actionResponse }) => {
    if (err) {
      res.status(500);
      if (_.has(err, 'statusCode')) {
        res.status(err.statusCode);
      }
      res.json(ResponseUtility.error(err));
    } else {
      if (_.has(actionResponse, 'statusCode')) {
        res.status(actionResponse.statusCode);
        actionResponse = _.omit(actionResponse, 'statusCode');
      }
      res.json(ResponseUtility.success(actionResponse));
    }
  });
}

_.forEach(routes, (route) => {
  _.forEach(route.subRoutes, (routeData, subRoute) => {
    let routeUrl = `/${route.baseRoute}/${routeData.routePath}`;
    // TODO: Handle all HTTP methods
    switch (routeData.method) {
      case 'POST': { app.post(routeUrl, (req, res) => { assignRoute(req, res, routeData) }); break; }
      case 'DELETE': { app.delete(routeUrl, (req, res) => { assignRoute(req, res, routeData) }); break; }
      default: { app.get(routeUrl, (req, res) => { assignRoute(req, res, routeData) }); }
    }
  });
});

app.use(function (req, res, next) {
  let msg = `Requested resource ${req.originalUrl} was not found`;
  res.status(404).json(ResponseUtility.error(new Error(msg)));
})

app.listen(app.get('port'), () => {
  console.log(`Server listening on port ${app.get('port')}`);
  console.log(`Server ready to accept requests`);
});
