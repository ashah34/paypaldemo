const sql = require("mssql");

const config = {
  user: "sa",
  password: "w0wrq6q-qew",
  server: "82.196.238.129",
  database: "EmployeeDetails",
  port: 5533,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.error("❌ MSSQL Connection Failed:", err);
  });

module.exports = {
  sql,
  poolPromise,
};
