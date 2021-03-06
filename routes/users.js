const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const userSchema = require("../schemas/user.json");
const userPatchSchema = require("../schemas/userPatch.json");
const ExpressError = require("../helpers/expressError");
const { ensureCorrectUser, ensureLoggedIn } = require("../middleware/auth");
const { validateJSON } = require("../helpers/util");
const { SECRET_KEY } = require("../config");

const router = new express.Router();


router.get("/", async (req, res, next) => {
  try {
    // get all user objects
    const detailedUsers = await User.getAll();
    // filter out unwanted properties
    const users = detailedUsers.map(u => {
      const { password, photo_url, is_admin, ...user } = u;
      return user;
    });

    return res.json({ users });

  } catch (error) {
    return next(error);
  }
});


router.get("/:username", async (req, res, next) => {
  try {
    const detailedUser = await User.get(req.params.username);
    const { password, ...user } = detailedUser;

    return res.json({ user });

  } catch (error) {
    return next(error);
  }
});


router.post("/", async (req, res, next) => {
  try {
    validateJSON(req.body, userSchema);

    const { username, password, first_name, last_name, email, photo_url, is_admin } = req.body;
    const detailedUser = await User.register(
      username, password, first_name, last_name, email, photo_url, is_admin
    );

    const { password: hashedPassword, ...user } = detailedUser;
    const payload = { username: user.username, is_admin: user.is_admin };

    return res.status(201).json({ user, token: jwt.sign(payload, SECRET_KEY, { expiresIn: "1d" }) });

  } catch (error) {
    return next(error);
  }
});


router.patch("/:username", ensureLoggedIn, ensureCorrectUser, async (req, res, next) => {
  try {
    // get user instance from db
    const detailedUser = await User.get(req.params.username);
    //validte and update user instance
    validateJSON(req.body, userPatchSchema);
    const fields = ["first_name", "last_name", "email", "photo_url"];
    fields.forEach(function(field) {
      if (field in req.body) {
        detailedUser[field] = req.body[field];
      }
    });
    // save and update user instance to db
    const updatedUser = await detailedUser.update();
    // filter out password
    const { password, ...user } = updatedUser;
    return res.json({ user });

  } catch (error) {
    return next(error);
  }
});


router.delete("/:username", ensureLoggedIn, ensureCorrectUser, async (req, res, next) => {
  try {
    const username = req.params.username;
    const user = await User.get(username);
    await user.delete();

    return res.json({ message: `User(${username}) deleted` });

  } catch (error) {
    return next(error);
  }
});


module.exports = router;