import fs from "fs";
import {deepReplaceMatch, objectAssignDeep} from "./sc2mod";

export const IGNORE = {ignore: true}

let regexp = {
    iconpath: /.*[\\\/]/,
    iconext: /\.dds$/i,
    editorCategoryRace: /Race:(\w+)/,
    editorCategoryObjectFamily: /ObjectFamily:(\w+)/,
    editorCategoryObjectType: /ObjectType:(\w+)/
}

const SC2Types = {
    SC2Icon: ((value) => {
        if(value.constructor === Array)return null;
        return (value.replace(regexp.iconpath, "").replace(regexp.iconext, "")).toLowerCase()
    }),
    SC2Color: ((value) => ("#"+value.split(",").slice(1).map(i => (+i).toString(16).padStart(2, '0')).join(""))),
    SC2Token: String,
    SC2Link: String,
    SC2Text: String,
    SC2LinkRequirement: String,
    SC2LinkRequirementNode: String,
    SC2LinkAbilCmd: String,
    SC2LinkUnit: String,
    SC2LinkRace: String,
    SC2LinkButton: String,
    SC2LinkActor: String,
    SC2LinkUpgrade: String,
    SC2LinkBehavior: String,
    SC2LinkScore: String,
    SC2LinkWeapon: String,
    SC2LinkEffect: String,
    SC2LinkAbility: String,
    SC2LinkType: String,
    SC2LinkUserState: String,
    SC2LinkUserCommander: String,
    SC2LinkUserPrestige: String,
    SC2LinkUserLevel: String,
    SC2LinkUserTech: String,
    String: String,
    Number: Number,
    SC2EditorRace: ((value) => {
        return (value.match(regexp.editorCategoryRace)?.[1])
    }),
    SC2EditorObjectFamily: ((value) => {
        return (value.match(regexp.editorCategoryObjectFamily)?.[1])
    }),
    SC2EditorObjectType: ((value) => {
        return (value.match(regexp.editorCategoryObjectType)?.[1])
    }),
    SC2AbilCmd: ((value) => value[0].$.Abil + (value[0].$.Cmd ? ','+value[0].$.Cmd :''))
}

let SC2TypesPostProseccsing = {
    SC2Icon: ((value) => value.toLowerCase()),
    SC2Token: ((value,instance, token) => {
        return value
    })
}

function parseEntityString(entityString){
    let stri = 0;
    let incl = 0;
    let start = -1
    let end = -1
    let incl2 = 0
    let start2 = -1
    let end2 = -1
    let other = false
    let filter = false
    let field = entityString
    let filter2 = false
    let partEnded = false
    let otherstart = -1

    while(entityString[stri]){
        if(entityString[stri] === "." && !incl){
            other = entityString.substring(stri + 1)
            otherstart = stri + 1
            partEnded = true;
            if(field.length > stri){
                field = field.substr(0,stri)
            }
        }
        if(entityString[stri] === "{"){
            if(!incl && !incl2 && !partEnded) {
                start = stri
                field = field.substr(0,stri)
            }
            incl++
        }
        else if(entityString[stri] === "}"){
            incl--
            if(!incl && !incl2 && !partEnded) {
                end = stri
                filter = entityString.substring(start+1,end)
            }
        }
        else if(entityString[stri] === "("){
            if(!incl && !incl2) {
                start2 = stri
                field = field.substr(0,stri)
                if(otherstart !== -1){
                    other = entityString.substring(otherstart, stri )
                }
            }
            incl2++
        }
        else if(entityString[stri] === ")"){
            incl2--
            if(!incl && !incl2) {
                end2 = stri
                filter2 = entityString.substring(start2+1,end2)
            }
        }
        stri++
    }

    return {
        otherParts: other,
        filterExpression: filter,
        entityFieldType: field,
        keyField: filter2
    }
}

function getChildEntities(Instance, resultFieldName){
    return Instance[resultFieldName] || Instance.$?.[resultFieldName] && [{$: {value: Instance.$?.[resultFieldName]}}]
}

function getFilteredInstances(Instance,entityString){

    let results = []
    if(entityString.includes(",")){
        entityString.split(",").forEach(part => {
            results.push(...getFilteredInstances(Instance,part))
        })
        return results
    }

    let {entityFieldType, filterExpression, otherParts,keyField} = parseEntityString(entityString)


    let entities = getChildEntities(Instance,entityFieldType)

    if(entities?.length){
        for(let subInstance of entities){
            if(filterExpression){
                let [filterField, filterValue] = filterExpression.split("=")
                let filterResult = getFilteredInstances(subInstance,filterField)
                //{value: "1"}
                if(filterResult[0]?.$.value !== filterValue){
                    continue
                }
                else{
                    let x = 4
                }
            }
            if(otherParts){
                let subResult = getFilteredInstances(subInstance,otherParts)
                results.push(...subResult)
            }
            else {
                results.push(subInstance)
            }
        }
    }
    return results
}

