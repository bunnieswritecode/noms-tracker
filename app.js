// Load dependencies
const Discord = require("discord.js");
const DotEnv = require("dotenv").config();
const Sqlite = require("sqlite3").verbose();

// Bot Commands
const BotCommands = {
    Help: '!help',
    Next: '!next',
    AddMe: '!addme',
    RemoveMe: '!removeme',
    CreditMe: '!creditme',
    Paid: '!paid',
    Rotation: '!rotation'
}

// Emojis
const Emojis = {
    ThumbsUp: '👍',
    ThumbsDown: '👎'
}

// Establish DB connection
const db = new Sqlite.Database(process.env.DB_FILE);

// Start up Discord bot
const bot = new Discord.Client();
bot.login(process.env.BOT_TOKEN);

// #region Bind event listeners
bot.on("ready", function() {
    console.log("I'm ready. I'm ready. I'm ready.");
});

bot.on("message", function(message) { 
    msgReceived(message); 
});

process.on('beforeexit', function() {
    bot.destroy();
    db.close();
});
// #endregion

/**
 * Listens and responds to bot commands
 * @param {Object} objMessage - Discord Message object
 */
function msgReceived(objMessage) {
    try {
        // Talking to yourself isn't fun
        if (objMessage.author.id == bot.user.id) return;

        var strMsg = objMessage.content.toLowerCase();

        switch(strMsg) {
            case BotCommands.Next:
                getNextUp(objMessage);
                break;
            case BotCommands.CreditMe:
                giveCredit(objMessage);
                break;
            case BotCommands.Paid:
                setPaid(objMessage);
                break;
            case BotCommands.AddMe:
                addUser(objMessage);
                break;
            case BotCommands.RemoveMe:
                removeUser(objMessage);
                break;
            case BotCommands.Rotation:
                displayRotation(objMessage);
                break;
            case BotCommands.Help:
                displayHelp(objMessage);
                break;
            default:
                // Nothing
        }
    }
    catch (e) {
        console.log(e);
    }
}

// #region Bot commands
/**
 * Responds with who is next up on rotation
 * @param {Object} objMessage - Discord Message object
 */
function getNextUp(objMessage) {
    var objChannel = objMessage.channel;
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    qryGetNextUp(
        function(row) {
            objChannel.send(`<@${row.DiscordId}> You up fam.`);
        },
        tdReaction
    );
}

/**
 * Assigns user credit for later
 * @param {Object} objMessage - Discord Message object
 */
function giveCredit(objMessage) {
    var objUser = objMessage.author;
    var tuReaction = createReactionClosure(objMessage, Emojis.ThumbsUp);
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    qryAddCredit(objUser.id, tuReaction, tdReaction);
}

/**
 * Sets user as paid, and also decrements credit
 * @param {Object} objMessage - Discord Message object
 */
function setPaid(objMessage) {
    var objUser = objMessage.author;
    var objChannel = objMessage.channel;
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    // Check if this user is up before tracking payment
    qryGetNextUp(
        function(row) {
            if (row.DiscordId === objUser.id) {
                // Set paid timestamps (also decrements credit for those before)
                qrySetPaidTimestamp(
                    objUser.id, 
                    function() {
                        objMessage.react(Emojis.ThumbsUp);
                        getNextUp(objMessage);
                    },
                    tdReaction
                );
            }
            else {
                objChannel.send("You aren't next in the rotation. I'm giving you a credit instead.");
                giveCredit(objMessage);
            }
        },
        tdReaction
    );
}

/**
 * Add user to the rotation
 * @param {Object} objMessage - Discord Message object
 */
function addUser(objMessage) {
    var objUser = objMessage.author;
    var objChannel = objMessage.channel;
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    // Check if user exists before attempting to add
    qryUserExists(
        objUser.id, 
        function() {
            objChannel.send("You're already part of the rotation, bruh.");
        },
        function() {
            qryAddUser(
                objUser.id, 
                objUser.username, 
                function() {
                    objChannel.send("Welcome to the ~~breakfast~~ dinner club.");
                    objMessage.react(Emojis.ThumbsUp);
                },
                tdReaction
            );
        }
    );
}

