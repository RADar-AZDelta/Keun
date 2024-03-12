import { writeFileSync } from 'fs'
import { config } from 'dotenv'
import packageJson from './package.json' with { type: 'json' }

const env = config().parsed

const databaseIsFirebase = env.PUBLIC_CLOUD_DATABASE_IMPLEMENTATION?.toLowerCase() === 'firebase'
const authIsFirebase = env.PUBLIC_CLOUD_AUTH_IMPLEMENTATION?.toLowerCase() === 'firebase'

if (databaseIsFirebase || authIsFirebase)
  packageJson.dependencies['@radar-azdelta-int/radar-firebase-utils'] = '^0.0.21'
else delete packageJson.dependencies['@radar-azdelta-int/radar-firebase-utils']

writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))
