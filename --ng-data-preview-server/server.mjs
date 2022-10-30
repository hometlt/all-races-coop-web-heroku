import express from  'express'
import cors from 'cors'
import fs from 'fs'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {getJSONData} from "../../all-races-server/src/data-parser.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname)
console.log('Starting directory: ' + process.cwd());



export function getImagesList (locale) {
  return readImages('./../src/assets/buttons/')
}
export function getGameStrings (locale) {
  return  readTextFile(`./locales/${locale}/GameStrings.txt`)
}
export function getGameHotkeys (locale) {
  return  readTextFile(`./locales/${locale}/GameHotkeys.txt`)
}

let gamedata = JSON.parse(fs.readFileSync("./gamedata.json", {encoding: 'utf-8'}))
let app = express()
app.use(cors());
app.use((req, res, next) => { console.log('Time: %d', Date.now()); next()})
app.get('/', function (req, res) {
  res.json(gamedata)
})
app.get('/units', function (req, res) {
  let data = Object
    .entries(gamedata.units)
    .map(([key, value]) => ({...value, id: key}))
    .filter(item => item.race === "Terr")


  res.json(data)
})
app.get('/upgrades', function (req, res) {
  res.json(gamedata.upgrades)
})
app.get('/units/:id', function (req, res, next) {
  res.json(gamedata.units[req.params.id])
})
app.get('/data/:catalog/:id', function (req, res, next) {
  res.end(getJSONData(gamedata[req.params.catalog][req.params.id]))
})
app.listen(3000)