/**
 * Remove user from rotation
 * @param {Object} objMessage - Discord Message object
 */
function removeUser(objMessage) {
    var objUser = objMessage.author;
    var objChannel = objMessage.channel;
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    // Check if user exists before attempting to remove
    qryUserExists(
        objUser.id,
        function(row) {
            qryDeleteUser(
                objUser.id,
                function() {
                    objChannel.send("We didn't really like you anyway.");
                    objMessage.react(Emojis.ThumbsUp);
                },
                tdReaction
            );
        },
        function() {
            objChannel.send("You're not part of the rotation, bruh.");
        }
    )
}

/**
 * Displays the rotation
 * @param {Object} objMessage - Discord Message object
 */
function displayRotation(objMessage) {
    var objChannel = objMessage.channel;
    var tdReaction = createReactionClosure(objMessage, Emojis.ThumbsDown);

    qryGetRotation(
        function(rows) {
            var msg = "";

            for (let i = 0; i < rows.length; i++) {
                msg += `${i+1}. ${rows[i].UserName} (Credits: ${+rows[i].NumCredits}) \n`;
            }

            objChannel.send(msg);
        },
        tdReaction
    )
}

/**
 * Displays available bot commands
 * @param {Object} objMessage - Discord Message object
 */
function displayHelp(objMessage) {
    objMessage.channel.send(
        BotCommands.Help        + ' - Displays this help text \n' +
        BotCommands.Next        + ' - Displays who is up next \n' +
        BotCommands.CreditMe    + ' - Gives your user credit \n' +
        BotCommands.Paid        + ' - Marks your debt paid \n' +
        BotCommands.Rotation    + ' - Displays the rotation \n' +
        BotCommands.AddMe       + ' - Adds your user to the rotation \n' +
        BotCommands.RemoveMe    + ' - Permanently removes your user from the rotation'
    );
}
// #endregion

// #region Database Reads
/**
 * 
 * @callback cbSingleRow
 * @param {Object} row - Resulting database row
 */

/**
 * 
 * @callback cbMultiRow
 * @param {Object} rows - Resulting database rows
 */

/**
 * Returns the full rotation
 * @param {cbMultiRow} cbSuccess - Callback when query successfully returns results
 * @param {function} cbFailure - Callback when query returns no results or fails
 */
function qryGetRotation(cbSuccess, cbFailure) {
    var sql = 'SELECT * FROM Users ORDER BY NumCredits ASC, LastPaidUTC ASC, Id ASC';
    qryGetMultiCore(sql, [], cbSuccess, cbFailure);
}

/**
 * Returns the next user in the rotation
 * @param {cbSingleRow} cbSuccess - Callback when query successfully returns a result
 * @param {function} cbFailure - Callback when query returns no results or fails
 */
function qryGetNextUp(cbSuccess, cbFailure) {
    var sql = 'SELECT * FROM Users ORDER BY NumCredits ASC, LastPaidUTC ASC, Id ASC';
    qryGetSingleCore(sql, [], cbSuccess, cbFailure);
}

/**
 * Returns the user if present in the database
 * @param {int} userId - User Discord ID
 * @param {cbSingleRow} cbSuccess - Callback when query successfully returns a result
 * @param {function} cbFailure - Callback when query returns no results or fails
 */
function qryUserExists(userId, cbSuccess, cbFailure) {
    var sql = 'SELECT Id FROM Users WHERE DiscordId = ?';
    qryGetSingleCore(sql, [userId], cbSuccess, cbFailure);
}

/**
 * Helper function to execute a query that returns a single row and execute callbacks
 * @param {string} sql - Query statement to execute
 * @param {Array} params - Array of parameters to supply to query
 * @param {cbSingleRow} cbSuccess - Callback when query successfully returns a result
 * @param {function} cbFailure - Callback when query returns no results or fails
 */
