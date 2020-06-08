const partialUpdate = require("../../helpers/partialUpdate");


describe("partialUpdate()", () => {
  it("should generate a proper partial update query with just 1 field", function() {
    const toUpdate = {
      username: "test",
    };

    const { query, values } = partialUpdate("users", toUpdate, "id", 1);
    expect(query).toBe("UPDATE users SET username=$1 WHERE id=$2 RETURNING *");
    expect(values).toEqual(["test", 1]);
  });

  it("should generate a proper partial update query with 2 fields", function() {
    const toUpdate = {
      username: "test",
      email: "test@test.com",
    };

    const { query, values } = partialUpdate("users", toUpdate, "id", 1);
    expect(query).toBe("UPDATE users SET username=$1, email=$2 WHERE id=$3 RETURNING *");
    expect(values).toEqual(["test", "test@test.com", 1]);
  });
});
