// import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
// import { json } from '@sveltejs/kit'
// import Database, { type Database as DB } from 'better-sqlite3'

// let db: DB
// let tableExistance: boolean = false

///////////////////////////////////////////////////////////// HTTP REQUESTS /////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////// Helper functions /////////////////////////////////////////////////////////////

// async function createTable() {
//   await createDatabase()
//   tableExistance = await checkTableExistance()
//   if (tableExistance) return
//   const createQuery =
//     'CREATE TABLE projects (id  STRING PRIMARY KEY  NOT NULL, projectId   TEXT  NOT NULL, project   TEXT    NOT NULL, budget    TEXT    NOT NULL, personalStake TEXT    NOT NULL, scope TEXT    NOT NULL, time  TEXT    NOT NULL, strategicGoal  TEXT    NOT NULL, operationGoal TEXT    NOT NULL, projectGoalMain   TEXT    NOT NULL, projectGoalsSide    TEXT, department    TEXT    NOT NULL, projectStatus TEXT    NOT NULL, request  TEXT    NOT NULL, fiche  TEXT    NOT NULL, ficheChanges  NUMBER, budgetCode    TEXT    NOT NULL, sponsor   TEXT    NOT NULL, positionHolder    TEXT    NOT NULL, projectLeader TEXT    NOT NULL, doctor    TEXT, type  TEXT    NOT NULL, priority  TEXT    NOT NULL, dependencies  TEXT, riskAnalyses TEXT    NOT NULL, startDate  TEXT    NOT NULL, initialTargetDate TEXT    NOT NULL, newTargetDate TEXT, endDate   TEXT, duration  NUMBER  NOT NULL, BO    NUMBER  NOT NULL, BOValidation  NUMBER, MR    NUMBER NOT NULL, MRValidation  NUMBER, comments  TEXT, archived  NUMBER, projectDescription    TEXT, milestones    TEXT, currentSituation  TEXT, historicChangesFiche  TEXT, feedback  TEXT);'
//   try {
//     const stmnt = db.prepare(createQuery)
//     const res = stmnt.run()
//     await saveToDatabase()
//     tableExistance = true
//     return json({
//       result: 'success',
//       message: 'Created table projects',
//       details: res,
//     })
//   } catch (e) {
//     return await writeLog('CREATE TABLE: Could not create the table projects in the database', e)
//   }
// }

// async function checkTableExistance() {
//   const query = 'SELECT name FROM sqlite_master WHERE type = \'table\' AND name= \'projects\''
//   const stmnt = db.prepare(query)
//   const res = stmnt.get()
//   return res ? true : false
// }

// async function createDatabase() {
//   if (existsSync('database.sqlite3')) db = new Database(readFileSync('database.sqlite3'))
//   else if (!db) {
//     db = new Database('database.sqlite3')
//     saveToDatabase()
//   }
// }

// async function saveToDatabase() {
//   writeFileSync('database.sqlite3', db.serialize())
// }

// async function writeLog(message: string, details: any) {
//   const error = `\n\nError (${new Date().getTime()})\n${message}\n${
//     typeof details === 'object' ? JSON.stringify(details) : details
//   }`
//   appendFileSync('errorLogs.txt', error)
//   return json({ result: 'error', message, details })
// }

// async function checkForMissingValues(required: string[], settings: any) {
//   const missing: string[] = []
//   for (const req of required) if (!settings[req]) missing.push(req)
//   if (missing.length > 0)
//     return json({
//       result: 'error',
//       message: 'The following properties were missing from the settings: ',
//       missing,
//       detail: '',
//     })
// }

///////////////////////////////////////////////////////////// Database executing functions /////////////////////////////////////////////////////////////