function parseField(field){
    let [match, resultFieldName, query] = field.match(/([@\w]+)(?::(.*))?/)
    return {match,resultFieldName, query}
}


export function removeUndefinedValues(gameData){
    deepReplaceMatch(gameData, val => val === undefined, null, ({val, obj, prop, id}) => {
        console.log(`${id} property "${prop}" is undefined`)
        delete obj[prop]
    })
    return gameData
}

export function AssignData(target, Instance, structure){

    if(Instance === undefined){
        return
    }

    for(let field in structure) {
        let {resultFieldName, query} = parseField(field)
        let entities;
        if (query) {
            entities = getFilteredInstances(Instance, query)
        } else {
            entities = getChildEntities(Instance, resultFieldName)
        }
        if(!entities?.length)continue
        if(structure[field].constructor === Object){
            let forcedKey = query && parseEntityString(query).keyField;
            let key = forcedKey || 'index'
            let editedEntity = target[resultFieldName]
            if(!editedEntity){
                editedEntity = {}
                target[resultFieldName] = editedEntity
            }
            for(let entity of entities) {
                let keyValue = entity.$?.[key]
                if(!keyValue){
                    if(forcedKey){
                        continue
                    }
                    keyValue = 0
                    while( editedEntity[keyValue])keyValue++
                }
                if(!editedEntity[keyValue]) editedEntity[keyValue] = {}
                if(entity.$?.removed){
                    delete editedEntity[keyValue]
                }
                else{
                    AssignData(editedEntity[keyValue], entity, structure[field])
                }
            }
        }
        else if(structure[field].constructor === Array){
            if(!target[resultFieldName]){
                target[resultFieldName] = []
            }
            for(let entity of entities){
                let result;
                if(structure[field][0].constructor !== Object){
                    let obj = {}
                    AssignData(obj, entity, {value: structure[field][0]})
                    result = obj.value
                }
                else{
                    let obj = {}
                    AssignData(obj, entity, structure[field][0])
                    if(entity.$?.index)obj.index = +entity.$.index
                    if(entity.$?.removed)obj.removed = +entity.$.removed
                    result = obj
                }

                target[resultFieldName].push(result)
            }
        }
        else{
            let value = entities[0].$.value

            let valueType = SC2Types[structure[field]]
            if(valueType.constructor === Function) {
                if(value === undefined){
                    value = entities
                }
                value = valueType(value, Instance,structure[field])
            }
            else if(value !== undefined && value !== null && valueType === Number){
                value = +value
            }

            if(value !== undefined && value !== null){
                target[resultFieldName] = value
            }
        }
    }

}

// function resolveParentRecoursive(data,instanceId,instanceType){
//     let instance = data[instanceId]
//     let parentId = instance.parent
//     if(parentId){
//         let parent = data[parentId]
//         delete instance.parent
//         if(parent){
//             resolveParentRecoursive(data,parentId)
//             data[instanceId] = objectAssignDeep({}, parent ,instance)
//         }
//         else{
//             console.warn(`[${instanceType}] ${instanceId}: parent instance (${parentId}) is missing`)
//         }
//     }
// }
// export function resolveParents(gameData,structure){
//     if(structure){
//         for(let field in structure) {
//             let {resultFieldName} = parseField(field)
//             if (structure[field].parent) {
//                 for(let instanceId in gameData[resultFieldName]){
//                     resolveParentRecoursive(gameData[resultFieldName],instanceId,resultFieldName)
//                 }
//             }
//         }
//     }
//     else{
//         for(let field in gameData) {
//             for(let instanceId in gameData[field]){
//                 resolveParentRecoursive(gameData[field],instanceId,field)
//             }
//         }
//     }
// }

