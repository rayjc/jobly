const db = require("../db");
const ExpressError = require("../helpers/expressError");

class Job {
  constructor(id, title, salary, equity, date_posted, company_handle) {
    this.id = id;
    this.title = title;
    this.salary = salary;
    this.equity = equity;
    this.date_posted = date_posted;
    this.company_handle = company_handle;
  }

  /**
   * Get all jobs;
   * returns an array of {<id>, <title>, <company_handle>} (without company details) */
  static async getAll() {
    const result = await db.query(
      `SELECT id, title, salary, equity, date_posted, company_handle FROM jobs`,
    );

    return result.rows.map(r => ({
      id: r.id, title: r.title, company_handle: r.company_handle
    }));
  }

  /**
   * Get a job by id;
   * returns {<id>, <title>, <salary>, <equity>, <date_posted>, <company>} */
  static async get(id, isDetail = false) {
    // query job row
    const jobResult = await db.query(
      `SELECT title, salary, equity, date_posted, company_handle FROM jobs
        WHERE id=$1`,
      [id]
    );

    if (jobResult.rows.length === 0) {
      throw new ExpressError(`Cannot find id:${id}.`, 404);
    }
    // return condensed Job instance early
    if (!isDetail) {
      return new Job(+id, ...Object.values(jobResult.rows[0]));
    }


    // query company row
    const companyResult = await db.query(
      `SELECT handle, name, num_employees, description, logo_url
        FROM companies
        WHERE handle=$1`,
      [jobResult.rows[0].company_handle]
    );

    const j = jobResult.rows[0];
    const c = companyResult.rows[0];
    const { title, salary, equity, date_posted } = j;

    return { id: +id, title, salary, equity, date_posted, company: c };
  }

  /**
   * Search for jobs by title, min_salary, min_equity;
   * returns an array of {<title>, <company_handle>} */
  static async search(title = null, minSalary = null, minEquity = null) {
    // check at least one query parameter is supplied
    if (!title && !minSalary && !minEquity) {
      return await Job.getAll();
    }
    // construct filter phrases and parameterized values
    const filters = [];
    const values = [];
    let index = 1;
    if (title && typeof title === "string") {
      filters.push(`title ILIKE $${index} `);
      values.push(`%${title}%`);
      index++;
    }
    if (minSalary && typeof +minSalary === "number") {
      filters.push(`salary > $${index} `);
      values.push(+minSalary);
      index++;
    }
    if (minEquity && typeof +minEquity === "number") {
      filters.push(`equity > $${index} `);
      values.push(+minEquity);
      index++;
    }
    // construct query statement
    const query = `SELECT id, title, company_handle
                    FROM jobs
                    WHERE ${filters.join('AND ')}`;

    const result = await db.query(query, values);

    return result.rows;
  }

  /**
   * Creates a job and write to db;
   * returns the created object,
   * {<id>, <title>, <salary>, <equity>, <date_posted>, <company_handle>} */
  static async create(title, salary, equity, date_posted, companyHandle) {
    try {
      const result = (date_posted)
        ? await db.query(
          `INSERT INTO jobs (title, salary, equity, date_posted, company_handle)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, salary, equity, date_posted, company_handle`,
          [title, salary, equity, date_posted, companyHandle]
        )
        : await db.query(
          `INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, date_posted, company_handle`,
          [title, salary, equity, companyHandle]
        );

      return new Job(...Object.values(result.rows[0]));

    } catch (error) {
      if (error.code === "23503") {
        throw new ExpressError(`'${companyHandle}' does not exist.`, 403);
      } else if (error.code === "23514") {
        throw new ExpressError(
          `Invalid salary or equity: salary > 0 ; 0 <= equity < 1.0`, 403
        );
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Update a row in db based on current instance;
   * returns updated instance */
  async update() {
    try {
      const result = await db.query(
        `UPDATE jobs SET title=$2, salary=$3, equity=$4, date_posted=$5, company_handle=$6
          WHERE id=$1
          RETURNING id, title, salary, equity, date_posted, company_handle`,
        [this.id, this.title, this.salary, this.equity, this.date_posted, this.company_handle]
      );

      if (result.rows.length === 0) {
        throw new ExpressError(`Cannot find id:${this.id}`, 404);
      }

      return new Job(...Object.values(result.rows[0]));

    } catch (error) {
      if (error.code === "23503") {
        throw new ExpressError(`${this.company_handle} does not exist.`, 403);
      } else if (error.code === "23514") {
        throw new ExpressError(
          `Invalid salary or equity: salary > 0 ; 0 <= equity < 1.0`, 403
        );
      } else {
        console.error(error);
      }
    }
  }

  /**
  * Delete a row in db based on current instance */
  async delete() {
    const result = await db.query(
      `DELETE FROM jobs WHERE id=$1 RETURNING *`,
      [this.id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Cannot find id:${this.id}`, 404);
    }
  }

}


module.exports = Job;