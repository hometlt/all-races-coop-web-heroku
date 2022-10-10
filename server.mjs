import express from  'express'
import serveStatic from 'serve-static'
import cors from 'cors'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {hotsRouter} from "./server/disk/hots.mjs"
import {dataRouter} from "./server/data.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname)

let port = process.env.PORT || process.argv[3] || 5000

let app = express()
app.use(cors());
app.use('/icons',serveStatic(__dirname + "/icons"))
app.use('/icon/:icon', function (req, res) {res.sendFile(`${__dirname}/icons/${req.params.icon}.png`)});

app.use('/info',serveStatic(__dirname + "/ng-app"))
app.use('/tech',serveStatic(__dirname + "/vue-app"))
app.use((req, res, next) => { console.log('Time: %d', Date.now()); next()})

app.use('/data', dataRouter);
app.use('/hots', hotsRouter);

app.listen(port)

console.log('server started ' + port)