export function readStructureRecoursve(data, structure){
    for(let field in structure) {
        let {resultFieldName} = parseField(field)

        if(data[resultFieldName]){

            if(SC2TypesPostProseccsing[structure[field]]){
                data[resultFieldName] = SC2TypesPostProseccsing[structure[field]](data[resultFieldName],data,structure[field])
                if(data[resultFieldName] === null){
                    delete data[resultFieldName]
                }
            }
            else if(structure[field].constructor === Object){
                for (let instanceId in data[resultFieldName]) {
                    readStructureRecoursve(data[resultFieldName][instanceId],structure[field])
                }
            }
            else if(structure[field].constructor === Array ){
                //converting to Object
                {
                    let resultObject = {};
                    for(let i in data[resultFieldName]){
                        let item = data[resultFieldName][i]
                        let index = item.index
                        if(index !== undefined){
                            delete item.index
                            if(item.removed){
                                delete resultObject[index]
                                continue
                            }
                        }
                        else{
                            index = 0
                            while(resultObject[index])index++
                        }
                        if(resultObject[index]){
                            objectAssignDeep(resultObject[index],item)
                        }
                        else{
                            resultObject[index] = item
                        }
                    }
                    data[resultFieldName] = Object.values(resultObject)
                }
                for (let instance of data[resultFieldName]) {
                    readStructureRecoursve(instance,structure[field])
                }
            }
        }
    }
}

export function readImages(path) {
    let images = [];
    fs.readdirSync(path).forEach(file => {
        if (file.endsWith(".png")) {
            images.push(file.substring(0, file.length - 4))
        }
    });
    return images
}

export async function getGameData({mods, data, structure}){

    let gameData =  objectAssignDeep({}, data )
    for(let mod of mods){
        let rawData = await getRawData(mod)
        let modData = {}

        for(let catalog of rawData.catalogs){
            AssignData(modData, catalog.data.Catalog,structure)
        }
        modData.text = rawData.localizedData.enUS
        objectAssignDeep(gameData,modData )
    }
    removeUndefinedValues(gameData)
    resolveParents(gameData,structure)
    readStructureRecoursve(gameData,structure)

    return gameData
}

export function removeDummyRaces(gameData){
    //remove technical races
    for(let id in gameData.races){
        if(!gameData.races[id].AttributeId && !gameData.races[id].icon){
            delete gameData.races[id]
        }
        else{
            delete gameData.races[id].AttributeId
        }
    }
}

export function removeOtherRaceEntities(gameData){
    let ignored = 0
    for(let type in gameData){
        for(let id in gameData[type]){
            if(gameData[type][id].race === "Other"){
                ignored++
                delete gameData[type][id]
            }
        }
    }
    console.log("removed other race entities: " + ignored)
}

export function removeIgnoredEntities(gameData) {
    let ignored = 0
    for (let type in gameData) {
        for (let id in gameData[type]) {
            if (gameData[type][id].ignore === true) {
                ignored++
                delete gameData[type][id]
            }
        }
    }
    console.log("ignored " + ignored)
}

export function removeDummyUnits(units){
    for(let unitID in units){
        let unit = units[unitID]
        if(!unit.priority || unit.NoPalettes || unit.NoPlacement){
            delete units[unitID]
        }
    }
}

export function removeUnusedAbilityCommands(abilities){
    for(let id in abilities){
        let ability = abilities[id]
        if(ability.info){
            for(let abilCmdID in ability.info){
                let abilCmd = ability.info[abilCmdID]
                if(!abilCmd.Unit || !abilCmd.button){
                    delete ability.info[abilCmdID]
                }
            }
        }
    }
}

export function simplifyUnitsCommandCards(units){

    for(let id in units){
        let unit = units[id]
        if(unit.WeaponArray) unit.WeaponArray = unit.WeaponArray.map(i => i.Link)
        if(unit.AbilArray) unit.AbilArray = unit.AbilArray.map(i => i.Link)
        if(unit.BehaviorArray) unit.BehaviorArray = unit.BehaviorArray.map(i => i.Link)
        if(unit.Attributes) unit.Attributes =  Object.entries(unit.Attributes).reduce((acc,attr)=> {if(attr[1].value){acc.push(attr[0])}return acc} ,[])
        if(unit.CostResource) for(let index in unit.CostResource) unit.CostResource[index] = unit.CostResource[index].value
        if(unit.GlossaryWeakArray) unit.GlossaryWeakArray = unit.GlossaryWeakArray.map(i => i.value)
        if(unit.GlossaryStrongArray) unit.GlossaryStrongArray = unit.GlossaryStrongArray.map(i => i.value)

        if(unit.CardLayouts){
            let commands = []
            for(let layoutindex in unit.CardLayouts){
                let layout = unit.CardLayouts[layoutindex].LayoutButtons
                if(layout){
                    for(let {Column,Row,Face,AbilCmd} of layout){
                        Column = +Column || 0
                        Row = +Row || 0
                        if(Column > 4 || Row > 2)continue;
                        let Layout = layoutindex+ ":"+ Column + "x" + Row

                        commands.push ({Face,AbilCmd,Layout})
                    }
                }
            }
            unit.CardLayouts = commands
        }
    }
}

