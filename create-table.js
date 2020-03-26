var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.password,
  database: 'umbrelladb'
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");

  var sql = "CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, msgid VARCHAR(255) UNIQUE NOT NULL)";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
});