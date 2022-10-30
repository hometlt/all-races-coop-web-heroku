import fs from "fs"
import {
  removeDummyRaces,
  removeIgnoredEntities,
  removeOtherRaceEntities,
  removeUnusedAbilityCommands,
  resolveActorsEvents,
  resolveImagesTags,
  resolveUnitIcons,
  simplifyUnitsCommandCards,
  AssignData,
  getJSONData,
  readImages,
  readXMLFile
} from "./data-parser.mjs";

async function make(){
  let structure = JSON.parse(fs.readFileSync("./structure.json", {encoding: 'utf-8'}))
  let gamedata = {}
  let files = ["Abil","Actor","Behavior","Button","Effect","Footprint","Model","Race","Requirement","Skin","Sound","Unit","Upgrade","Validator","Weapon"]
  let catalogs = {}
  for(let includedFile of files){
    let catalogData = await readXMLFile(`./gamedata/${includedFile}Data.xml`,true)
    if(!catalogData){
      console.log("File not found: "+ includedFile)
    }
    else{
      catalogs[includedFile] = catalogData.Catalog
      AssignData(gamedata, catalogData.Catalog,structure)
    }
  }

  gamedata.icons = readImages('./../src/assets/buttons/')
  removeDummyRaces(gamedata)
  removeOtherRaceEntities(gamedata)
  removeIgnoredEntities(gamedata)
  resolveActorsEvents(gamedata.actors,gamedata.units)
  resolveImagesTags(gamedata)
  // removeDummyUnits(gamedata.units)
  resolveUnitIcons(gamedata.units,gamedata.actors)
  simplifyUnitsCommandCards(gamedata.units)
  removeUnusedAbilityCommands(gamedata.abilities)

  let finalDataBeautified = getJSONData(gamedata)
  fs.writeFileSync("./gamedata.json",finalDataBeautified)
}

await make()
