/** Middleware for handling req authorization for routes. */
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");


/** Middleware: Authenticate user. */
function authenticateJWT(req, res, next) {
  try {
    const tokenFromBody = req.body.token;
    const payload = jwt.verify(tokenFromBody, SECRET_KEY);
    req.user = payload; // create a current user
    return next();
  } catch (err) {
    return next();
  }
}


/** Middleware: Requires user is authenticated. */
function ensureLoggedIn(req, res, next) {
  if (!req.user) {
    return next({ status: 401, message: "Unauthorized; missing or invalid token" });
  } else {
    return next();
  }
}


/** Middleware: Requires correct username. */
function ensureCorrectUser(req, res, next) {
  try {
    if (req.user.username === req.params.username) {
      return next();
    } else {
      return next({ status: 401, message: `Unauthorized; only ${req.params.username} is allowed` });
    }
  } catch (err) {
    // errors would happen here if we made a request and req.user is undefined
    return next({ status: 401, message: "Unauthorized; missing or invalid token" });
  }
}


/** Middleware: Requires admin status. */
function ensureAdmin(req, res, next) {
  try {
    if (req.user.is_admin === true) {
      return next();
    } else {
      return next({ status: 401, message: "Unauthorized; requires admin privilege" });
    }
  } catch (err) {
    // errors would happen here if we made a request and req.user is undefined
    return next({ status: 401, message: "Unauthorized; missing or invalid token" });
  }
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
  ensureAdmin,
};
