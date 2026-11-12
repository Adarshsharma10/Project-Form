# Project Management Form

A Bootstrap form for the **Project Management Form** micro project. It stores records in the `PROJECT-TABLE` relation of the `COLLEGE-DB` database using JSONPowerDB.

## Setup

1. Copy `config.example.js` to `config.js`.
2. Open the local `config.js` and paste your JSONPowerDB connection token into `token`. This file is ignored by Git.
3. Confirm that the database/relation names match your JSONPowerDB account. The starter values are `COLLEGE-DB` and `PROJECT-TABLE`.
4. Serve this folder from a local web server (for example, VS Code Live Server) and open `index.html`. The form uses Bootstrap from jsDelivr and the JSONPowerDB REST API, so it needs internet access.

The first saved record creates the relation as needed and indexes the fields, including `Project-ID`, which the form uses for `GET_BY_KEY`. The JSONPowerDB token is used in browser requests, so treat it as a credential and never commit `config.js`. The app uses the HTTPS endpoint on port 5577.

## Form behavior

- On load and Reset, only Project ID is enabled and focused.
- Enter or leave Project ID to look up the record. A missing ID enables Save; an existing ID loads its fields and enables Update.
- Save and Update require all fields. Deadline must be on or after Assignment Date.
- A successful save/update clears the form and returns focus to Project ID.

The database field names are `Project-ID`, `Project-Name`, `Assigned-To`, `Assignment-Date`, and `Deadline`.
