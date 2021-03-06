/** Express app for jobly. */

const express = require("express");

const morgan = require("morgan");

const companiesRoutes = require("./routes/companies");
const loginRoutes = require("./routes/login");
const jobsRoutes = require("./routes/jobs");
const usersRoutes = require("./routes/users");
const ExpressError = require("./helpers/expressError");
const { authenticateJWT } = require("./middleware/auth");

const app = express();

app.use(express.json());

// add logging system
app.use(morgan("tiny"));

// get jwt auth token for all routes
app.use(authenticateJWT);


/* set up routes */
app.use("/companies", companiesRoutes);
app.use("/login", loginRoutes);
app.use("/jobs", jobsRoutes);
app.use("/users", usersRoutes);


/** 404 handler */
app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);

  // pass the error to the next piece of middleware
  return next(err);
});


/** general error handler */
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  console.error(err.stack);

  return res.json({
    status: err.status,
    message: err.message
  });
});

module.exports = app;
