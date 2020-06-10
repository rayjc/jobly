const express = require("express");
const jsonschema = require("jsonschema");

const Job = require("../models/job");
const jobSchema = require("../schemas/job.json");
const jobPatchSchema = require("../schemas/jobPatch.json");
const ExpressError = require("../helpers/expressError");
const { ensureAdmin, ensureLoggedIn } = require("../middleware/auth");
const { validateJSON } = require("../helpers/util");

const router = new express.Router();
// requires logged in for all routes
router.use(ensureLoggedIn);


router.get("/", async (req, res, next) => {
  try {
    const { search, min_salary, min_equity } = req.query;
    const jobs = await Job.search(search, min_salary, min_equity);

    return res.json({ jobs });

  } catch (error) {
    return next(error);
  }
});


router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.get(id, true);

    return res.json({ job });

  } catch (error) {
    return next(error);
  }
});


router.post("/", ensureAdmin, async (req, res, next) => {
  try {
    validateJSON(req.body, jobSchema);

    const { title, salary, equity, date_posted, company_handle } = req.body;
    const job = await Job.create(title, salary, equity, date_posted, company_handle);

    return res.status(201).json({ job });

  } catch (error) {
    return next(error);
  }
});


router.patch("/:id", ensureAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === undefined) {
      throw new ExpressError("Missing 'id' in URL", 400);
    }
    // get job instance from db
    const job = await Job.get(id);
    // validate and modify job instance
    validateJSON(req.body, jobPatchSchema);
    const fields = ["title", "salary", "equity", "date_posted", "company_handle"];
    fields.forEach(function(field) {
      if (field in req.body) {
        job[field] = req.body[field];
      }
    });
    // save and update job instance in db
    const updatedJob = await job.update();
    return res.json({ job: updatedJob });

  } catch (error) {
    return next(error);
  }
});


router.delete("/:id", ensureAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === undefined) {
      throw new ExpressError("Missing 'id' in URL", 400);
    }

    const job = await Job.get(id);
    await job.delete();

    return res.json({ message: `Job(${id}) deleted` });

  } catch (error) {
    return next(error);
  }
});

module.exports = router;