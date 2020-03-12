# 98point6 Drop Token Service

## Prerequisites:
 - NodeJS (https://nodejs.org)

## Installation instructions:
 1. Download/Clone this repo to somewhere on your hard drive
 2. Navigate to the code's base directory (the location of this repo's package.json)
 3. Run `npm install` to automatically install all of the service's dependencies
 4. Run `node server.js` to start up the service
 5. You can now make requests at `localhost:{port}/drop_token/...`

 NOTE: By default the service runs on port 3020, but this can be modified by changing the value inside `config.json`

## Implementation notes:

 - I used SQLite as the DB for the service because it makes installation/setup
  way easier. In a scalable and distributed environment I would absolutely use
  a hosted datastore. But this also lets me write all the same queries that I
  would likely use in that situation, too.

 - On a related note, I'm using the SQLite in-memory option for DB creation.
  The upside to this is that we don't have to deal with file permissions/io.
  The downside is that it will erase itself every time the service is
  restarted. In a production environment, this would all be on a hosted
  datastore and wouldn't be a problem.
