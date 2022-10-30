import fs from 'fs'
import xml2js from 'xml2js'
import osd from "object-assign-deep"
export const IGNORE = {ignore: true}
export const config = {
    gameDataFiles: [
        "abildata.xml",
        "accumulatordata.xml",
        "achievementdata.xml",
        "achievementtermdata.xml",
        "actordata.xml",
        "actorsupportdata.xml",
        "alertdata.xml",
        "armycategorydata.xml",
        "armyunitdata.xml",
        "armyupgradedata.xml",
        "artifactdata.xml",
        "artifactslotdata.xml",
        "attachmethoddata.xml",
        "bankconditiondata.xml",
        "beamdata.xml",
        "behaviordata.xml",
        "boostdata.xml",
        "bundledata.xml",
        "buttondata.xml",
        "cameradata.xml",
        "campaigndata.xml",
        "characterdata.xml",
        "cliffdata.xml",
        "cliffmeshdata.xml",
        "colorstyledata.xml",
        "commanderdata.xml",
        "configdata.xml",
        "consoleskindata.xml",
        "conversationdata.xml",
        "conversationstatedata.xml",
        "cursordata.xml",
        "datacollectiondata.xml",
        "datacollectionpatterndata.xml",
        "decalpackdata.xml",
        "dspdata.xml",
        "effectdata.xml",
        "emoticondata.xml",
        "emoticonpackdata.xml",
        "errordata.xml",
        "footprintdata.xml",
        "fowdata.xml",
        "gamedata.xml",
        "gameuidata.xml",
        "herddata.xml",
        "herdnodedata.xml",
        "heroabildata.xml",
        "herodata.xml",
        "herostatdata.xml",
        "itemclassdata.xml",
        "itemcontainerdata.xml",
        "itemdata.xml",
        "kineticdata.xml",
        "lensflaresetdata.xml",
        "lightdata.xml",
        "locationdata.xml",
        "lootdata.xml",
        "mapdata.xml",
        "modeldata.xml",
        "mountdata.xml",
        "moverdata.xml",
        "objectivedata.xml",
        "physicsmaterialdata.xml",
        "pingdata.xml",
        "playerresponsedata.xml",
        "portraitpackdata.xml",
        "preloaddata.xml",
        "premiummapdata.xml",
        "racebannerpackdata.xml",
        "racedata.xml",
        "requirementdata.xml",
        "requirementnodedata.xml",
        "reverbdata.xml",
        "rewarddata.xml",
        "scoreresultdata.xml",
        "scorevaluedata.xml",
        "shapedata.xml",
        "skindata.xml",
        "skinpackdata.xml",
        "sounddata.xml",
        "soundexclusivitydata.xml",
        "soundmixsnapshotdata.xml",
        "soundtrackdata.xml",
        "spraydata.xml",
        "spraypackdata.xml",
        "stimpackdata.xml",
        "taccooldowndata.xml",
        "tacticaldata.xml",
        "talentdata.xml",
        "talentprofiledata.xml",
        "targetfinddata.xml",
        "targetsortdata.xml",
        "terraindata.xml",
        "terrainobjectdata.xml",
        "terraintexdata.xml",
        "texturedata.xml",
        "texturesheetdata.xml",
        "tiledata.xml",
        "trophydata.xml",
        "turretdata.xml",
        "unitdata.xml",
        "upgradedata.xml",
        "userdata.xml",
        "validatordata.xml",
        "voiceoverdata.xml",
        "voicepackdata.xml",
        // "warchestdata.xml",
        // "warchestseasondata.xml",
        "waterdata.xml",
        "weapondata.xml",
    ],
    includes: true
}
export const objectAssignDeep = (a, ...b) => (osd.withOptions(a,b,{arrayBehaviour: 'merge'}))
const parser = new xml2js.Parser({trim: true, explicitArray: true});
const parser2 = new xml2js.Parser({trim: true, explicitArray: true, explicitChildren: true, preserveChildrenOrder: true});
const CMBuilder = new xml2js.Builder();
const CMBuilder2 = new xml2js.Builder({headless: true});

let regexp = {
    iconpath: /.*[\\\/]/,
    iconext: /\.dds$/i,
    editorCategoryRace: /Race:(\w+)/,
    editorCategoryObjectFamily: /ObjectFamily:(\w+)/,
    editorCategoryObjectType: /ObjectType:(\w+)/
}

let SC2TypesPostProseccsing = {
    SC2Icon: ((value) => value.toLowerCase()),
    SC2Token: ((value,instance, token) => {
        return value
    })
}

