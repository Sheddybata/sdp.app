# INEC geography data (State → LGA → Ward → Polling units)

Generated from [mykeels/inec-polling-units](https://github.com/mykeels/inec-polling-units) CSV.

- **index.json** — list of states (`{ id, name }`)
- **&lt;stateId&gt;.json** — full hierarchy for one state (lgas → wards → pollingUnits)

To regenerate (e.g. when INEC updates the repo):

```bash
npm run extract-inec
```

This downloads `polling-units.csv` from GitHub and writes the JSON files here.  
To use a local CSV instead (no network):  
`INEC_CSV_PATH=./polling-units.csv npm run extract-inec`
