# 98point6 Drop Token Service

## Implementation notes:

 - I used SQLite as the DB for the service because it makes installation/setup
  way easier. In a scalable and distributed environment I would absolutely use
  a hosted datastore. But this also lets me write all the same queries that I
  would likely use in that situation, too.
 
 - On a related note, I'm using the SQLite in-memory option for DB creation.
  The upside to this is that I don't have to deal with file permissions/io.
  The downside is that it will erase itself every time the service is 
  restarted. In a production environment, this would all be on a hosted 
  datastore and wouldn't be a problem.

  - external guids vs game id

  - since using in memory db, have to pass connection object around and leave it open
  - why node

  - index the tables

  - vague error response on missing url params

  - content type raw/json


## Future enhancements:

 - Ability to print some kind of display (even if its primitive)
 - Ability to create player accounts, with all the auth that goes with them
 - Ability to add a custom-sized game board of any number of rows and columns
 - Ability to customize rules, for example, requiring 3 or 5 in a row to win
 - AI to play the game singleplayer
 - Admin endpoints to manage users and games
 - More than two players