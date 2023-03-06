import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
// add a route that lives separately from the SvelteKit app
app.get('/healthcheck', (req, res) => {
  res.end('ok')
})
app.listen(3000, () => {
  console.log('listening on port 3000')
})
