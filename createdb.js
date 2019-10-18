
const Sqlite = require("sqlite3").verbose();
const AppConfig = require("./config.json");

var sql = `CREATE TABLE IF NOT EXISTS "Users" (
	"Id"	INTEGER,
	"NumCredits"	INTEGER DEFAULT 0,
	"DiscordId"	VARCHAR,
	"UserName"	VARCHAR NOT NULL,
	"LastPaidUTC"	INTEGER DEFAULT 0,
	PRIMARY KEY("Id")
)`;

const db = new Sqlite.Database(AppConfig.database);
db.run(sql, function(err) {
    if (err) {
        console.error(err);
    }
});