const express = require("express");
const jsonschema = require("jsonschema");

const Company = require("../models/company");
const companySchema = require("../schemas/company.json");
const companyPatchSchema = require("../schemas/companyPatch.json");
const ExpressError = require("../helpers/expressError");
const { validateJSON } = require("../helpers/util");

const router = new express.Router();


router.get("/", async (req, res, next) => {
  try {
    const { search, min_employees, max_employees } = req.query;
    const companies = await Company.search(search, min_employees, max_employees);

    return res.json({ companies });

  } catch (error) {
    return next(error);
  }
});


router.get("/:handle", async (req, res, next) => {
  try {
    const { handle } = req.params;
    const company = await Company.get(handle, true);

    return res.json({ company });

  } catch (error) {
    return next(error);
  }
});


router.post("/", async (req, res, next) => {
  try {
    validateJSON(req.body, companySchema);

    const { handle, name, num_employees, description, logo_url } = req.body;
    const company = await Company.create(handle, name, num_employees, description, logo_url);

    return res.status(201).json({ company });
  } catch (error) {
    return next(error);
  }
});


router.patch("/:handle", async (req, res, next) => {
  try {
    const { handle } = req.params;
    if (handle === undefined) {
      throw new ExpressError("Missing 'handle' in URL parameter", 400);
    }
    // get company from db
    const company = await Company.get(handle);
    //validte and update company instance
    validateJSON(req.body, companyPatchSchema);
    const fields = ["name", "num_employees", "description", "logo_url"];
    fields.forEach(function(field) {
      if (field in req.body) {
        company[field] = req.body[field];
      }
    });
    // save and update company instance to db
    const updatedCompany = await company.update();
    return res.json({ company: updatedCompany });

  } catch (error) {
    return next(error);
  }
});


router.delete("/:handle", async (req, res, next) => {
  try {
    const { handle } = req.params;
    if (handle === undefined) {
      throw new ExpressError("Missing 'handle' in URL parameter", 400);
    }

    const company = await Company.get(handle);
    await company.delete();

    return res.json({ message: `Company(${handle}) deleted` });

  } catch (error) {
    return next(error);
  }
});


module.exports = router;