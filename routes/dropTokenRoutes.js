const DropTokenActions = require('../actions/dropTokenActions');

module.exports = {
  baseRoute: 'drop_token',
  subRoutes: {

    getGames: {
      routePath: '',
      action: DropTokenActions.getAllGames
    },

    newGame: {
      routePath: '',
      method: 'POST',
      action: DropTokenActions.newGame,
      postParams: {
        players: { required: true, type: 'nonEmptyArray' },
        columns: { required: true, type: 'int' },
        rows: { required: true, type: 'int' }
      }
    },

    getGameById: {
      routePath: ':gameId',
      action: DropTokenActions.getGameById,
      urlParams: {
        gameId: { required: true, type: 'nonEmptyString' }
      }
    },

    getMoveset: {
      routePath: ':gameId/moves',
      action: DropTokenActions.getMoveset,
      urlParams: {
        gameId: { required: true, type: 'nonEmptyString' }
      },
      queryParams: {
        start: { type: 'id' },
        until: { type: 'id' }
      }
    },

    move: {
      routePath: ':gameId/:playerId',
      method: 'POST',
      action: DropTokenActions.move,
      urlParams: {
        gameId: { required: true, type: 'nonEmptyString' },
        playerId: { required: true, type: 'nonEmptyString' }
      },
      postParams: {
        column: { required: true, type: 'int' }
      }
    },

    getMove: {
      routePath: ':gameId/moves/:moveNum',
      action: DropTokenActions.getMove,
      urlParams: {
        gameId: { required: true, type: 'nonEmptyString' },
        moveNum: { required: true, type: 'nonEmptyString' }
      }
    },

    quit: {
      routePath: ':gameId/:playerId',
      method: 'DELETE',
      action: DropTokenActions.quit,
      urlParams: {
        gameId: { required: true, type: 'nonEmptyString' },
        playerId: { required: true, type: 'nonEmptyString' }
      }
    }
  }
};
