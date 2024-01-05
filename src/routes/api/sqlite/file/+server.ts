import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { json, type RequestHandler } from '@sveltejs/kit'
import Database, { type Database as DB } from 'better-sqlite3'
import type { IFile } from '$lib/components/Types'

let db: DB
let tableExistance: boolean = false
const required: string[] = ['id', 'name', 'content']

///////////////////////////////////////////////////////////// HTTP REQUESTS /////////////////////////////////////////////////////////////

export const GET: RequestHandler = async ({ url }) => {
  const info = url.searchParams.get('info')
  const id = url.searchParams.get('id')
  const name = url.searchParams.get('name')
  const custom = url.searchParams.get('custom')
  if (!tableExistance) await createTable()
  if (id) return await getFile(custom ? true : false, info ? true : false, id)
  else if (name) return await getFileWithName(info ? true : false, name)
  else return await getFiles(info ? true : false)
}

export const POST: RequestHandler = async ({ request, url }) => {
  if (!tableExistance) await createTable()
  const custom = url.searchParams.get('custom')
  const body = await request.json()
  if (!body || !body.file)
    return await writeLog('POST: Provide a body with a file object with the correct properties.', body)
  const file: IFile = body.file
  const missingMessage = await checkForMissingValues(required, file)
  if (missingMessage) return missingMessage
  return await insertFile(custom ? true : false, file)
}

export const PUT: RequestHandler = async ({ url, request }) => {
  if (!tableExistance) await createTable()
  const custom = url.searchParams.get('custom')
  const body = await request.json()
  if (!body) return await writeLog('PUT: Provide a body', body)
  if (!body || !body.content || !body.id)
    return await writeLog('PUT: Provide a body with a file object with the correct properties', body)
  const { content, id } = body
  return await updateFileContent(custom ? true : false, content, id)
}

export const DELETE: RequestHandler = async ({ request, url }) => {
  if (!tableExistance) await createTable()
  const custom = url.searchParams.get('custom')
  const body = await request.json()
  if (!body || !body.id) return await writeLog('DELETE: Provide the id of the file to delete in the body.', body)
  return await deleteFileById(custom ? true : false, body.id)
}

///////////////////////////////////////////////////////////// Helper functions /////////////////////////////////////////////////////////////

async function createTable() {
  await createDatabase()
  tableExistance = await checkTableExistance()
  if (tableExistance) return
  const createQuery =
    'CREATE TABLE file (id  STRING PRIMARY KEY  NOT NULL, name   TEXT  NOT NULL, content   TEXT    NOT NULL);'
  const createCustomQuery =
    'CREATE TABLE customFile (id  STRING PRIMARY KEY  NOT NULL, name   TEXT  NOT NULL, content   TEXT    NOT NULL);'
  try {
    const stmnt = db.prepare(createQuery)
    const res = stmnt.run()
    const customStmnt = db.prepare(createCustomQuery)
    const customRes = customStmnt.run()
    await saveToDatabase()
    tableExistance = true
    return messageReturn('Created table file', [res, customRes])
  } catch (e) {
    return await writeLog('CREATE TABLE: Could not create the table file in the database', e)
  }
}

async function checkTableExistance() {
  const query = "SELECT name FROM sqlite_master WHERE type = 'table' AND name= 'file'"
  const stmnt = db.prepare(query)
  const res = stmnt.get()
  return res ? true : false
}

async function createDatabase() {
  if (existsSync('database.sqlite3')) db = new Database(readFileSync('database.sqlite3'))
  else if (!db) {
    db = new Database('database.sqlite3')
    saveToDatabase()
  }
}

async function saveToDatabase() {
  writeFileSync('database.sqlite3', db.serialize())
}

async function writeLog(message: string, details: any) {
  const error = `\n\nError (${new Date().getTime()})\n${message}\n${
    typeof details === 'object' ? JSON.stringify(details) : details
  }`
  appendFileSync('errorLogs.txt', error)
  return json({ result: 'error', message, details })
}

async function messageReturn(message: string, details: any) {
  return json({ result: 'success', message, details })
}

async function checkForMissingValues(required: string[], file: any) {
  const missing: string[] = []
  for (const req of required) if (!file[req]) missing.push(req)
  if (missing.length > 0) return writeLog('Properties were missing from the file', missing)
}

///////////////////////////////////////////////////////////// Database executing functions /////////////////////////////////////////////////////////////

async function getFile(custom: boolean | null, info: boolean | null, id: string) {
  try {
    let query: string = ''
    if (info && custom) query = 'SELECT name, authors FROM customFile WHERE id = $id;'
    else if (custom) query = 'SELECT * FROM customFile WHERE id = $id;'
    else if (info) query = 'SELECT name, authors FROM file WHERE id = $id;'
    else query = 'SELECT * FROM file WHERE id = $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.get({ id, table: custom ? 'customFile' : 'file' })
    return messageReturn(`Read the file: ${id} correctly`, res)
  } catch (e) {
    return await writeLog(`GET: Could not get the file: ${id}`, e)
  }
}

async function getFileWithName(info: boolean, name: string) {
  try {
    const query = info ? 'SELECT name, authors FROM file WHERE name = $name;' : 'SELECT * FROM file WHERE name = $name;'
    const stmnt = db.prepare(query)
    const res = stmnt.get({ name })
    return messageReturn(`Read the file: ${name} correctly`, res)
  } catch (e) {
    return await writeLog(`GET: Could not get the file: ${name}`, e)
  }
}

async function getFiles(info: boolean | null) {
  try {
    const query = info ? 'SELECT id, name FROM file;' : 'SELECT * FROM file;'
    const stmnt = db.prepare(query)
    const res = stmnt.all()
    return messageReturn('Read the projects correctly', res)
  } catch (e) {
    return await writeLog('GET: Could not get the files', e)
  }
}

async function insertFile(custom: boolean, file: IFile) {
  try {
    console.log('INSERTING FILE ', file, ' AND CUSTOM ', custom)
    const query = custom
      ? 'INSERT INTO customFile (id, name, content) VALUES ($id, $name, $content);'
      : 'INSERT INTO file (id, name, content) VALUES ($id, $name, $content);'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ table: custom ? 'customFile' : 'file', ...file })
    await saveToDatabase()
    return messageReturn(`Created the record for ${file.name}`, res)
  } catch (e) {
    return await writeLog(`POST: Could not add the file ${file.name} to the database.`, e)
  }
}

async function updateFileContent(custom: boolean, content: string, id: string) {
  try {
    const query = custom
      ? 'UPDATE customFile SET content = $content WHERE id = $id;'
      : 'UPDATE file SET content = $content WHERE id = $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ content, id })
    await saveToDatabase()
    return messageReturn(`Updated the record with id ${id}`, res)
  } catch (e) {
    return await writeLog(`PUT: Could not update the file with id ${id}`, e)
  }
}

async function deleteFileById(custom: boolean, id: string) {
  try {
    const query = custom ? 'DELETE FROM customFile WHERE id == $id;' : 'DELETE FROM file WHERE id == $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ id })
    await saveToDatabase()
    return messageReturn(`Deleted the record of file ${id}`, res)
  } catch (e) {
    return await writeLog(`DELETE: Could not delete the record with id ${id}`, e)
  }
}