function qryGetSingleCore(sql, params, cbSuccess, cbFailure) {
    db.get(sql, params, function(err, row) {
        if (err) {
            console.log(err.message);
            return;
        }
        
        if (row) { 
            cbSuccess(row);
        }
        else {
            cbFailure()
        }
    });
}

/**
 * Helper function to execute a query that returns multiple rows and execute callbacks
 * @param {string} sql - Query statement to execute
 * @param {Array} params - Array of parameters to supply to query
 * @param {cbSingleRow} cbSuccess - Callback when query successfully returns a result
 * @param {function} cbFailure - Callback when query returns no results or fails
 */
function qryGetMultiCore(sql, params, cbSuccess, cbFailure) {
    db.all(sql, params, function(err, rows) {
        if (err) {
            console.log(err.message);
            return;
        }
        
        if (rows) {
            cbSuccess(rows);
        }
        else {
            cbFailure();
        }
    });
}
// #endregion

// #region Database Writes
/**
 * Increments credit for the given user
 * @param {int} userId - User Discord ID
 * @param {function} cbSuccess - Callback to execute if write operation succeeded
 * @param {function} cbFailure - Callback to execute if write operation failed
 */
function qryAddCredit(userId, cbSuccess, cbFailure) {
    var sql = `UPDATE Users SET NumCredits = NumCredits + 1 WHERE DiscordId = ?`;
    qryRunCore(sql, [userId], cbSuccess, cbFailure);
}

/**
 * Sets paid timestamp for given user and also decrements credit for skipped users
 * @param {int} userId - User Discord ID
 * @param {function} cbSuccess - Callback to execute if write operation succeeded
 * @param {function} cbFailure - Callback to execute if write operation failed
 */
function qrySetPaidTimestamp(userId, cbSuccess, cbFailure) {
    var now = Date.now();
    var sql = ` UPDATE Users 
                SET 
                    LastPaidUTC = ?, 
                    NumCredits = 
                        CASE
                            WHEN NumCredits > 0 THEN NumCredits - 1
                            ELSE 0
                        END
                WHERE DiscordId = ? OR (NumCredits > 0 AND LastPaidUTC < ?);`;
    qryRunCore(sql, [now, userId, now], cbSuccess, cbFailure);
}

/**
 * Adds user to the rotation
 * @param {int} userId - User Discord ID
 * @param {string} userName - User Discord Name
 * @param {function} cbSuccess - Callback to execute if write operation succeeded
 * @param {function} cbFailure - Callback to execute if write operation failed
 */
function qryAddUser(userId, userName, cbSuccess, cbFailure) {
    var sql = 'INSERT INTO Users (DiscordId, UserName) VALUES (?, ?)';
    qryRunCore(sql, [userId, userName], cbSuccess, cbFailure);
}

/**
 * Remove user from the rotation
 * @param {int} userId - User Discord ID
 * @param {function} cbSuccess - Callback to execute if write operation succeeded
 * @param {function} cbFailure - Callback to execute if write operation failed
 */
function qryDeleteUser(userId, cbSuccess, cbFailure) {
    var sql = 'DELETE FROM Users WHERE DiscordId = ?';
    qryRunCore(sql, [userId], cbSuccess, cbFailure);
}

/**
 * Helper function to execute an insert or update and execute callbacks
 * @param {string} sql - Query statement to execute
 * @param {Array} params - Array of parameters to supply to query
 * @param {function} cbSuccess - Callback to execute if write operation succeeded
 * @param {function} cbFailure - Callback to execute if write operation failed
 */
function qryRunCore(sql, params, cbSuccess, cbFailure) {
    db.run(sql, params, function(err) {
        if (err) {
            console.log(err.message);
            return;
        }
        
        if (this.changes > 0) {
            cbSuccess();
        }
        else {
            cbFailure();
        }
    });
}
// #endregion

// #region Misc Helpers
/**
 * Create closure for reacting to a message
 * @param {Object} objMessage - Discord Message object
 * @param {string} emoji - Emoji to react with
 */
function createReactionClosure(objMessage, emoji) {
    return function() { objMessage.react(emoji); }
}
// #endregion