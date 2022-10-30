import fs from 'fs'
 import objectAssignDeep from "object-assign-deep"
 import {structure} from "./server/structure.mjs"

import {
    AssignData,
    readStructureRecoursve,removeDummyUnits,
    removeUndefinedValues,readXMLFile,getImagesList,
    resolveParents,IGNORE,config, getJSONData, readImages, removeDummyRaces, removeIgnoredEntities,
    removeOtherRaceEntities, removeUnusedAbilityCommands, resolveActorsEvents,
    resolveImagesTags, simplifyUnitsCommandCards} from "./server/data-parser.mjs";

async function run(){

    let gameData = {}
    for(let includedFile of config.gameDataFiles){
        let data = await readXMLFile("./data/GameData/" + includedFile,true)

        if(data?.Catalog?.constructor === Object ){
            AssignData(gameData, data.Catalog,structure)
        }
    }
    let icons = getImagesList()


    objectAssignDeep(gameData,{
        units: {
            DESTRUCTIBLE: IGNORE,
            POWERUP: IGNORE,
            STARMAP: IGNORE,
            SS_Plane: IGNORE,
            SS_BackgroundSpace: IGNORE,
            Shape: IGNORE,
            MISSILE_INVULNERABLE: IGNORE,
            MISSILE: IGNORE,
            MISSILE_HALFLIFE: IGNORE,
            PLACEHOLDER: IGNORE,
            PLACEHOLDER_AIR: IGNORE,
            PATHINGBLOCKER: IGNORE,
            BEACON: IGNORE,
            SMCHARACTER: IGNORE,
            SMCAMERA: IGNORE,
            SMSET: IGNORE,
            ITEM: IGNORE,
        }
    })




    removeUndefinedValues(gameData)
    resolveParents(gameData,structure)
    readStructureRecoursve(gameData,structure)

    // removeDummyRaces(gameData)
    // removeOtherRaceEntities(gameData)
    // removeIgnoredEntities(gameData)
    // removeDummyUnits(gameData.units)


    for(let catalog in gameData) {

        for (let entity in gameData[catalog]) {
            gameData[catalog][entity].id = entity;
        }
    }

    resolveActorsEvents(gameData.actors,gameData.units)
    // resolveUnitIcons(gameData.units,gameData.actors)
    resolveImagesTags(gameData,icons)

    for(let catalog in gameData) {
        for (let entity in gameData[catalog]) {
            delete gameData[catalog][entity].id
        }
    }


    for(let id in gameData.units){
        let unit = gameData.units[id]
        if(!unit.GlossaryPriority && (unit.NoPalettes || unit.NoPlacement)){
            Object.assign(unit,IGNORE)
            delete unit.NoPalettes
            delete unit.NoPlacement
        }
    }

    for(let id in gameData.upgrades) {
        let upgrade = gameData.upgrades[id]
        if (upgrade.units) upgrade.units = upgrade.units.map(i => i.value)
    }

    for(let id in gameData.abilities) {
        let ability = gameData.abilities[id]

        if (ability.info){
            for(let infoID in ability.info) {
                let info = ability.info[infoID]
                if (info.Unit) {
                    info.Unit = info.Unit.map(i => i.value)
                }
            }
        }



        if (ability.units) ability.units = ability.units.map(i => i.value)
    }



    simplifyUnitsCommandCards(gameData.units)
    removeUnusedAbilityCommands(gameData.abilities)

    for(let catalog in gameData){
        fs.writeFileSync(`./data/WebData/${catalog}.json`,getJSONData(gameData[catalog]))
    }

    // fs.writeFileSync("./../all-races-website/public/gamedata.json",finalDataBeautified)
    // fs.writeFileSync("./../all-races-website-heroku/gamedata.json",finalDataBeautified)
}

run();







