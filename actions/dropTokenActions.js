const async = require('async');
const _ = require('lodash');

const DropTokenModel = require('../models/dropTokenModel');

module.exports = class DropTokenActions {

  static getAllGames(conn, payload, cb) {
    DropTokenModel.getAllInProgressGameIDs(conn, {}, (err, results) => {
      if (err) return cb(err);
      let gamesList = _.map(results, 'game_id');
      return cb(null, {games: gamesList});
    });
  }

  static newGame(conn, payload, cb) {
    async.auto({
      suppliedPlayers: (callback) => {
        if (payload.players.length != 2) {
          return callback(new Error('Only two-player games are supported right now'));
        }
        async.each(payload.players, (playerName, playerCb) => {
          if (!_.isString(playerName)) {
            return playerCb(new Error('Each player name provided must be a string'));
          } else {
            return playerCb();
          }
        }, callback);
      },
      suppliedDimensions: (callback) => {
        if ((payload.columns != 4) || (payload.rows != 4)) {
          return callback(new Error('Only 4x4 games are supported right now'));
        } else {
          return callback();
        }
      },
      existingPlayers: [
        'suppliedDimensions', 
        'suppliedPlayers', 
        (results, callback) => {
          return DropTokenModel.getAllPlayersByNames(conn, {players: payload.players}, callback)
        }
      ],
      playerObjects: [
        'existingPlayers', 
        (results, callback) => {
          let existingPlayerNames = _.map(results.existingPlayers, 'name');
          async.each(payload.players, (playerName, playerCb) => {
            if (_.indexOf(existingPlayerNames, playerName) >= 0) {
              return playerCb();
            } else {
              return DropTokenModel.newPlayer(conn, {playerName}, playerCb);
            }
          }, callback);
        }
      ],
      databasePlayers: [
        'playerObjects',
        (results, callback) => {
          return DropTokenModel.getAllPlayersByNames(conn, {players: payload.players}, (err, dbPlayers) => {
            if (err) return callback(err)
            if (dbPlayers.length != payload.players.length) {
              return callback(new Error('Error creating new players'));
            } else {
              return callback(null, dbPlayers);
            }
          });
        }
      ],
      newGameId: [
        'databasePlayers',
        (results, callback) => {
          let board = [];
          for (let i = 0; i < payload.columns; i++) {
            let columnArr = [];
            for (let j = 0; j < payload.rows; j++) {
              columnArr.push(0);
            }
            board.push(columnArr);
          }
          let dbPlayers = results.databasePlayers;
          async.waterfall([
            (newGameCallback) => {
              DropTokenModel.newGame(conn, {
                board, 
                playerTurnId: dbPlayers[0].player_id
              }, newGameCallback);
            },
            (newGameId, linkPlayersCallback) => {
              let players = [dbPlayers[0].player_id, dbPlayers[1].player_id];
              DropTokenModel.linkPlayersToGame(conn, {
                players,
                gameId: newGameId
              }, (err, results) => {
                return linkPlayersCallback(err, newGameId);
              });
            }
          ], callback);
        }
      ]
    }, (err, results) => {
      return cb(err, {gameId: results.newGameId});
    });
  }

  static getGameById(conn, payload, cb) {
    DropTokenModel.getGameById(conn, {gameId: payload.gameId}, (err, results) => {
      if (err) return cb(err);
      if (_.isEmpty(results)) {
        let emptyErr = new Error('Game not found');
        emptyErr.statusCode = 404;
        return cb(emptyErr);
      } else {
        let players = _.map(results, 'name');
        let retObj = {
          players,
          state: results[0].description
        };
        let winnerId = _.get(results, '[0].winner_player_id');
        if (winnerId) {
          _.forEach(results, (resultRow) => {
            if (resultRow.player_id == winnerId) retObj.winner = resultRow.name;
          });
        }
        return cb(null, retObj);
      }
    });
  }

  static getMoveset(conn, payload, cb) {
    // TODO: implement start/until
    DropTokenModel.getAllMovesForGame(conn, {gameId: payload.gameId}, (err, results) => {
      if (err) return cb(err);
      let retMoves = _.map(results, (row) => {
        let type = row.description;
        let retObj = {
          type,
          player: row.name
        };
        if (type != 'QUIT') {
          retObj.column = row.column;
        }
        return retObj;
      });
      return cb(null, {moves: retMoves});
    });
  }

  static move(conn, payload, cb) {
    async.auto({
      gameData: (callback) => {
        DropTokenModel.getGameById(conn, {gameId: payload.gameId}, (err, results) => {
          if (err) return callback(err);

          if (_.isEmpty(results)) {
            let emptyErr = new Error('Game not found');
            emptyErr.statusCode = 404;
            return callback(emptyErr);
          }
          
          if (results[0].description == 'DONE') {
            let emptyErr = new Error('Game has already ended');
            emptyErr.statusCode = 404;
            return callback(emptyErr);
          }

          let board;
          try {
            board = JSON.parse(results[0].board);
          } catch(err) {
            return callback(new Error('Error decoding gameBoard'));
          }
          // Attach the decoded board object to each row instead of the encoded JSON
          results = _.map(results, (row) => {
            row.board = board;
            return row;
          });
          return callback(null, results);
        });
      },
      checkGameMove: [
        'gameData',
        (results, callback) => {
          let gameData = results.gameData;
          let playerInGame = false;
          let currentTurnPlayer;
          _.forEach(gameData, (row) => {
            if (row.turn_player_id == row.player_id) currentTurnPlayer = row.name;
            if (row.name == payload.playerId) playerInGame = true;
          });

          if (!playerInGame) {
            let err = new Error('Player is not playing in that game');
            err.statusCode = 404;
            return callback(err);
          }

          if (currentTurnPlayer != payload.playerId) {
            let err = new Error("It is not that player's turn");
            err.statusCode = 409;
            return callback(err);
          }

          let board = gameData[0].board;
          let selectedColumn = _.get(board, payload.column);
          if (!selectedColumn) {
            let err = new Error("That is not a valid column number");
            err.statusCode = 400;
            return callback(err);
          }

          let lastColumnElement = _.last(selectedColumn);
          if (lastColumnElement) {
            let err = new Error("That column is full");
            err.statusCode = 400;
            return callback(err);
          }

          return callback();
        }
      ],
      newBoard: [
        'gameData',
        'checkGameMove',
        (results, callback) => {
          let gameData = results.gameData;
          let board = gameData[0].board;
          let selectedColumn = board[payload.column];

          // TODO: More robust assignment if more than two players
          let playerId = gameData[0].player_id;
          if (gameData[1].name == payload.playerId) playerId = gameData[1].player_id;

          let selectedX = payload.column;
          let selectedY = 0;
          for (let y = 0; y < selectedColumn.length; y++) {
            // a 0 means the board is empty
            if (!selectedColumn[y]) {
              board[payload.column][y] = playerId;
              selectedY = y;
              break;
            }
          }

          // Check if this move ends the game
          let winnerId = null;
          // Check for horizontal win
          let horizontalVictory = true;
          for (let x = 0; x < board.length; x++) {
            if (board[x][selectedY] != playerId) horizontalVictory = false;
          }
          if (horizontalVictory) {
            winnerId = playerId;
          } else {
            // Check for a veritcal win
            let verticalVictory = true;
            for (let y = 0; y < board[selectedX].length; y++) {
              if (board[selectedX][y] != playerId) verticalVictory = false;
            }
            if (verticalVictory) {
              winnerId = playerId;
            } else {
              // Check for a diagonal win
              // TODO: More robust checking when not a 4x4 grid
              let diagonalVictory = false;
              if ((board[0][3] == playerId) &&
                  (board[1][2] == playerId) &&
                  (board[2][1] == playerId) &&
                  (board[3][0] == playerId)) {
                diagonalVictory = true;
              }
              if ((board[0][0] == playerId) &&
                  (board[1][1] == playerId) &&
                  (board[2][2] == playerId) &&
                  (board[3][3] == playerId)) {
                diagonalVictory = true;
              }
              if (diagonalVictory) {
                winnerId = playerId;
              }
            }
          }

          let retObj = {
            newBoard: board
          };
          if (winnerId) retObj.winnerId = winnerId;

          return callback(null, retObj);
        }
      ],
      recordChanges: [
        'gameData',
        'newBoard',
        (results, callback) => {
          okay write this part now
        }
      ]
    }, (err, results) => {
      return cb(err, results);
    });
  }
};
