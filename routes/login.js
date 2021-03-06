const express = require("express");
const jwt = require("jsonwebtoken");
const ExpressError = require("../helpers/expressError");
const User = require("../models/user");
const { SECRET_KEY } = require("../config");

const router = new express.Router();


/** 
 * POST /login - login: {username, password} => {token}
 **/
router.post("/", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (username === undefined || password === undefined) {
      throw new ExpressError("Missing username/password", 400);
    }
    if (typeof username !== "string" || typeof password !== "string") {
      throw new ExpressError("Invalid date type; username/password must be strings.");
    }

    if (await User.authenticate(username, password)) {
      const user = await User.get(username);

      const payload = { username, is_admin: user.is_admin };
      return res.json({ token: jwt.sign(payload, SECRET_KEY, { expiresIn: "1d" }) });
    }

    return next(new ExpressError("Invalid username/password", 401));

  } catch (error) {
    return next(error);
  }
});


module.exports = router;