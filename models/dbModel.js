const _ = require('lodash');
const sqlite = require('sqlite3').verbose();
const async = require('async');

module.exports = class DbModel {

  static getDbConn(cb) {
    let conn = new sqlite.Database(':memory:');
    return cb(null, conn);
  }

  static initDb(cb) {
    // TODO: Don't hardcode these statements in a production env
    let conn = new sqlite.Database(':memory:');
    async.series([

      (callback) => { conn.run(`DROP TABLE IF EXISTS games;`, [], callback); }, 

      (callback) => { conn.run(`CREATE TABLE games (
        game_id INTEGER PRIMARY KEY,
        board TEXT NOT NULL,
        turn_player_id INTEGER NOT NULL,
        state_id INTEGER NOT NULL,
        winner_player_id INTEGER
      );`, [], callback); },

      (callback) => { conn.run(`DROP TABLE IF EXISTS states;`, [], callback); },

      (callback) => { conn.run(`CREATE TABLE states (
        state_id INTEGER PRIMARY KEY,
        description TEXT NOT NULL
      );`, [], callback); },

      (callback) => { conn.run(`DROP TABLE IF EXISTS players;`, [], callback); },

      (callback) => { conn.run(`CREATE TABLE players (
        player_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );`, [], callback); },

      (callback) => { conn.run(`DROP TABLE IF EXISTS player_games;`, [], callback); },

      (callback) => { conn.run(`CREATE TABLE player_games (
        player_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL
      );`, [], callback); },

      (callback) => { conn.run(`DROP TABLE IF EXISTS moves;`, [], callback); },

      (callback) => { conn.run(`CREATE TABLE moves (
        move_id INTEGER PRIMARY KEY,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        type_id INTEGER NOT NULL,
        move_number INTEGER NOT NULL,
        column INTEGER NOT NULL
      );`, [], callback); },

      (callback) => { conn.run(`DROP TABLE IF EXISTS move_types;`, [], callback); },

      (callback) => { conn.run(`CREATE TABLE move_types (
        type_id INTEGER PRIMARY KEY,
        description TEXT NOT NULL
      );`, [], callback); },

      (callback) => { conn.run(`INSERT INTO states(description) VALUES ('DONE'),('IN_PROGRESS');`, [], callback); },

      (callback) => { conn.run(`INSERT INTO move_types(description) VALUES ('MOVE'),('QUIT');`, [], callback); },

      (callback) => { conn.run(`INSERT INTO players(name) VALUES ('player1'),('player2');`, [], callback); },

      // Removed only because we're using in-memory SQLite
      // TODO: support psql
      //(callback) => { DbModel.closeConn(conn, callback); }

    ], (err) => {
      cb(err, conn);
    });
  }

  static getAll(conn, queryObj, cb) {
    let params = _.get(queryObj, 'values', []);
    conn.all(queryObj.text, params, cb);
  }

  static insert(conn, queryObj, cb) {
    let params = _.get(queryObj, 'values', []);
    conn.run(queryObj.text, params, function(err) {
      return cb(err, this.lastID);
    });
  }

  static closeConn(conn, cb) {
    // Removed only because we're using in-memory SQLite
    // TODO: support psql
    // conn.close(cb);
    return cb();
  }
  
};