// export function resolveUnitIcons(units,actors){
//     for(let unitID in units){
//         let unit = units[unitID]
//         if(unit.actor){
//             let actor = actors[unit.actor]
//
//             if(actor.icon === "btn-missing-kaeo" ){
//                 delete actor.icon
//             }
//             if(actor.icon && !actor.iconbroken){
//                 unit.icon = actor.icon
//             }
//             else if (actor.wireframe && !actor.wireframebroken){
//                 unit.icon = actor.wireframe
//             }
//             else if(actor.icon || actor.wireframe){
//                 unit.icon = actor.icon || actor.wireframe
//                 unit.iconbroken = true
//             }
//             if(actor.iconbroken){
//                 console.warn(`Actor ${actor.id} icon ${actor.icon} missed`)
//             }
//             if((!actor.icon || actor.iconbroken) && actor.wireframebroken){
//                 console.warn(`Actor ${actor.id} wireframe ${actor.wireframe} missed`)
//             }
//
//             if(actor.LifeArmorIcon){
//                 unit.LifeArmorIcon = actor.LifeArmorIcon
//             }
//             if(actor.ShieldArmorIcon){
//                 unit.ShieldArmorIcon = actor.ShieldArmorIcon
//             }
//             delete unit.actor
//         }
//     }
// }

export function resolveActorsEvents(actors,units){
    for(let actorID in actors){
        let actor = actors[actorID]
        let unitName = actor.unit || actorID
        let unit = units[unitName]
        if(unit){
            unit.actor = actorID
        }
        if(actor.events){
            for(let eventIndex in actor.events){
                let event = actor.events[eventIndex]
                if(event.Send === "Create" && event.Terms?.match(/^(UnitConstruction|UnitBirth)/)){
                    let eventUnitID = event.Terms.split(".")[1].replace("##unitname##", unitName).replace("##id##", actorID)
                    let eventUnit = units[eventUnitID]
                    if(eventUnit && !eventUnit.actor){
                        eventUnit.actor = actorID
                    }
                }
            }
        }
        delete actor.events;
    }
}

export function resolveImagesTags(gameData,icons){

    for (let entity in gameData.units) {
        gameData.units[entity].unitname = entity
    }
    for(let catalog in gameData) {
        for (let entity in gameData[catalog]) {

            deepReplaceMatch(gameData[catalog][entity], val => val && val.constructor === String && val.includes("##"), null, ({val, obj, prop, id, path}) => {

                val = val.replace(/##(\w+)##/g,(a,b)=>{
                    // if(b === "atktype" || b === "deftype"){
                    //     console.log(a)
                    // }
                    return path[0][b] || a
                })
                obj[prop] = val
            })
        }
    }

    for (let entity in gameData.units) {
        delete gameData.units[entity].unitname
    }



    deepReplaceMatch(gameData, null, prop => prop === "icon" || prop === "wireframe", ({val, obj, prop, id}) => {

        // val = val.replace(/##(\w+)##/g,(a,b)=>{
        //     if(b === "id")return id;
        //     if(b === "unitname")return obj.unit;
        //     return obj[b] || a
        // })
        val = val.toLowerCase()
        //todo warcraft 3 workaround
        if(val.startsWith("renee_war3_btn")){
            val = val.replace("renee_war3_btn","Renee_war3_btn")
        }
        obj[prop] = val
        // if(!icons.includes(obj[prop])){
        //     obj[prop + "broken"] = true
        // }
    })
}

export function removeEmptyValues(gameData){
    deepReplaceMatch(gameData, val => !val, null, ({val, obj, prop, id}) => {
        delete obj[prop]
    })
    return gameData
}

export function getJSONData(gameData){
    return JSON.stringify(gameData, null, "\t");
}

export function getImagesList(){
    let icons;
    let iamgesListFile = './data/images.txt'
    if(fs.existsSync(iamgesListFile)){
        icons = fs.readFileSync(iamgesListFile, {encoding: 'utf-8'}).split("\n")
    }
    else{
        icons = readImages('./data/icons/')
        fs.writeFileSync(iamgesListFile,icons.join("\n"))
    }
    return icons
}