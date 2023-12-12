import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { json, type RequestHandler } from '@sveltejs/kit'
import Database, { type Database as DB } from 'better-sqlite3'
import type { IFile } from '$lib/components/Types'

let db: DB
let tableExistance: boolean = false
const required: string[] = ['id', 'name', 'version', 'authors', 'content']

///////////////////////////////////////////////////////////// HTTP REQUESTS /////////////////////////////////////////////////////////////

export const GET: RequestHandler = async ({ url }) => {
  const info = url.searchParams.get('info')
  const id = url.searchParams.get('id')
  if (!tableExistance) await createTable()
  if (id) return await getFile(info ? true : false, id)
  else return await getFiles(info ? true : false)
}

export const POST: RequestHandler = async ({ request }) => {
  // Implement authentication & check if the person has the corresponding role to use this action
  if (!tableExistance) await createTable()
  const body = await request.json()
  if (!body || !body.file)
    return await writeLog('POST: Provide a body with a file object with the correct properties.', body)
  const file: IFile = body.file
  const missingMessage = await checkForMissingValues(required, file)
  if (missingMessage) return missingMessage
  return await insertFile(file)
}

export const PUT: RequestHandler = async ({ url, request }) => {
  // Implement authentication & check if the person has the corresponding role to use this action
  const authors = url.searchParams.get('authors')
  if (!tableExistance) await createTable()
  const body = await request.json()
  if (!body) return await writeLog('PUT: Provide a body', body)
  if (authors === null) {
    if (!body || !body.file)
      return await writeLog('PUT: Provide a body with a file object with the correct properties', body)
    const content = body.content
    const id = body.id
    return await updateFileContent(content, id)
  } else {
    if (!body || !body.id || !body.authors)
      return await writeLog('PUT: Provide a body with an id and a list of authors', body)
    const { id, authors } = body
    return await updateFileAuthorsById(authors, id)
  }
}

export const DELETE: RequestHandler = async ({ request }) => {
  // Implement authentication & check if the person has the corresponding role to use this action
  if (!tableExistance) await createTable()
  const body = await request.json()
  if (!body || !body.id) return await writeLog('DELETE: Provide the id of the file to delete in the body.', body)
  return await deleteFileById(body.id)
}

///////////////////////////////////////////////////////////// Helper functions /////////////////////////////////////////////////////////////

async function createTable() {
  await createDatabase()
  tableExistance = await checkTableExistance()
  if (tableExistance) return
  const createQuery =
    'CREATE TABLE file (id  STRING PRIMARY KEY  NOT NULL, name   TEXT  NOT NULL, authors   TEXT    NOT NULL, version    TEXT    NOT NULL, content   TEXT    NOT NULL);'
  try {
    const stmnt = db.prepare(createQuery)
    const res = stmnt.run()
    await saveToDatabase()
    tableExistance = true
    return json({
      result: 'success',
      message: 'Created table file',
      details: res,
    })
  } catch (e) {
    return await writeLog('CREATE TABLE: Could not create the table file in the database', e)
  }
}

async function checkTableExistance() {
  const query = 'SELECT name FROM sqlite_master WHERE type = \'table\' AND name= \'file\''
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
  if (missing.length > 0)
    return json({
      result: 'error',
      message: 'The following properties were missing from the file: ',
      missing,
      detail: '',
    })
}

///////////////////////////////////////////////////////////// Database executing functions /////////////////////////////////////////////////////////////

async function getFile(info: boolean | null, id: string) {
  try {
    const query = info
      ? 'SELECT id, version, name, authors FROM file WHERE id = $id;'
      : 'SELECT * FROM file WHERE id = $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.get({ id })
    return messageReturn(`Read the file: ${id} correctly`, res)
  } catch (e) {
    return await writeLog(`GET: Could not get the file: ${id}`, e)
  }
}

async function getFiles(info: boolean | null) {
  try {
    const query = info ? 'SELECT id, version, name, authors FROM file;' : 'SELECT * FROM file;'
    const stmnt = db.prepare(query)
    const res = stmnt.all()
    return messageReturn('Read the projects correctly', res)
  } catch (e) {
    return await writeLog('GET: Could not get the files', e)
  }
}

async function insertFile(file: IFile) {
  try {
    file.authors = JSON.stringify(file.authors)
    const query =
      'INSERT INTO file (id, name, version, authors, content) VALUES ($id, $name, $version, $authors, $content);'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ ...file })
    await saveToDatabase()
    return messageReturn(`Created the record for ${file.name}`, res)
  } catch (e) {
    return await writeLog(`POST: Could not add the file ${file.name} to the database.`, e)
  }
}

async function updateFileContent(content: string, id: string) {
  try {
    const query = 'UPDATE file SET content = $content WHERE id = $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ content, id })
    await saveToDatabase()
    return messageReturn(`Updated the record with id ${id}`, res)
  } catch (e) {
    return await writeLog(`PUT: Could not update the file with id ${id}`, e)
  }
}

async function updateFileAuthorsById(authors: string[], id: string) {
  try {
    const authorsString = JSON.stringify(authors)
    const query = 'UPDATE file SET authors = $authors WHERE id = $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ authors: authorsString, id })
    await saveToDatabase()
    return messageReturn(`Updated the authors of file ${id}`, res)
  } catch (e) {
    return await writeLog(`PUT: Could not update the authors of the file with id ${id}`, e)
  }
}

async function deleteFileById(id: string) {
  try {
    const query = 'DELETE FROM file WHERE id == $id;'
    const stmnt = db.prepare(query)
    const res = stmnt.run({ id })
    await saveToDatabase()
    return messageReturn(`Deleted the record of file ${id}`, res)
  } catch (e) {
    return await writeLog(`DELETE: Could not delete the record with id ${id}`, e)
  }
}
