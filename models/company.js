const db = require("../db");
const ExpressError = require("../helpers/expressError");

class Company {
  constructor(handle, name, numEmployees = null, description = null, logoUrl = null) {
    this.handle = handle;
    this.name = name;
    this.num_employees = numEmployees;
    this.description = description;
    this.logo_url = logoUrl;
  }

  /**
   * Get a company by handle(PK);
   * returns Company */
  static async get(handle) {
    const result = await db.query(
      `SELECT handle, name, num_employees, description, logo_url
        FROM companies
        WHERE handle=$1`,
      [handle]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Cannot find ${handle}.`, 404);
    }

    const c = result.rows[0];
    return new Company(c.handle, c.name, c.num_employees, c.description, c.logo_url);
  }

  /**
   * Get all companies;
   * returns an array of Company objects */
  static async getAll() {
    const result = await db.query(
      `SELECT handle, name, num_employees, description, logo_url FROM companies`,
    );

    return result.rows.map(r => new Company(...Object.values(r)));
  }

  /**
   * Search for companies by name, min_employees, max_employees;
   * returns an array of Company objects */
  static async search(name = null, min_employees = null, max_employees = null) {
    // check for at least one query parameter
    if (!name && !min_employees && !max_employees) {
      return await Company.getAll();
    }
    // check if min_employees and max_employees are valid
    if (min_employees && max_employees
      && +min_employees > +max_employees) {
      throw new ExpressError(`min_employees cannot be greater than max_employees`, 400);
    }
    // construct filter phrases and parameterized values
    const filters = [];
    const values = [];
    let index = 1;
    if (name && typeof name === "string") {
      filters.push(`name ILIKE $${index} `);
      values.push(`%${name}%`);
      index++;
    }
    if (min_employees && typeof +min_employees === "number") {
      filters.push(`num_employees > $${index} `);
      values.push(+min_employees);
      index++;
    }
    if (max_employees && typeof +max_employees === "number") {
      filters.push(`num_employees < $${index} `);
      values.push(+max_employees);
      index++;
    }
    // construct query statement
    const query = `SELECT handle, name, num_employees, description, logo_url 
                    FROM companies 
                    WHERE ${filters.join('AND ')}`;

    const result = await db.query(query, values);

    return result.rows;
  }

  /**
   * Create a company and write to db;
   * returns the created Company object */
  static async create(handle, name, numEmployees = null, description = null, logoUrl = null) {
    try {
      const result = await db.query(
        `INSERT INTO companies (handle, name, num_employees, description, logo_url)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING handle, name, num_employees, description, logo_url`,
        [handle, name, numEmployees, description, logoUrl]
      );

      return new Company(...Object.values(result.rows[0]));

    } catch (error) {
      if (error.code === "23505") {
        throw new ExpressError(`${handle}(${name}) already exists.`, 403);
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
        `UPDATE companies SET name=$2, num_employees=$3, description=$4, logo_url=$5
          WHERE handle=$1
          RETURNING handle, name, num_employees, description, logo_url`,
        [this.handle, this.name, this.num_employees, this.description, this.logo_url]
      );

      if (result.rows.length === 0) {
        throw new ExpressError(`Cannot find ${handle}`, 404);
      }

      return new Company(...Object.values(result.rows[0]));

    } catch (error) {
      if (error.code === "23505") {
        throw new ExpressError(`${name} already exists.`, 403);
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Delete a row in db based on current instance */
  async delete() {
    const result = await db.query(
      `DELETE FROM companies WHERE handle=$1 RETURNING *`,
      [this.handle]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Cannot find ${handle}.`, 404);
    }
  }

}


module.exports = Company;