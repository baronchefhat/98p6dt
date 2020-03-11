const _ = require('lodash');
const DbModel = require('./dbModel');

module.exports = class DropTokenModel extends DbModel {

  static getAllInProgressGameIDs(conn, data, cb) {
    let queryObj = {
      text: `
        SELECT g.game_id 
        FROM games AS g
        JOIN states AS s ON (s.state_id = g.state_id)
        WHERE s.description = 'IN_PROGRESS'
      ;`
    };
    DbModel.getAll(conn, queryObj, cb);
  }

  static getAllPlayersByNames(conn, data, cb) {
    // TODO: Support more than two players
    let queryObj = {
      text: `
        SELECT *
        FROM players
        WHERE name = ? 
        OR name = ?
      ;`,
      values: [data.players[0], data.players[1]]
    };
    DbModel.getAll(conn, queryObj, cb);
  }

  static newPlayer(conn, data, cb) {
    let queryObj = {
      text: `INSERT INTO players('name') VALUES (?);`,
      values: [data.playerName]
    };
    DbModel.insert(conn, queryObj, cb);
  }

  static newGame(conn, data, cb) {
    let board;
    try {
      board = JSON.stringify(data.board)
    } catch(err) {
      return cb(new Error('Could not convert board data to JSON'));
    }
    let queryObj = {
      text: `INSERT INTO games('board','turn_player_id','state_id') VALUES (?,?,
        (SELECT state_id FROM states WHERE description = 'IN_PROGRESS')
      );`,
      values: [board, data.playerTurnId]
    };
    DbModel.insert(conn, queryObj, cb);
  }

  static linkPlayersToGame(conn, data, cb) {
    let queryObj = {
      text: `INSERT INTO player_games('player_id','game_id') VALUES (?,?),(?,?);`,
      values: [
        data.players[0],
        data.gameId,
        data.players[1],
        data.gameId
      ]
    };
    DbModel.insert(conn, queryObj, cb);
  }

  static getGameById(conn, data, cb) {
    let queryObj = {
      text: `
        SELECT *
        FROM games AS g
        JOIN player_games AS pg ON (pg.game_id = g.game_id)
        JOIN players AS p ON (p.player_id = pg.player_id)
        JOIN states AS s ON (s.state_id = g.state_id)
        WHERE g.game_id = ?
      ;`,
      values: [data.gameId]
    };
    DbModel.getAll(conn, queryObj, cb);
  }

  static getAllMovesForGame(conn, data, cb) {
    let queryObj = {
      text: `
        SELECT *
        FROM moves AS m
        JOIN move_types AS mt ON (mt.type_id = m.type_id)
        JOIN players AS p ON (p.player_id = m.player_id)
        JOIN games AS g ON (g.game_id = m.game_id)
        WHERE g.game_id = ?
      ;`,
      values: [data.gameId]
    };
    DbModel.getAll(conn, queryObj, cb);
  }
};