let SC2Types = {
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

export function deepReplaceMatch(obj, testVal, testProp, cb, id, _path = []) {
    const keys = Object.keys(obj)
    for (let i = 0, len = keys.length; i < len; i++) {
        const prop = keys[i], val = obj[prop]
        let path = [..._path,obj]
        if ((!testVal || testVal(val)) && (!testProp || testProp(prop))) cb({val, prop, obj, id,path})
        if (val && typeof val === 'object') deepReplaceMatch(val, testVal, testProp, cb, prop,path)
    }
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

function getChildEntities(Instance, resultFieldName){
    return Instance[resultFieldName] || Instance.$?.[resultFieldName] && [{$: {value: Instance.$?.[resultFieldName]}}]
}

function parseField(field){
    let [match, resultFieldName, query] = field.match(/([@\w]+)(?::(.*))?/)
    return {match,resultFieldName, query}
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

export function parseXML (raw,ordered) {
    return new Promise((resolve, reject) => {
        let currentParser = ordered ? parser2 : parser
        currentParser.parseString(raw,function (err, result) {
            if(err)reject(err)
            resolve(result);
        });
    })
}

export async function readXMLFile(localeFile,ordered) {
    if (!fs.existsSync(localeFile)){
        return null;
    }
    let raw = fs.readFileSync(localeFile, {encoding: 'utf-8'})
    return await parseXML(raw,ordered)
}

export function readTextFile(localeFile) {
    if (!fs.existsSync(localeFile)){
        return null;
    }
    let raw = fs.readFileSync(localeFile, {encoding: 'utf-8'})
    return parseLanguagRawData(raw)
}



export async function getRawData(modPath){
    modPath = modPath + "/"

    let IncludesData = await readXMLFile(modPath + "Base.SC2Data/GameData.xml")
    let ComponentsData = await readXMLFile(modPath + "ComponentList.SC2Components")
    let DocumentInfoData = await readXMLFile(modPath + "DocumentInfo")
    let LayoutsData = await readXMLFile(modPath + "Base.SC2Data/UI/Layout/DescIndex.SC2Layout")
    let galaxyFiles = fs.readdirSync(modPath + "Base.SC2Data").filter(file => file.endsWith(".galaxy"))

    let localisations =  ComponentsData?.Components?.DataComponent?.filter(entity => entity.$?.Type.toLowerCase() === "text").map(entity => entity.$.Locale) || ["enUS"];

    let ModData = {
        includes: (()=>{
            let includes = config.gameDataFiles.map(el => "Base.SC2Data/GameData/" + el);

            includes = includes.filter(file=> fs.existsSync(modPath + file))
            if(config.includes){
                if(IncludesData?.Includes?.Catalog){
                    includes.push(...IncludesData.Includes.Catalog.map(catalog => "Base.SC2Data/" + catalog.$.path))
                }
            }
            return includes
        })(),
        info:        DocumentInfoData,
        layouts:        LayoutsData,
        files: {},
        dependenciesFiles:   DocumentInfoData?.DocInfo?.Dependencies?.[0].Value || [],
        fontStyles: null,
        catalogs: [],
        localizedData: {},
        assetsData: null
    }


    if(LayoutsData?.Desc?.Include?.length){
        for(let include of LayoutsData.Desc.Include){
            ModData.files["Base.SC2Data/" + include.$.path] =  (modPath + "Base.SC2Data/" + include.$.path)
        }
    }
    if(galaxyFiles.length){
        for(let file of galaxyFiles){
            ModData.files["Base.SC2Data/" + file] =  (modPath + "Base.SC2Data/" + file)
        }
    }

    const textFiles = "GameHotkeys,GameStrings,ObjectStrings,TriggerStrings".split(",").map(el =>({
        file: "~locale~.sc2data/LocalizedData/" + el + ".txt",
        type: el
    }))

    ModData.fontStyles = await readXMLFile(modPath + "Base.SC2Data/UI/FontStyles.SC2Style")

    ModData.assetsData = readTextFile(modPath + "Base.SC2Data/GameData/Assets.txt")



    for(let includedFile of ModData.includes){
        let data = await readXMLFile(modPath + includedFile,true)
        if(!data){
            console.log("File not found: "+ modPath + includedFile)
        }
        else{
            ModData.catalogs.push({id: includedFile, data: data.Catalog?.constructor === Object ? data : {}});
        }
    }

    for(let localisation of localisations){
        ModData.localizedData[localisation] = {}
        for(let textFile of textFiles){
            let data =  readTextFile(modPath + textFile.file.replace("~locale~",localisation))
            if(data){
                ModData.localizedData[localisation][textFile.type] = data
            }
        }
    }


    {
        let localeFile = modPath + "Triggers";
        if (fs.existsSync(localeFile)) {
            let triggersXML = fs.readFileSync(localeFile, {encoding: 'utf-8'})
            ModData.triggers = triggersXML.substring(triggersXML.indexOf("<TriggerData>")+13,triggersXML.indexOf("</TriggerData>"))
        }
    }






    return ModData;
}

function resolveParentRecoursive(data,instanceId,instanceType){
    let instance = data[instanceId]
    let parentId = instance.parent
    if(parentId){
        let parent = data[parentId]
        delete instance.parent
        if(parent){
            resolveParentRecoursive(data,parentId)
            data[instanceId] = objectAssignDeep({}, parent ,instance)
        }
        else{
            console.warn(`[${instanceType}] ${instanceId}: parent instance (${parentId}) is missing`)
        }
    }
}

export function resolveParents(gameData,structure){
    if(structure){
        for(let field in structure) {
            let {resultFieldName} = parseField(field)
            if (structure[field].parent) {
                for(let instanceId in gameData[resultFieldName]){
                    resolveParentRecoursive(gameData[resultFieldName],instanceId,resultFieldName)
                }
            }
        }
    }
    else{
        for(let field in gameData) {
            for(let instanceId in gameData[field]){
                resolveParentRecoursive(gameData[field],instanceId,field)
            }
        }
    }
}

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

export function parseLanguagRawData(text){
    if(!text)return {}
    let data = {}
    text.replace(/\r/g,"").split("\n").forEach(el => {
        let key =  el.substring(0,el.indexOf("="))
        let value =  el.substring(el.indexOf("=") + 1)
        data[key] = value
    })
    delete data[""]
    return data;
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

export function readImages(path){
    let images = [];
    fs.readdirSync(path).forEach(file => {
        if(file.endsWith(".png")){
            images.push(file.substring(0,file.length - 4))
        }
    });
    return images
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

export function removeUndefinedValues(gameData){
    deepReplaceMatch(gameData, val => val === undefined, null, ({val, obj, prop, id}) => {
        console.log(`${id} property "${prop}" is undefined`)
        delete obj[prop]
    })
    return gameData
}

export function getJSONData(gameData){
    return JSON.stringify(gameData, null, "\t");
}

function makeDirectories(path){
    fs.mkdirSync(path.substring(0,path.lastIndexOf("/")), { recursive: true });
}

const getAllFiles = function(dirPath, relativePath, arrayOfFiles = []) {
    let files = fs.readdirSync(dirPath)

    files.forEach(function(file) {
        let relativeFile = relativePath ? relativePath + "/" + file : file
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, relativeFile, arrayOfFiles)
        } else {
            arrayOfFiles.push(relativeFile)
        }
    })

    return arrayOfFiles
}

function copyFile(input,outputPath){

    input = input.replace(/\\/g,"\/")
    outputPath = outputPath.replace(/\\/g,"\/")

    makeDirectories(outputPath)
    fs.copyFileSync(input,outputPath)
}

function saveRawData(output,outputPath){
    makeDirectories(outputPath)
    fs.writeFileSync(outputPath,output)
}

function saveTextData(data,outputPath){
    let output = Object.entries(data).map(([key,value]) => `${key}=${value}`).join("\n")
    makeDirectories(outputPath)
    fs.writeFileSync(outputPath,output)
}

function saveXMLData(data,outputPath){
    let output = CMBuilder.buildObject( data);
    makeDirectories(outputPath)
    fs.writeFileSync(outputPath,output)
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

export async function combineMods({input,output}){
    let inputLines = input.constructor === Array ? input : [input]
    let mods = []
    for(let inputLine of inputLines){
        let [before, list, after] = inputLine.split(/[\{}]/);
        mods.push(...list.split(",").map(mod => ({name: mod , path: `${before}${mod}${after}`})))
    }
    let triggers = '';
    // let indexedArrays = [];


    let combo = {
        // includes: [],
        // localisations: [],
        // catalogs: [],
        assetsData: {},
        gameData: [],
        dependenciesFiles: [],
        layouts: [],
        fontStyles: {},
        localizedData: {},
        files: {}
    }

    function collectDataRecoursive(Instance,path, ModName){
        if(!path)path = []
        if(path.length > 10){
            console.log(path)
        }
        let result = ModName? {$: [ModName]} : {}
        if(Instance.$) {
            for(let field in Instance.$) {
                result[field] = Instance.$[field]
                // delete Instance.$;
            }
        }
        for(let field in Instance){
            if(field === "$") continue
            if(!field.startsWith("?") && Instance[field].constructor === Array){
                if(!result[field]) result[field] = []
                for(let Entity of Instance[field]) {
                    let element = collectDataRecoursive(Entity,[...path, field], ModName)
                    if(result[field].constructor === String){
                        console.log(`duplicate field value ${result.id} ${field}`)
                        result[field] = element
                    }
                    else{
                        result[field].push( element)
                    }
                }
            }
            else{
                result[field] = Instance[field]
            }
        }
        return result
    }

    // let files = {}

    for(let mod of mods){
        // getAllFiles(mod.path).forEach(file => files[file] = mod.path + "/" + file)//.filter(file => file.endsWith("m3"))
        // for(let m3File of files){
        //     let raw = fs.readFileSync(m3File, {encoding: 'utf-8'})
        //     const indexes = raw.matchAll(new RegExp(`Assets\\[\\\w_]+\.dds`, 'gi'))
        //     console.log(indexes)
        //
        // }

        let modData = await getRawData(mod.path)
        for(let catalog of modData.catalogs ){
            // console.log(catalogID)
            // let catalogs = catalog.data
            if(catalog.data.Catalog){
                // for (let field in catalogs) {
                //     if(!indexedArrays.includes(field)) {
                //         indexedArrays.push(field)
                //     }
                // }
                // let data = collectDataRecoursive(catalogs,/*[],, mod.name*/)

                // let data = []
                // for(let entity of catalogs.$$){
                //     data.push()
                // }

                if(catalog.data.Catalog.$$){
                    for(let entity of catalog.data.Catalog.$$){

                        deepReplaceMatch(entity, null, prop => prop === "$$", ({val, obj, prop}) => {
                            delete obj[prop]
                        })
                        let data = collectDataRecoursive(entity,/*[],, mod.name*/)
                        data["#mod"] = mod.path;
                        combo.gameData.push(data)


                    }
                }

                // for(let type in data){
                //     if(!combo.gameData[type]){
                //         combo.gameData[type] = []
                //     }
                //     combo.gameData[type].push(...data[type])
                // }
                //objectAssignDeep(combo.gameData, data )
            }
        }
        // let localizedData = {}

        // for(let locale in modData.localizedData){
        //     localizedData[locale] = {}
        //     for(let textType in modData.localizedData[locale]){
        //         localizedData[locale][textType] = parseLanguagRawData(modData.localizedData[locale][textType])
        //     }
        // }

        if(modData.triggers) triggers += modData.triggers
        Object.assign(combo.files,modData.files)
        if(modData.dependenciesFiles){
            for(let dependency of modData.dependenciesFiles){
                let dependencyFile = dependency.substring(dependency.lastIndexOf("file:") + 5)
                if(!combo.dependenciesFiles.includes(dependencyFile)){
                    combo.dependenciesFiles.push(dependencyFile)
                }
            }
        }
        if(modData.fontStyles){
            objectAssignDeep(combo.fontStyles,modData.fontStyles)
        }
        if(modData.layouts){
            objectAssignDeep(combo.layouts,modData.layouts)
        }
        Object.assign(combo.assetsData,modData.assetsData)
        objectAssignDeep(combo.localizedData,modData.localizedData)
    }




    if(triggers){
        triggers =  `<?xml version="1.0" encoding="utf-8"?>\n<TriggerData>\n${triggers}\n</TriggerData>`
        makeDirectories(output)
        fs.writeFileSync(output + "Triggers", triggers)
    }



    saveTextData(combo.assetsData,`${output}Base.SC2Data/GameData/Assets.txt`)


    for(let locale in combo.localizedData){
        for(let textType in combo.localizedData[locale]){
            saveTextData(combo.localizedData[locale][textType],`${output}${locale}.SC2Data/LocalizedData/${textType}.txt`)
        }
    }

    saveXMLData(combo.layouts, output + "Base.SC2Data/UI/Layout/DescIndex.SC2Layout")
    saveXMLData(combo.fontStyles, output + "Base.SC2Data/UI/FontStyles.SC2Style")


    // deepReplaceMatch(gameData, null, prop => prop === "$", ({val, obj, prop}) => {
    //     delete obj[prop]
    // })

    let resultData = {}
    let catalogs = [
        "abil",
        "accumulator",
        "achievementterm",
        "achievement",
        "actorsupport",
        "actor",
        "alert",
        "armycategory",
        "armyunit",
        "armyupgrade",
        "artifact",
        "artifactslot",
        "attachmethod",
        "bankcondition",
        "beam",
        "behavior",
        "boost",
        "bundle",
        "button",
        "camera",
        "campaign",
        "character",
        "cliffmesh",
        "cliff",
        "collection",
        "colorstyle",
        "commander",
        "config",
        "consoleskin",
        "conversation",
        "conversationstate",
        "cursor",
        "datacollectionpattern",
        "datacollection",
        "decalpack",
        "dsp",
        "effect",
        "emoticon",
        "emoticonpack",
        "error",
        "footprint",
        "fow",
        "gameui",
        "game",
        "herd",
        "herdnode",
        "heroabil",
        "hero",
        "herostat",
        "itemclass",
        "itemcontainer",
        "item",
        "kinetic",
        "lensflareset",
        "light",
        "loot",
        "map",
        "model",
        "mount",
        "mover",
        "objective",
        "physicsmaterial",
        "ping",
        "playerresponse",
        "portraitpack",
        "race",
        "requirementnode",
        "requirement",
        "reverb",
        "reward",
        "scoreresult",
        "scorevalue",
        "shape",
        "skinpack",
        "skin",
        "soundmixsnapshot",
        "soundexclusivity",
        "soundtrack",
        "sound",
        "spraypack",
        "spray",
        "stimpack",
        "taccooldown",
        "tactical",
        "talent",
        "talentprofile",
        "targetfind",
        "targetsort",
        "texturesheet",
        "texture",
        "turret",
        "unit",
        "upgrade",
        "user",
        "validator",
        "voiceover",
        "voicepack",
        "water",
        "terrain",
        "weapon"
    ]
    // .map(el => el.charAt(0).toUpperCase() + el.slice(1))


    for(let entity of combo.gameData){
        let type = entity["#name"]
        if(!type){
            console.log("@")
        }
        let cat = catalogs.find(catalog => type.toLowerCase().startsWith("c" + catalog))

        let id = entity.id || entity.Id || entity.index
        if(id){
            if(!resultData[cat]){
                resultData[cat] = []
            }

            delete entity["#mod"]
            let existed = resultData[cat].find(el => el.id === id )//&& el["#"] === entity["#"]
            if(cat === "undefined"){
                console.warn(`category undefined ${el["#name"]}`)
            }
            if (existed) {
                if(entity.parent || entity["#name"] !== existed["#name"]){
                    if(entity["#name"] !== existed["#name"]){
                        console.info(`entity class override: ${id} ${existed["#name"]} => ${entity["#name"]}`)
                    }
                    // else{
                    //     console.log(`override ${id} ${entity["#"]}`)
                    // }
                    let index = resultData[cat].indexOf(existed);

                    resultData[cat][index] = entity

                    function getParent(el){

                        //move parent before overriden element
                        if(el.parent){
                            let parent = resultData[cat].find(el => el.id === entity.parent )
                            let parentIndex = resultData[cat].indexOf(parent);
                            if(parentIndex > index){
                                resultData[cat].splice(index,0,...resultData[cat].splice(parentIndex,1))
                                getParent(parent)
                            }
                        }
                    }
                    getParent(entity)

                }
                else{
                    objectAssignDeep(existed, entity )
                }
            }
            else {
                resultData[cat].push(entity)
            }
        }
    }

    deepReplaceMatch(resultData, val => val.constructor === String, null, ({val, obj, prop}) => {
        if(obj.constructor === Array){
            return
        }
        if(prop === "#name"){
            return
        }
        if(!obj.$)obj.$ = {}
        obj.$[prop] = val
        delete obj[prop]
    })

    for(let cat in resultData){
        let entitiesData = ""
        for(let entity of resultData[cat]) {
            let tag = entity["#name"]
            delete entity["#name"]
            entitiesData += CMBuilder2.buildObject({[tag]: entity}) + "\n";
        }
        entitiesData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Catalog>\n${entitiesData}\n</Catalog>`
        saveRawData(entitiesData, output.GameData || output + `Base.SC2Data/GameData/${cat.at(0).toUpperCase() + cat.substring(1)}Data.xml`)
    }

    // saveXMLData({Includes: {Catalog: [{ $: {path: "GameData/CompiledData.xml"}}]}}, output + "Base.SC2Data/GameData.xml")
    // if(combo.dependenciesFiles.length) saveXMLData({Includes: {Path: combo.dependenciesFiles.map(dep => ({ $: {value: dep}}))}}, output + "Base.SC2Data/Includes.xml")

    for(let file in combo.files){
        copyFile(combo.files[file], output + file)
    }
}
