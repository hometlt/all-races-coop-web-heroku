import express from  'express'
import serveStatic from 'serve-static'
import cors from 'cors'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {hotsRouter} from "./services/hots/hots.mjs"
import {dataRouter} from "./server/data.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname)

let port = process.env.PORT || process.argv[3] || 5001

let app = express()
app.use(cors());

// app.use('/icons',serveStatic(__dirname + "/icons"))

app.use('/icon/:icon', function (req, res) {res.sendFile(`${__dirname}/services/icon/${req.params.icon}.png`)});

app.use('/info',serveStatic(__dirname + "/services/info"))

app.use('/tech',serveStatic(__dirname + "/services/tech"))

app.use('/data', dataRouter);

app.use('/hots', hotsRouter);

app.listen(port)

console.log('server started ' + port)
