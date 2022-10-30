import fs from 'fs'
import xml2js from 'xml2js'
import * as yaml from "js-yaml";
export function deepReplaceMatch(obj, testVal, testProp, cb, id, _path = [], _pathids = []) {
    const keys = Object.keys(obj)
    for (let i = 0, len = keys.length; i < len; i++) {
        let prop = keys[i], val = obj[prop]
        let path = [..._path, obj]
        let crumbs = [..._pathids, prop]
        if ((!testVal || testVal(val)) && (!testProp || testProp(prop))){
            let result = cb({val, prop, obj, id, path,crumbs})
            if(result !== undefined) {
                obj[prop] = result;
                val = result;
            }
        }
        if (val && typeof val === 'object'){
            deepReplaceMatch(val, testVal, testProp, cb, prop, path,crumbs)
        }
    }
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export function deep(a,b,c = 'merge'){
    if(!a){
        console.error("wrong deep a argument")
    }
    for(let i in b){
        if(a[i] && a[i].constructor === Array && c === 'replace') {
            a[i] = JSON.parse(JSON.stringify(b[i]))
        }
        else if(a[i] && a[i].constructor === Array && c === 'unite') {
            deep(a[i],b[i],c)
        }
        else if(a[i] && a[i].constructor === Array && c === 'merge') {
            a[i] = [...a[i],...b[i]]
        }
        else if(a[i] && a[i].constructor === Object){
            deep(a[i],b[i],c)
        }
        else{
            a[i] = JSON.parse(JSON.stringify(b[i]))
        }
    }
    return a
}

export class SC2Mod {
    path = ""
    assets = {}
    dependencies = []
    styles = {}
    localisations = []
    entities = []
    layouts = []
    triggers = ""
    files = {}
    constructor(data= {}){
        deep(this,data)
        if(data){
            this.updateCache()
            this.updateEntities()
        }
    }
    async merge (...inputs){
        for (let input of inputs) {

            let mod2 = new SC2Mod()
            await mod2.read(`${input}.SC2Mod`)
            this.entities.push(...mod2.entities)
            this.triggers += mod2.triggers
            Object.assign(this.files, mod2.files)
            for (let dependency of mod2.dependencies) {
                let dependencyFile = dependency.substring(dependency.lastIndexOf("file:") + 5)
                if (!this.dependencies.includes(dependencyFile)) {
                    this.dependencies.push(dependencyFile)
                }
            }
            deep(this.styles, mod2.styles)
            Object.assign(this.assets, mod2.assets)
            this.layouts.push(...mod2.layouts)
            deep(this.localisations, mod2.localisations)
        }

        this.updateCatalogs()
        this.updateCache()
    }
    async read (path){
        if(path){
            if(!path.endsWith("/"))path += "/"
            this.path = path;
        }
        this.assets = await this.readAssets()
        this.dependencies = await this.readDependencies()
        this.styles = await this.readStyles()
        this.localisations = await this.readLocalisations()
        this.entities = await this.readEntities()
        this.triggers = await this.readTriggers()
        this.layouts = await this.readLayouts()
        this.files = await this.readFiles()
        this.updateCatalogs();
        this.updateCache()
    }
    async readAssets () {
        return this._readTextFile(this.path + "Base.SC2Data/GameData/Assets.txt")
    }
    async readDependencies () {
        let documentInfo = await this._readXMLFile(this.path + "DocumentInfo")
        return documentInfo?.DocInfo?.Dependencies?.[0].Value || []
    }
    async readStyles(){
        return await this._readXMLFile(this.path + "Base.SC2Data/UI/FontStyles.SC2Style")
    }
    async readLocalisations () {
        let ComponentsData = await this._readXMLFile(this.path + "ComponentList.SC2Components")
        let textFiles = ["GameHotkeys","GameStrings","ObjectStrings","TriggerStrings","ConversationStrings"]
        let localisations = {}
        let LocaleData = ComponentsData?.Components?.DataComponent?.filter(entity => entity.$?.Type.toLowerCase() === "text").map(entity => entity.$.Locale) || ["enUS"];
        for (let locale of LocaleData) {
            localisations[locale] = {}
            for (let textFile of textFiles) {
                let data = this._readTextFile( `${this.path}${locale}.sc2data/LocalizedData/${textFile}.txt`)
                if (data) {
                    localisations[locale][textFile] = data
                }
            }
        }
        return localisations
    }
    async readEntities () {
        let includesData = await this._readXMLFile(this.path + "Base.SC2Data/GameData.xml")
        let commonFiles = this._gameDataFiles.map(el => "Base.SC2Data/GameData/" + el + "data.xml");
        let includes = commonFiles.filter(file => fs.existsSync(this.path + file))
        let additionalFiles = includesData?.Includes?.Catalog?.map(catalog => "Base.SC2Data/" + catalog.$.path)
        if (additionalFiles) {
                includes.push(...additionalFiles)
            }
        let catalogs = []
        for (let file of includes) {
            let data = await this._readXMLFile(this.path + file, true)
            if (!data) {
                console.log("File not found: " + this.path + file)
            } else {
                catalogs.push({id: file, data: data.Catalog?.constructor === Object ? data : {}});
            }
        }
        let entities = []
        for (let catalog of catalogs) {
            if (catalog.data.Catalog) {
                if (catalog.data.Catalog.$$) {
                    for (let entityID of catalog.data.Catalog.$$) {
                        deepReplaceMatch(entityID, null, prop => prop === "$$", ({val, obj, prop}) => {
                            delete obj[prop]
                        })
                        let entity = this._collectDataRecoursive(entityID,/*[],, mod.name*/)

                        entity.class = entity["#name"]
                        delete entity["#name"]

                        // if(entity.class.startsWith("S"))continue

                        for(let property in entity){
                            if(/^__(.*)__$/.test(property)){
                                entity[property.substring(2,property.length-2)] = entity[property][0].value
                                delete entity[property]
                            }
                        }
                        // if(!entity.id) {
                            // let classCategory = this._gameDataAssociations[entity.class]
                            // let baseClass = this._gameDataSupport[classCategory][0]
                        if(!entity.id){
                            entity.id = "_" + entity.class + "_"
                            // entity.immutable = true
                        }
                            // if(entity.class !== baseClass){
                            //     entity.parent = "_" + baseClass+ "_"
                            // }
                        // }
                        // else if(!entity.parent){
                        //     entity.parent = "_" + entity.class + "_"
                        // }

                        entities.push(entity)
                    }
                }
            }
        }
        return entities;
    }
    updateCatalogs () {
        let catalogs = {}
        for (let entity of this.entities) {
            let entityClass = entity.class
            if (!entityClass) {
                console.warn("Entity without entityClass?")
                continue;
            }

            let cat = this._gameDataAssociations[entityClass]
            if (cat === "undefined") {
                console.warn(`category undefined ${entityClass}`)
            }
            let resultCatalog = catalogs[cat]

            let id = entity.id || entity.Id || entity.index
            if (id) {
                if (!resultCatalog) {
                    resultCatalog = catalogs[cat] = []
                }
                let existed = resultCatalog.find(el => el.id === id)//&& el["#"] === entity["#"]
                if (existed) {
                    if (entity.parent || entity.class !== existed.class) {
                        if (entity.class !== existed.class) {
                            console.info(`entity class override: ${id} ${existed.class} => ${entity.class}`)
                        }
                        let index = resultCatalog.indexOf(existed);

                        resultCatalog[index] = entity

                        function replaceParentRecoursive(el) {

                            //move parent before overriden element
                            if (el.parent) {
                                let parent = resultCatalog.find(el => el.id === entity.parent)
                                let parentIndex = resultCatalog.indexOf(parent);
                                if (parentIndex > index) {
                                    resultCatalog.splice(index, 0, ...resultCatalog.splice(parentIndex, 1))
                                    replaceParentRecoursive(parent)
                                }
                            }
                        }

                        replaceParentRecoursive(entity)

                    } else {
                        deep(existed, entity)
                    }
                } else {
                    resultCatalog.push(entity)
                }
            }
        }

        //write every string as property
        deepReplaceMatch(catalogs, null, prop => prop === "$", ({val, obj, prop}) => {
            Object.assign(obj,val)
            delete obj[prop]
        })
        //remove empty arrays
        deepReplaceMatch(catalogs, val => val.constructor === Array && !val.length, null, ({val, obj, prop}) => {
            delete obj[prop]
        })

        if("JSON" === true){
            // for YAML and JSON
            //convert strings to numbers
            deepReplaceMatch(catalogs, isNumeric, null, ({val, obj, prop}) => {
                obj[prop] = +val
            })
        }

        this.catalogs = catalogs;

        //simplify values
        // deepReplaceMatch(catalogs, this._isValue, prop => !prop.endsWith("Array"), ({val, obj, prop}) => {
        //     obj[prop] = val[0].value
        //     // obj[prop].$SIMPLIFIED = true
        // })
        //simplify arrays
        // deepReplaceMatch(catalogs, this._isIndexedArray, null, ({val, obj, prop}) => {
        //     let result = {}
        //     for(let item of val){
        //         result[item.index] = item.value
        //     }
        //     obj[prop] = result
        //     obj[prop].$SIMPLIFIED = true
        // })
        //simplify index arrays
        // deepReplaceMatch(catalogs, this._isValueArray, null, ({val, obj, prop}) => {
        //     obj[prop] = val.map(i => i.value)
        //     obj[prop].$SIMPLIFIED = true
        // })
        return catalogs
    }
    updateCache() {
            let cache = {}
            for (let cat in this.catalogs) {
                cache[cat] = {}
                for (let entity of this.catalogs[cat]) {
                    cache[cat][entity.id] = entity
                    // delete entity.id
                }
            }
            this.cache = cache
    }
    _getEntityValue(entity,property){
        if(entity[property])return entity[property]

        let parent = this.getEntityParent(entity)
        if(parent){
            return this._getEntityValue(parent,property)
        }
    }
    _resolveTokens(entity){
        deepReplaceMatch(entity, val => val && val.constructor === String && val.includes("##"), null, ({val, obj, prop, id, path}) => {
            obj[prop] = val.replace(/##(\w+)##/g,(_,tokenID) =>  {
                let tokenValue = this._getEntityValue(entity,tokenID) || ""
                if(tokenValue.constructor !== String){
                    if(tokenValue[0].value !== undefined){
                        return tokenValue[0].value
                    }
                    else{
                        console.log("incorrect token value",path)
                    }
                }
                return tokenValue
            })
        })
    }
    resolveTokens(entity){
        if(entity)return this._resolveTokens(entity)
        // this.updateCache()
        for(let catalog in this.cache){
            for(let entityID in this.cache[catalog]){
                this._resolveTokens(this.cache[catalog][entityID])
            }
        }
    }
    resolveParents(entity = null){

        if(entity){
            this._resolveEntityParents(entity)
            return entity;
        }


        // this.updateCache()
        for(let catalog in this.catalogs){
            if(catalog === "const")continue;
            for(let entity of this.catalogs[catalog]){
                 this._resolveEntityParents(entity)
            }
        }
    }
    _resolveEntityParents(entity){
        if(entity.$resolved)return
        let catalog = this._gameDataAssociations[entity.class]
        let parent = this.getEntityParent(entity)
        if(!parent){
            Object.defineProperty(entity,"$resolved",{enumerable: false, configurable: true,writable: true, value: true})
            return;
        }
        delete entity.parent

        if(entity.id === "Medivac" && catalog === "actor"){
            entity.unitName
        }
        this._resolveEntityParents(parent,catalog)
        let isDefault = entity.default
        let resultObject = {}
        deep(resultObject, parent)
        deep(resultObject ,entity)

        if(!isDefault){
            delete resultObject.default
        }
        for(let i in entity){
            delete entity[i]
        }
        for(let i in resultObject){
            entity[i] = resultObject[i]
        }
        Object.defineProperty(entity,"$resolved",{enumerable: false, configurable: true,writable: true, value: true})
    }
    getEntityParent(entity){
        if(entity.class === "const")return;

        let catalog = this._gameDataAssociations[entity.class]
        if(entity.parent){
            return this.cache[catalog][entity.parent]
        }
        let classPrototype = this.cache[catalog]["_" + entity.class + "_"]
        let superClassPrototype = this.cache[catalog]["_" +this._gameDataSupport[this._gameDataAssociations[entity.class]][0] + "_"]
        if(entity === superClassPrototype){
            return false
        }
        if(entity === classPrototype || !classPrototype){
            return superClassPrototype
        }
        else{
            return classPrototype
        }
    }
    async readTriggers(){
        let triggersFile = this.path + "Triggers";
        if (!fs.existsSync(triggersFile)) {
            return ""
        }
        let triggersXML = fs.readFileSync(triggersFile, {encoding: 'utf-8'})
        return triggersXML.substring(triggersXML.indexOf("<TriggerData>") + 13, triggersXML.indexOf("</TriggerData>"))
    }
    async readLayouts(){
        let layouts = await this._readXMLFile(this.path + "Base.SC2Data/UI/Layout/DescIndex.SC2Layout")
        return layouts?.Desc?.Include || []
    }
    async readFiles(){
        // this._getAllFiles(this.path).forEach(file => files[file] = this.path + file)//.filter(file => file.endsWith("m3"))
        // for(let m3File of files){
        //     let raw = fs.readFileSync(m3File, {encoding: 'utf-8'})
        //     const indexes = raw.matchAll(new RegExp(`Assets\\[\\\w_]+\.dds`, 'gi'))
        //     console.log(indexes)
        //
        // }

        let files = {}
        let galaxyFiles = fs.readdirSync(this.path + "Base.SC2Data").filter(file => file.endsWith(".galaxy"))

        for (let include of this.layouts) {
            files["Base.SC2Data/" + include.$.path] = (this.path + "Base.SC2Data/" + include.$.path)
        }

        if (galaxyFiles.length) {
            for (let file of galaxyFiles) {
                files["Base.SC2Data/" + file] = (this.path + "Base.SC2Data/" + file)
            }
        }
        return files
    }
    async write(path){
        if(path){
            if(!path.endsWith("/"))path += "/"
            this.path = path;
        }
        this._saveTextData(this.assets, `${this.path}Base.SC2Data/GameData/Assets.txt`)
        await this.saveTriggers()
        await this.saveLocalisations()
        await this.saveFontStyles()
        await this.saveLayouts()
        await this.saveCatalogs(path)
        await this.copyFiles()
        // if(combo.dependenciesFiles.length) saveXMLData({Includes: {Path: combo.dependenciesFiles.map(dep => ({ $: {value: dep}}))}}, output + "Base.SC2Data/Includes.xml")
    }
    async _readXMLFile(localeFile, ordered) {
        if (!fs.existsSync(localeFile)) {
            return null;
        }
        let raw = fs.readFileSync(localeFile, {encoding: 'utf-8'})

        raw = raw.replace(/<\?xml(.*)\?>/g,()=>{
            return ""
        })

        raw = raw.replace(/<\?token\s+id="(\w+)"\s+(?:type="(\w+)"\s+)?value="(.*)"\?>/g,function(_,tokenID,tokenType,tokenValue){
            // console.log(val,a,b)
            return `<__${tokenID}__ value="${tokenValue}"/>`
            // <DeathRevealRadius value="0"/>
        })
        raw = raw.replace(/<\?(.*)\?>/g,function(_){
            return _
        })

        return new Promise((resolve, reject) => {
            let parser
            if(ordered){

                parser = new xml2js.Parser({
                    trim: true,
                    explicitArray: true,
                    explicitChildren: true,
                    preserveChildrenOrder: true
                });
            }
            else{
                parser = new xml2js.Parser({trim: true, explicitArray: true});
            }

            parser.parseString(raw, function (err, result) {
                if (err) reject(err)
                resolve(result);
            });
        })
    }
    _getAllFiles (dirPath, relativePath, arrayOfFiles = []) {
        let files = fs.readdirSync(dirPath)

        files.forEach(function (file) {
            let relativeFile = relativePath ? relativePath + "/" + file : file
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, relativeFile, arrayOfFiles)
            } else {
                arrayOfFiles.push(relativeFile)
            }
        })

        return arrayOfFiles
    }
    _parseLanguagRawData(text) {
        if (!text) return {}
        let data = {}
        text.replace(/\r/g, "").split("\n").forEach(el => {
            let key = el.substring(0, el.indexOf("="))
            let value = el.substring(el.indexOf("=") + 1)
            data[key] = value
        })
        delete data[""]
        return data;
    }
    _copyFile(input, outputPath) {
        input = input.replace(/\\/g, "\/")
        outputPath = outputPath.replace(/\\/g, "\/")

        this._makeDirectories(outputPath)
        fs.copyFileSync(input, outputPath)
    }
    async copyFiles() {
        for (let file in this.files) {
            this._copyFile(this.files[file], this.path + file)
        }
    }
    async saveTriggers() {
        if(!this.triggers)return;
        let triggersText = `<?xml version="1.0" encoding="utf-8"?>\n<TriggerData>\n${this.triggers}\n</TriggerData>`
        this._saveRawData(triggersText, this.path + "Triggers")
    }
    async saveLocalisations() {
        for (let locale in this.localisations) {
            for (let textType in this.localisations[locale]) {
                this._saveTextData(this.localisations[locale][textType], `${this.path}${locale}.SC2Data/LocalizedData/${textType}.txt`)
            }
        }
    }
    async saveFontStyles() {
        const CMBuilder = new xml2js.Builder();
        if(!this.styles)return;
        let output = CMBuilder.buildObject(this.styles);
        this._saveRawData(output,this.path + "Base.SC2Data/UI/FontStyles.SC2Style")
    }
    async saveLayouts() {
        const CMBuilder = new xml2js.Builder();
        if(!this.layouts)return;
        let output = CMBuilder.buildObject({Desc: {Include: this.layouts }});
        this._saveRawData(output,this.path + "Base.SC2Data/UI/Layout/DescIndex.SC2Layout")
    }
    async saveCatalogs(path,{format= 'xml', writeToSingleFile = false} = {}) {
        if(path.endsWith(".json")){
            writeToSingleFile = true
            format = 'json'
        }
        else if(path.endsWith(".yaml")){
            writeToSingleFile = true
            format = 'yaml'
        }
        else if(path.endsWith(".xml")){
            writeToSingleFile = true
            format = 'xml'
        }
        else{
            if(!path.endsWith("/"))path += "/"
        }


        if(format === "xml") {

            const CMBuilder2 = new xml2js.Builder({headless: true});

            let catalogs = JSON.parse(JSON.stringify(this.catalogs))

            this.cache.abil.LegacySprayTerran

            for (let cat in catalogs) {
                for (let entity of catalogs[cat]) {
                    // this.stringvalues(entity)
                    this.optimiseForXML(entity)
                }
            }

            if(writeToSingleFile){
                let entitiesData = ""
                for (let cat in catalogs) {
                    for (let entity of catalogs[cat]) {
                        let tag = entity.class
                        delete entity.class
                        entitiesData += CMBuilder2.buildObject({[tag]: entity}) + "\n";
                    }
                }
                entitiesData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Catalog>\n${entitiesData}\n</Catalog>`
                this._saveRawData(entitiesData,  path)
            }
            else{
                for (let cat in catalogs) {
                    let entitiesData = ""
                    for (let entity of catalogs[cat]) {
                        let tag = entity.class
                        delete entity.class

                        try{
                            entitiesData += CMBuilder2.buildObject({[tag]: entity}) + "\n";
                        }
                        catch(e){
                            console.error(entity)
                        }
                    }
                    entitiesData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Catalog>\n${entitiesData}\n</Catalog>`
                    this._saveRawData(entitiesData,  `${path}Base.SC2Data/GameData/${cat.at(0).toUpperCase() + cat.substring(1)}Data.xml`)
                }
            }
        }
        else{
            let optimised = new SC2Mod(this)
            optimised.optimize()

            if(format === "json"){
                fs.writeFileSync(path, JSON.stringify(optimised.cache, null,"  "))
            }

            if(format === "yaml") {
                let yamlStr = yaml.dump(optimised.cache, {flowLevel: 4, lineWidth: -1, noCompatMode: true});
                fs.writeFileSync(path, yamlStr, 'utf8');
            }
        }


    }
    mixin(b){

        function mixin(a,b){
            for(let i in b){
                if(a.constructor === Object && b.constructor === Object && a[i]) {
                    mixin(a[i], b[i])
                }
                else {
                    a[i] = b[i]
                }
            }
        }

        let a = this.cache
        for(let i in b){
            if(a.constructor === Object && b.constructor === Object && a[i]) {
                mixin(a[i], b[i])
            }
            else {
                a[i] = b[i]
            }
        }
    }
    _getSchema(catalog,classname){
        let catalogSchema = catalog && this.schema[catalog]
        let classSchema = classname && this.schema[classname]

        if(catalogSchema && classSchema){



            let schema = {}
            deep(schema,this.schema[catalog],'unite')
            deep(schema,this.schema[classname],'unite')

            return schema
        }
        else if(catalogSchema){
            return catalogSchema
        }
        else{
            return classSchema
        }
    }
    _pickEntity(id,catalog,chain = []){
        let entity = this.cache[catalog][id]
        if (!entity) return
        if(this.ingored?.[catalog]?.includes(id))return //|| immutable

        if(!this.chains[catalog])this.chains[catalog] = {}
        if(!this.chains[catalog][entity.id]){
            this.chains[catalog][entity.id] =  {entity}
        }
        if(!this.chains[catalog][entity.id].chains){
            this.chains[catalog][entity.id].chains = []
        }
        this.chains[catalog][entity.id].chains.push(chain)

        if(this.chains[catalog][entity.id].picked)return //|| entity.picked

        this.chains[catalog][entity.id].picked = true
        let schema = this._getSchema(catalog,entity.class)
        if(!schema) return

        chain = [...chain,entity.class+"#"+id]

        // this.resolveParents(entity)
        // this.arrayvalues(entity)
        // this.resolveArrays(entity)
        // this.stringvalues(entity)

        this._pickProperty(entity,this._getSchema(catalog,entity.class),[entity.class],chain)
        // let parent = this.getEntityParent(entity)
        // parent && this._pickEntity(parent.id,catalog)
        // entity.id = this._entityPrefix + entity.id + this._entityPostfix
    }
    _reference(id, catalog, path, type, object,property,index) {
        if(id.constructor !== String){
            console.error("wrong entity id",id)
        }

        let entity = this.cache[catalog][id];

        if(!entity)return


        if(!this.chains[catalog]){
            this.chains[catalog] = {}
        }
        if(!this.chains[catalog][id]){
            this.chains[catalog][id] = {entity}
        }
        if(!this.chains[catalog][id].references ){
            this.chains[catalog][id].references = []
        }
        this.chains[catalog][id].references.push({catalog,id,path, type, object, property,index})
    }
    _pickField(object, property , type, path,chain){
        let  value = object[property]

        let referenceID , referenceCatalog
        //optimised arrays
        switch(type){
            case "unit":
            case "weapon":
            case "turret":
            case "upgrade":
            case "button":
            case "requirementnode":
            case "requirement":
            case "behavior":
            case "abil":
            case "validator":
            case "effect": {
                referenceID = value
                referenceCatalog = type
                break;
            }
            case "reference":{
                let [entityType, entityName, entityProperty] = value.split(",")
                referenceID = entityName
                referenceCatalog = entityType.toLowerCase()
                break;
            }
            case "abilcmd": {
                let [abilName, cmd] = value.split(",")
                referenceID= abilName
                referenceCatalog = "abil"
                break;
            }
            default:
                return;
        }


        let entity = this.cache[referenceCatalog][referenceID]
        if(!entity)return;

        let newChain = [...chain]
        newChain.push([newChain.pop(),... path.slice(1),property].join("."))

        this._reference(referenceID, referenceCatalog, path, type, object, property)



        //
        // if(path[0].startsWith("CValidatorUnitFilters")){
        //     path
        // }
        for(let iPath of this.ingored.path){
            if(this._matchPath(iPath,path)){
                return;
            }
        }

        if(this.ingored.path.includes(entity.class)) {
            return
        }


        this._pickEntity(referenceID,referenceCatalog,newChain)
    }
    _pickProperty(object,schema,path,chain){
        if(!schema){
            return
        }
        for(let property in object){
            let type = this._getType(schema,property), value = object[property]

            if(property === "unitName"){
                value
            }
            if(["id","class","index","parent","default","removed"].includes(property))continue;
            if(!value)continue;
            if(!type){
                console.log("unknown field",[...path,property].join(".") );
                continue;
            }

            if(type.constructor === Object){
                if(value.constructor === Array){
                    //todo For not otimised object
                    for(let item of value){
                        this._pickProperty(item,type, [...path,property],chain)
                    }
                }
                else{
                    //optimised arrays
                    this._pickProperty(value,type, [...path,property],chain)
                }
            }
            else if(type.constructor === Array){
                for(let item in value){
                    this._pickProperty(value[item],type[0], [...path,property],chain)
                }
            }
            else {
                if(value.constructor === Array){
                    //todo For not otimised object
                    for(let item of value){
                        if(item.constructor === Object){
                            // item = item.value
                            this._pickField(item, 'value' , type, [...path,property],chain)
                        }
                        else{
                            this._pickField(value, value.indexOf("item") , type, [...path,property],chain)
                        }
                    }
                }
                else{
                    //for optimised objects
                    this._pickField(object, property , type, path,chain)
                }
            }
        }
    }
    chains = {}
    ingored = {}
    pick(include = {}, exclude = {}){




        let ignoredPaths =

        this.ingored = deep({
            validator:  [
                'CasterNotDead',
                'NotHidden',
                'Failure',
                'Pathable',
            ],
            path:  [
                'CValidatorUnitFilters',
                'CValidatorUnitCompareDamageTakenTime',
                'CEffectRemoveBehavior',
                'CValidatorUnitFilters',
                'CValidatorUnitCompareVital',
                'CValidatorUnitOrderQueue',
                'CValidatorUnitCompareResourceContents',
                'CValidatorUnitMover',
                'CValidatorUnitCompareMoverPhase',
                "CEffectIssueOrder.Abil",
                "CUpgrade.AffectedUnitArray",
                "CUpgrade.EffectArray.Reference",
                "CUnit.TechTreeProducedUnitArray.value",
                "CBehaviorBuff.Modification.AbilLinkDisableArray",
                "CBehaviorBuff.Modification.AbilLinkEnableArray",
                "CBehaviorBuff.Modification.BehaviorLinkDisableArray",
                "CBehaviorBuff.Modification.BehaviorLinkEnableArray.value",
                "CUnit.TechTreeUnlockedUnitArray",
                "CValidatorUnitCompareBehaviorCount.Behavior",
                "CValidator*.*.Effect",
                "CBehaviorBuff.DamageResponse.RequireEffectArray",
                "CRequirement*.Count.Link"
            ],
            requirementnode: [1,2,3,4,5,6,7,8,9,10],
            turret: [
                'FreeRotate'
            ],
            behavior: [
                'KillsToCaster',
                'CloakFieldEffect',
                'CloakField',
            ],
            effect: [
                'Kill',
                'Suicide',
                'AttackCancel',
                'DisableCasterWeaponsApplyBehavior',
                'DisableCasterEnergyRegenApplyBehavior',
                'TimedLifeFate',
            ],
            button: [
                'Move',
                'MovePatrol',
                'MoveHoldPosition',
                'AcquireMove',
                'Turn',
                'Stop',
                'Cheer',
                'Dance',
                'HoldFire',
                'HoldFireSpecial',
                'Cancel',
                'CancelBuilding',
                'Halt',
                'Spray',
                'AttackBuilding',
                'Attack',
                'AttackWorker',
            ],
            abil: [
                'RallyCommand',
                'HoldFire',
                'attack',
                'move',
                'stop',
                'que5',
                'que5Passive',
                'que5Addon',
                'que5CancelToSelection',
                'que5PassiveCancelToSelection',
                'que1',
                'Rally',
                'BuildInProgress'
            ]
        },exclude)

        for(let catalog in include){
            for(let unit of include[catalog]){
                this._pickEntity(unit,catalog)
            }
        }

        //i do not want to copy actors completely, only specifiic events. so clearing it
        for (let chainEntity in this.chains.actor){
            let entity = this.chains.actor[chainEntity].entity;
            this.chains.actor[chainEntity].entity = {id: entity.id, class: entity.class}
        }



        //
        // for (let actor of this.catalogs.actor){
        //     this.resolveParents(actor)
        //     this.arrayvalues(actor)
        //     this.resolveArrays(actor)
        //     this.stringvalues(actor)
        // }
        // for (let actor of this.catalogs.actor){
        //     this.resolveTokens(actor)
        // }

        for (let actor of this.catalogs.actor){
            for(let field of ["On","Remove"]){
                if(!actor[field])continue
                for (let actorAction of actor[field]){
                    if(!actorAction.Terms) continue

                    let actionCopy = deep({},actorAction)

                    let newchains = []
                    for(let terms of actionCopy.Terms){

                        let [event,...conditions] = terms.value.split(";").map(term => term.trim())
                        let termParts = event.split(".")
                        let catalog = {
                            Behavior: "behavior",
                            Abil: "abil",
                            WeaponStart: "weapon",
                            Upgrade: "upgrade",
                            Confirmation: "unit",
                            UnitConstruction: "unit",
                            UnitDeath: "unit",
                            UnitBirth: "unit",
                            UnitRevive: "unit",
                            Effect: "effect",
                        }[termParts[0]]


                        let entityID = termParts[1]
                        if(catalog && entityID && entityID !== "*"){
                            let entity = this.cache[catalog][entityID]
                            let chainEntity = entity && this.chains[catalog]?.[entity.id];
                            if(chainEntity?.picked){//is picked
                                newchains.push([ entity.class+"#"+entity.id, field+"."+ event])
                                this._reference(entity.id, catalog, "actor." + field, 'actor-event', terms, 'value')
                            }
                        }

                        for(let index =0; index < conditions.length; index++){
                            let condition = conditions[index]
                            let termParts = condition.split(" ").map(term => term.trim())
                            let catalog = {
                                MorphFrom: "unit",
                                MorphTo: "unit",
                            }[termParts[0]]
                            let entityID = termParts[1]
                            if(catalog && entityID && entityID !== "*"){
                                let entity = this.cache[catalog][entityID]
                                let chainEntity = entity && this.chains[catalog]?.[entity.id];
                                if(chainEntity?.picked){ // is picked
                                    newchains.push([ entity.class+"#"+entity.id, field+"."+ event])
                                    this._reference(entity.id, catalog, "actor." + field, 'actor-condition', terms, 'value' ,index )
                                }
                            }
                        }

                    }

                    if(newchains.length){
                        if(!this.chains.actor){
                            this.chains.actor = {}
                        }
                        if(!this.chains.actor[actor.id]){
                            this.chains.actor[actor.id] = {
                                entity: {id: actor.id, class: actor.class},
                                chains: []
                            }
                        }
                        let chainActor = this.chains.actor[actor.id];
                        if(!chainActor.chains)chainActor.chains = []
                        chainActor.picked = true
                        chainActor.chains.push(...newchains)

                        if(!chainActor.entity[field]){
                            chainActor.entity[field] = []
                        }
                        chainActor.entity[field].push(actionCopy)
                    }
                }
            }
        }

        //clear debug info
        for(let entity of this.entities){
            delete entity.references
        }
    }
    filter(){

        for(let catalog in this.catalogs){
            this.catalogs[catalog] = this.catalogs[catalog].filter(item => this.chains[catalog]?.[item.id]?.picked)
            if(!this.catalogs[catalog].length)delete this.catalogs[catalog]
        }
        for(let catalog in this.chains){
            for(let chainEntityID in this.chains[catalog]){
                if(!this.chains[catalog][chainEntityID].picked){
                    delete this.chains[catalog][chainEntityID]
                }else{
                    delete this.chains[catalog][chainEntityID].picked
                }
            }
        }

        this.catalogs.actor = Object.values(this.chains.actor).map(item => item.entity)

        this.updateEntities()
        this.updateCache()
    }
    renameEntities(mask){
        for(let catalog in this.catalogs) {
            if(catalog === 'actor')continue
            for (let entity of this.catalogs[catalog]) {
                let refs = this.chains[catalog][entity.id].references
                entity.id = mask.replace("*", entity.id)
                if (refs) {
                    for (let reference of refs) {
                        let value = reference.object[reference.property]
                        let newvalue
                        switch (reference.type) {
                            case 'actor-event': {
                                let [event, ...conditions] = value.split(";").map(term => term.trim())
                                let termParts = event.split(".")
                                termParts[1] = entity.id
                                newvalue = [termParts.join("."), ...conditions].join(";")
                                break;
                            }

                            case 'actor-condition': {
                                let [event, ...conditions] = value.split(";").map(term => term.trim())
                                let condition = conditions[reference.index]
                                let termParts = condition.split(" ").map(term => term.trim())
                                termParts[1] = entity.id
                                conditions[reference.index] = termParts.join(" ")
                                newvalue = [event, ...conditions].join(";")
                                break;
                            }
                            case 'reference': {
                                let [entityType, entityName, entityProperty] = value.split(",")
                                newvalue = [entityType, entity.id, entityProperty].join(",")
                                break;
                            }
                            case "abilcmd": {
                                let [entityName, cmd] = value.split(",")
                                newvalue = [entity.id, cmd].join(",")
                                break
                            }
                            default:
                                newvalue = entity.id
                        }
                        reference.object[reference.property] = newvalue

                    }
                }
            }
        }
        this.updateCache()
    }
    _warnings = {}
    _getType(schema,property){
        let type = schema[property] || schema['*']
        if(type?.constructor === String && type.startsWith("{")) {
            let valueType = type.replace("{", "").replace("}", "")
            type = [{value: valueType, index: "word"}]
        }
        else if(type?.constructor === String && type.startsWith("[")) {
            let valueType = type.replace("[", "").replace("]", "")
            type = [{value: valueType}]
        }
        return type
    }
    _resolveArrays(object, schema, path) {
        if(!schema || schema.constructor === String) return;
        let catalog = this._gameDataAssociations[object.class]

        for(let property in object){
            let type = this._getType(schema,property), value = object[property]
            if (['id', 'class', 'parent', 'default', 'index', 'removed'].includes(property)) continue;
            let _path = [...path,property];
            if(!value)continue;
            if(!type){
                // console.warn("unknown field", _path.join("."), JSON.stringify(value) )
                continue;
            }



            if(value.constructor === Array){
                if(type.constructor === Array) {
                    let result = [];
                    //Resolving Arrays
                    for(let i = 0 ; i< value.length;i++) {
                        let item = {...value[i]}
                        let index
                        if (type[0].index === 'word') {
                            index = result.indexOf(result.find(i => i.index === item.index));
                        } else {
                            index = +item.index;
                            if (index === undefined) index = -1
                            delete item.index
                        }

                        let removed = item.removed;
                        if (index >= 0) {
                            if (removed) {
                                result.splice(index, 1)
                            } else {
                                if (!result[index]) {
                                    result[index] = item
                                } else {
                                    deep(result[index], item)
                                }
                            }
                        } else {
                            result.push(item)
                        }
                    }

                    for(let item of result){
                        if(!item){
                            continue
                        }
                        this._resolveArrays(item,type[0], _path)
                    }
                    value = result

                }
                else {
                    let result = {}
                    for (let val of value) {
                        deep(result, val)
                    }
                    value = [result]

                    this._resolveArrays(value[0],type, _path)
                }
            }
            else if(value.constructor === Object) {
                this._resolveArrays(value,type, _path)
            }
            object[property] = value
        }
    }
    resolveArrays(entity = null) {
        if(entity){
            let catalog = this._gameDataAssociations[entity.class]
            let schema = this._getSchema(catalog,entity.class)
            this._resolveArrays(entity,schema,[catalog])
            return entity;
        }

        for(let catalog in this.catalogs) {
            for (let entity of this.catalogs[catalog]) {
                let schema = this._getSchema(catalog,entity.class)
                this._resolveArrays(entity,schema,[catalog])
            }
        }
    }
    _optimizeObject(object, schema, path) {
        if(!schema) return;
        for(let property in object){
            let type = this._getType(schema,property), value = object[property]
            if (['id', 'class', 'parent', 'default', 'index', 'removed'].includes(property)) continue;
            let _path = [...path,property];
            if(!value)continue;
            if(!type){
                console.warn("unknown field", _path.join("."), JSON.stringify(value) );continue;
            }
            if(type.constructor === Object){
                if(value.constructor === Array ){
                    if(!value.length){
                        delete object[property];
                        continue;
                    }
                    else if(value.length === 1){
                        value = value[0]
                    }
                    else{
                        let result = {}
                        for(let val of value){
                            deep(result,val,'replace')
                        }

                        let str = _path.join(".")
                        if(!this._warnings[str]){
                            this._warnings[str] = []
                        }
                        this._warnings[str].push(value)
                        // console.warn("Wrong type, expect Object not array ",str, JSON.stringify(value))
                        value = result
                    }
                }
                if(value.constructor === String ){
                    console.log("string? not object")
                }
                this._optimizeObject(value,type, _path)
            }
            else if(type.constructor === Array){
                if(value.constructor !== Array){
                    console.log("??? not Array")
                }
                if(type[0].index === "word" || type[0].index === "string"){
                    let newtype = {...type[0]}
                    delete newtype.index
                    delete newtype.removed

                    if(Object.keys(newtype).length === 1 && newtype.value !== undefined){
                        newtype = {'*': newtype.value}
                    }
                    else{
                        newtype = {'*': newtype}
                    }


                    let newvalue = {}
                    for(let i = 0 ; i< value.length;i++){
                        let item = {...value[i]}
                        if(!item){
                            console.log("DF")
                        }
                        let index = item.index
                        let removed = item.removed
                        delete item.index
                        delete item.removed

                        if(index !== undefined){
                            if(removed){
                                delete newvalue[index]
                            }
                            else{
                                newvalue[index] = item
                            }
                        }
                    }

                    this._optimizeObject(newvalue,newtype,_path)

                    value = newvalue
                }
                else{
                    for(let item in value){
                        this._optimizeObject(value[item],type[0], _path)
                    }
                }
            }
            else if(type.constructor === String){

                if (value.constructor === Array){
                    if (value.length === 1) {
                        value = value[0]
                    }
                    else if (value.length === 0) {
                        value = ''
                        console.log("#$$$A")
                    }
                    else{
                        let result = {}
                        for(let val of value){
                            deep(result,val,'replace')
                        }
                        value = result
                    }
                    if (value.constructor === Object && Object.keys(value).length === 1 && value.value !== undefined) {
                        value = value.value
                    }
                }
                if (value.constructor === Object ) {
                    if(Object.keys(value).length === 1 && value.value !== undefined){
                        value = value.value
                    }
                    else if(Object.keys(value).length === 0){
                        value = ''
                        console.log("#$$$")
                    }
                    else{
                        console.log("Object not a string",_path.join("."),JSON.stringify(value))
                    }
                }

                switch(type){
                    case "bit":
                    case "real":
                    case "int": {
                        value = +value
                        if(isNaN(value)){
                            console.warn("#$")
                        }
                    }
                }
            }
            object[property] = value
        }
    }
    optimize() {
        for(let catalog in this.catalogs) {
            for (let entity of this.catalogs[catalog]) {
                let schema = this._getSchema(catalog,entity.class)
                this._optimizeObject(entity,schema,[catalog])
            }
        }
    }
    _arrayvalues(object,_path) {
        for(let property in object){
            if (['id', 'class', 'parent', 'default', 'index', 'removed','value'].includes(property)) continue;
            let value = object[property]
            if(object.id === "StereoscopicOptionsUnit" && property === "unitName"){
                property
            }
            if(value.constructor === String) {
                object[property] = [{value}]
            }
            else if(value.constructor === Object) {
                this._arrayvalues(value,[..._path,property])
                object[property] = [value]
            }
            else if(value.constructor === Array) {
                for(let item of value){
                    this._arrayvalues(item,[..._path,property])
                }
            }
        }
    }
    arrayvalues(entity = null) {
        if(entity)return this._arrayvalues(entity,[entity.class + "#" + entity.id])
        for(entity of this.entities) {
            this._arrayvalues(entity,[entity.class + "#" + entity.id])
        }
    }


    _optimiseForXML(object){

        for(let property in object){
            if (['class','$'].includes(property)) continue;
            let value = object[property]


            if(value.constructor === String) {
                if(!object.$)object.$ = {}
                object.$[property] = value
                delete object[property]
            }



            if(value.constructor === Object) {
                this._optimiseForXML(value)
            }
            if(value.constructor === Array) {
                for(let item of value){
                    this._optimiseForXML(item)
                }
            }
        }
    }
    optimiseForXML(object) {
        for(let property in object){
            if (['class','$'].includes(property)) continue;
            let value = object[property]

            if (/[a-z]/.test(property[0])){
                if(!object.$)object.$ = {}
                if(value.constructor === Array){
                    value = value[0].value
                }
                object.$[property] = value
                delete object[property]
            }
            else if(value.constructor === Array) {
                for(let item of value){
                    this._optimiseForXML(item)
                }
            }
            else if(value.constructor === String) {
                object[property] = {$: {value}}
            }
        }
    }
    _stringvalues(object) {
        for(let property in object){
            if (['id', 'class', 'parent', 'default', 'index', 'removed'].includes(property)) continue;
            let value = object[property]

            if(value.constructor === Array){
                if(value.length === 1 && value[0].constructor === Object && Object.keys(value[0]).length === 1 && value[0].value !== undefined) {
                    object[property] = value[0].value
                }
                else{
                    for(let item of value) {
                        this._stringvalues(item)
                    }
                }
            }
        }
    }
    stringvalues(entity = null) {
        if(entity)return this._stringvalues(entity)
        for(entity of this.entities) {
            this._stringvalues(entity)
        }
    }
    updateEntities(){
        this.entities = [];
        for(let catalog in this.catalogs){
            this.entities.push(...this.catalogs[catalog])
        }
    }
    _schemaValues = null
    _matchPath(path1,path2){
        if(!path1 || path1 === "*"){
            return true;
        }
        let path1Array = path1.constructor === String ? path1.split("."): path1
        let path2Array = path2.constructor === String ? path2.split("."): path2

        for(let i in path2Array){
            if(path1Array[i] === "*")continue

            if(path1Array[i] !== path2Array[i]){
                if(new RegExp(path1Array[i]).test(path2Array[i]) === false ){
                    return false
                }
            }
        }
        return true;
    }
    _objectScheme(object,schema,path,options = {}){

        if(! this._matchPath(options.path,path)){
            return
        }

        for (let property in object) {
            if (['id', 'class', 'parent', 'default', 'removed'].includes(property)) continue;
            let _path = [...path,property].join(".")

            if(property === "Unit"){
                property
            }
            if(! this._matchPath(options.path,_path))continue

            if(property === "Unit"){
                property
            }




            let value = object[property]

            if(!this._schemaValues[_path]){
                this._schemaValues[_path] = []
            }
            let values = this._schemaValues[_path];


            let isarray = property.endsWith("Array") || (value.constructor === Array && value.length > 1)
            if(isarray && value.constructor === String){
                value = [{value}]
            }

            if (value.constructor === Array && value.length === 1){
                value = value[0]
            }
            if(value.constructor === Object){
                isarray = isarray || value.index || value.removed
                value = {...value}
                // delete value.index
                delete value.removed
                if(isarray) value = [value]
            }
            if (value.constructor === Object && !Object.keys(value).length) {
                continue
            }
            if (value.constructor === Object && Object.keys(value).length === 1 && value.value !== undefined) {
                value = value.value
            }


            if(value === ""){
                continue
            }
            let type = this._getType(schema,property)

            if(type){
                if(type.constructor === Array ){
                    if(value.constructor === Object){
                        value = [value]
                    }
                    if(value.constructor === String){
                        value = [{value}]
                    }
                }
                if (type.constructor === Object ) {
                    if(value.constructor === Array){
                        type = [type]
                    }
                    if(value.constructor === String){
                        value = {value}
                    }
                }
                if (type.constructor === String ) {
                    if (value.constructor === Array) {
                        type = [{value: type}]
                    }
                    if (value.constructor === Object) {
                        type = {value: type}
                    }
                }
            }
            else {
                if(value.constructor === Array ){
                    type = [{}]
                }
                if (value.constructor === Object) {
                    type = {}
                }
                if (value.constructor === String) {
                    type = 'unknown'
                }
            }

            values.push(value)

            let specialProperties = {
                "SortArray": "[targetsort]",
                // "EffectArray": "[effect]",
                // "PeriodicEffectArray": "[effect]",
                race: "race",
                Race: "race",
                Face: "button",
                "BuildOnAs": "unit",
                // "BuiltOn": "[unit]",
                // GlossaryAlias: "[unit]",
                // TechAliasArray: "[unit]",
                // GlossaryStrongArray: "[unit]",
                // GlossaryWeakArray: "[unit]",
                Ops: "ops",
                Send: "send",
                Terms: "terms",
                Reference: "reference",
                AbilCmd: "abilcmd",
                SelectAbilCmd: "abilcmd",
            };


            let newtypeoptions
            if(property === "index"){
                if(type !== 'word' && isNumeric(value)){
                    type = 'int'
                    continue;
                }
                else{
                    type = 'word'
                }
            }
            else if(specialProperties[property]){
                type = specialProperties[property]
            }
            else if (value.constructor === Array) {
                let typeitem = type[0]
                // if (value.find(item => item.index && !isNumeric(item.index))) {
                //     typeitem.index = "word"
                // }
                for (let valueitem of value) {
                    this._objectScheme(valueitem, typeitem,[...path,property],options)
                }
                let len = Object.keys(typeitem).length

                if(typeitem.value?.constructor === String){
                    if(len === 1 || (len === 2 && ["bit","int"].includes(typeitem.index))){
                        type = `[${typeitem.value}]`
                    }
                    else if(len === 2 && typeitem.index === "word"){
                        type = `{${typeitem.value}}`
                    }
                }
            }
            else if (value.constructor === Object) {
                this._objectScheme(value, type,[...path,property],options)
            }
            else if (value === '0' || value === '1') {
                newtypeoptions = {
                    type: 'bit',
                    bigger: ['reals','real','int']
                }
            }
            else if (/^-?(0|[1-9]\d*)$/.test(value)) {
                newtypeoptions = {
                    type: 'int',
                    smaller: ['bit'],
                    bigger: ['reals','real']
                }
            }
            else if (/^(-?(0|[1-9]\d*)(\.\d+)?)$/.test(value)) {
                newtypeoptions = {
                    type: 'real',
                    smaller: ['int','ints','bit'],
                    bigger: ['reals']
                }
            }
            else if (/^-?(0|[1-9]\d*)(,-?(0|[1-9]\d*))+$/.test(value)) {
                newtypeoptions = {
                    type: 'ints',
                    smaller: ['int','bit'],
                    bigger: ['reals']
                }
            }
            else if (/^(-?(0|[1-9]\d*)(\.\d+)?)(\,-?(0|[1-9]\d*)(\.\d+)?)*$/.test(value)) {
                newtypeoptions = {
                    type: 'reals',
                    smaller: ['ints','real','int','bit']
                }
            }
            else if (/^(-|\w+(,\w+){0,});(-|\w+(,\w+){0,})$/.test(value)) {
                newtypeoptions = {
                    type: 'filters'
                }
            }
            else if (/^(\w+\:\w*)(,\w+\:\w*){0,}$/.test(value)) {
                newtypeoptions = {
                    type: 'categories',
                    smaller: ['word']
                }
            }
            else if (/^Assets[\\/][\\/\w\-. ]\.\w+$/.test(value) || property.endsWith("Icon")) {
                newtypeoptions = {
                    type: 'file',
                    smaller: ['word']
                }
            }
            else if (/^[A-Za-z_@#0-9]+(\/+[A-Za-z_@#0-9]+)+\/?$/.test(value)) {
                newtypeoptions = {
                    type: 'link',
                    smaller: ['word']
                }
            }
            else if (/^[\w+@_#]+$/.test(value)) {
                let catalog;
                for (let compareCatalog in this.cache) {
                   // let compareCatalogCapitalized = compareCatalog.substr(0, 1).toUpperCase() + compareCatalog.substr(1);

                    if (this.cache[compareCatalog][value]) {
                        let parentNode = path[path.length - 1]

                        if (property.toLowerCase().includes(compareCatalog)) {
                            catalog = compareCatalog;
                            break;
                        }
                        if ((property==="value" || property==="Link") && parentNode.toLowerCase().includes(compareCatalog)) {
                            catalog = compareCatalog;
                            break;
                        }
                    }

                    if(type === compareCatalog){
                        catalog = compareCatalog;
                        break;
                    }
                }
                if(catalog){

                    newtypeoptions = {
                        type: catalog,
                        smaller: ['word']
                    }
                }
                else{
                    newtypeoptions = {
                        type: 'word',
                        bigger: ['words']
                    }
                }

            }
            else if (/^[\w+@_#]+(,[\w+@_#]+)+$/.test(value)) {
                newtypeoptions = {
                    type: 'words',
                    smaller: ['word']
                }
            }
            else {
                newtypeoptions = {
                    type: 'string'
                }
            }



            if(newtypeoptions && type !== newtypeoptions.type && !newtypeoptions.bigger?.includes(type) && type !== 'string'){
                if(type === 'unknown' || newtypeoptions.smaller?.includes(type)) {
                    type = newtypeoptions.type
                }
                else{
                    type = 'string'
                }
            }


            schema[property] = type
        }

    }
    schema= {}
    makeSchema({group = 'catalog',path = '*'}) {

        // this.catalogs.button.push(
        //     {id: 'RallyExtra'},
        //     {id: 'SimpleTargetAbil'}
        // )
        // this.updateCache()
        this.resolveTokens()

        this._schemaValues = {}
        for(let catalog in this.catalogs){
            if([
                "sss","const",
                "achievement","achievementterm","armycategory","armyunit","armyupgrade","bankcondition",
                "boost","bundle","camera","campaign","emoticon","emoticonpack","objective","preload","premiummap",
                "racebannerpack","reward","scoreresult","scorevalue","stimpack","talentprofile","trophy",
                "warchest","warchestseason","talent",

            ].includes(catalog)){
                continue;
            }
            if(catalog === "sss")continue;

                for(let entity of this.catalogs[catalog]) {

                    let schemaName
                    if(group === "catalog"){
                        schemaName = catalog
                    }
                    if(group === "class"){
                        schemaName = entity.class
                    }
                    if(!this.schema[schemaName])this.schema[schemaName] = {}
                    this._objectScheme(entity,this.schema[schemaName],[schemaName] ,{path})
                }
        }


        deepReplaceMatch(this.schema, val => val.constructor===Object && Object.keys(val).length === 0,null, ({val, obj, prop,x ,path,crumbs}) => {
            let index
            if(obj.constructor === Object){
                index = path.length -1
            }
            if(obj.constructor === Array){
                index = path.length -2
            }
            delete path[index][crumbs[index]]
            while(index> 0 && path[index].constructor===Object && Object.keys(path[index]).length === 0){
                index--
                delete path[index][crumbs[index]]
            }
        })

        delete this._schemaValues
        return this.schema;
    }
    _saveRawData(output, outputPath) {
        this._makeDirectories(outputPath)
        fs.writeFileSync(outputPath, output)
    }
    _saveTextData(data, outputPath) {
        let output = Object.entries(data).map(([key, value]) => `${key}=${value}`).join("\n")
        this._makeDirectories(outputPath)
        fs.writeFileSync(outputPath, output)
    }
    _makeDirectories(path) {
        fs.mkdirSync(path.substring(0, path.lastIndexOf("/")), {recursive: true});
    }
    _readTextFile(localeFile) {
        if (!fs.existsSync(localeFile)) {
            return null;
        }
        let raw = fs.readFileSync(localeFile, {encoding: 'utf-8'})
        return this._parseLanguagRawData(raw)
    }
    _collectDataRecoursive(Instance, path, ModName) {
        if (!path) path = []
        // if (path.length > 10) {
        //     console.log(path)
        // }
        let result = ModName ? {$: [ModName]} : {}
        if (Instance.$) {
            for (let field in Instance.$) {
                result[field] = Instance.$[field]
                // delete Instance.$;
            }
        }
        for (let field in Instance) {
            if (field === "$") continue
            if (!field.startsWith("?") && Instance[field].constructor === Array) {
                if (!result[field]) result[field] = []
                for (let Entity of Instance[field]) {
                    let element = this._collectDataRecoursive(Entity, [...path, field], ModName)
                    if (result[field].constructor === String) {
                        console.log(`duplicate field value ${result.id} ${field}`)
                        result[field] = element
                    } else {
                        result[field].push(element)
                    }
                }
            } else {
                result[field] = Instance[field]
            }
        }
        return result
    }
    async load(file) {
        let raw = fs.readFileSync(file, {encoding: 'utf-8'})
        if (file.endsWith(".json")) {
            this.catalogs = JSON.parse(raw)
        }
        if (file.endsWith(".yaml")) {
            this.catalogs = yaml.load(raw)
        }

        // this.arrayvalues()
        this.updateCache()
        this.updateEntities()
    }
}






((prototype)=>{
    let supportdata = {
            "": [ "S",
                "SAbil","SAbilArmMagazineInfo", "SAbilCmdButton", "SAbilMorphInfo", 
                "SBehavior","SBehaviorDuration", "SBehaviorFraction", 
                "SCameraSmooth",
                "SCommanderDifficultyLevel", "SCommanderMasteryTalent", "SCommanderTalentTree",
                "SConversationAction", "SConversationCondition", "SConversationFacialAnim", "SConversationGroup", "SConversationLine",
                "SCost", "SDeathResponse", "SLightInfo", "SMarker", "SModification", "SSoundAsset", "SSoundData", "SSpawnInfo"],
           
           
           
            "abil": [ "CAbil", "CAbilArmMagazine", "CAbilAttack", "CAbilAttackModifier", "CAbilAugment", "CAbilBattery", "CAbilBeacon", "CAbilBehavior", "CAbilBuild", "CAbilBuildable",
                "CAbilEffect", "CAbilEffectInstant", "CAbilEffectTarget",
                "CAbilHarvest", "CAbilInteract", "CAbilInventory", "CAbilLearn", "CAbilMerge", "CAbilMergeable", "CAbilMorph", "CAbilMorphPlacement", "CAbilMove", "CAbilPawn", "CAbilProgress", "CAbilQueue", "CAbilQueueable", "CAbilRally", "CAbilRedirect", "CAbilRedirectInstant", "CAbilRedirectTarget", "CAbilResearch", "CAbilRevive", "CAbilSpecialize", "CAbilStop", "CAbilTrain", "CAbilTransport", "CAbilWarpTrain", "CAbilWarpable",],
            "accumulator": [ "CAccumulator", "CAccumulatorConstant","CAccumulatorAbilLevel", "CAccumulatorArithmetic", "CAccumulatorAttributePoints", "CAccumulatorBehavior", "CAccumulatorCargo", "CAccumulatorDistance", "CAccumulatorEffectAmount", "CAccumulatorSwitch", "CAccumulatorUnitCustomValue", "CAccumulatorUserData", "CAccumulatorVitals",],
            "achievement": ["CAchievement"],
            "achievementterm": [ "CAchievementTerm", "CAchievementTermAbilInteract", "CAchievementTermAbilLoad", "CAchievementTermAbilUse", "CAchievementTermAchievement", "CAchievementTermBehaviorCount", "CAchievementTermBehaviorState", "CAchievementTermCombine", "CAchievementTermEffectAbsorbed", "CAchievementTermEffectDamaged", "CAchievementTermEffectDodged", "CAchievementTermEffectHealed", "CAchievementTermEffectKilled", "CAchievementTermEffectUse", "CAchievementTermGeneric", "CAchievementTermReplay", "CAchievementTermScoreValue", "CAchievementTermTime", "CAchievementTermUnitBirth", "CAchievementTermUnitDeath", "CAchievementTermUnitKills", "CAchievementTermUnitRegen", "CAchievementTermUnitSupplyLoss",],
            "actor": [       "CActor", "CActorAction", "CActorActionOverride", "CActorArc", "CActorBase", "CActorBatch", "CActorBeamSimple", "CActorBeamStandard", "CActorBearings", "CActorCamera", "CActorCameraModel", "CActorCreep", "CActorCutscene", "CActorDoodad", "CActorDoodadPreserver", "CActorEditorCamera", "CActorEditorPoint", "CActorEventMacro", "CActorFoliageFXSpawner", "CActorForce", "CActorForceBox", "CActorForceConeRoundedEnd", "CActorForceCylinder", "CActorForceSphere", "CActorGlobalConfig", "CActorLightModel", "CActorLightOmni","CActorLightOmniModel","CActorLightSpot","CActorLightSpotModel","CActorList","CActorLookAt","CActorMissile","CActorModel","CActorModelMaterial","CActorPortrait","CActorPower","CActorProgress","CActorPropertyCurveSet","CActorQuad","CActorQueryResponse","CActorRange","CActorRegion","CActorRegionArc","CActorRegionCircle","CActorRegionGame","CActorRegionQuad","CActorRegionWater","CActorScene","CActorSelection","CActorSetQueried","CActorShadow","CActorShield","CActorShieldImpact","CActorSimple","CActorSite","CActorSiteBillboard","CActorSiteMover","CActorSiteOp2DRotation","CActorSiteOpAction","CActorSiteOpAttach","CActorSiteOpAttachVolume","CActorSiteOpBanker","CActorSiteOpBankerUnit","CActorSiteOpBasic","CActorSiteOpCursor","CActorSiteOpDeathMotion","CActorSiteOpEffect","CActorSiteOpForward","CActorSiteOpGameCameraFollow","CActorSiteOpHeight","CActorSiteOpHigherOfTerrainAndWater","CActorSiteOpHostBearings","CActorSiteOpHostedOffset","CActorSiteOpIncoming","CActorSiteOpLocalOffset","CActorSiteOpOrbiter","CActorSiteOpPatch","CActorSiteOpPhysicsImpact","CActorSiteOpRandomPointInCircle","CActorSiteOpRandomPointInCrossbar","CActorSiteOpRandomPointInSphere","CActorSiteOpRotationExplicit","CActorSiteOpRotationRandom","CActorSiteOpRotationSmooth","CActorSiteOpRotationVariancer","CActorSiteOpRotator","CActorSiteOpSelectionOffset","CActorSiteOpSerpentHead","CActorSiteOpSerpentSegment","CActorSiteOpShadow","CActorSiteOpTilter","CActorSiteOpTipability","CActorSiteOpUp","CActorSiteOpZ","CActorSiteOrbiter","CActorSiteRocker","CActorSnapshot","CActorSound","CActorSplat","CActorSquib","CActorStateMonitor","CActorTerrain","CActorTerrainDeformer","CActorText","CActorTurret","CActorUnit",],
            "actorsupport":[],
            "alert": [ "CAlert",],
            "armycategory": ["CArmyCategory"],
            "armyunit": ["CArmyUnit"],
            "armyupgrade": [ "CArmyUpgrade"],
            "artifact": ["CArtifact"],
            "artifactslot": ["CArtifactSlot"],
            "attachmethod": [ "CAttachMethod","CAttachMethodArcTest","CAttachMethodAttachType","CAttachMethodBestMatch","CAttachMethodFilter","CAttachMethodIncoming","CAttachMethodNodeOccupancy","CAttachMethodNodeOccupancy2","CAttachMethodNumericField","CAttachMethodPattern","CAttachMethodPortAllocator","CAttachMethodProximity","CAttachMethodRandom","CAttachMethodReduction","CAttachMethodVolumesRequery","CAttachMethodVolumesTargets","CAttachMethodVolumesWeightedPick",],
            "bankcondition": [  "CBankConditionCompare","CBankConditionCompareValueCount","CBankConditionCompareValueSum",],
            "beam": [ "CBeamAsyncLinear"],
            "behavior": ["CBehavior","CBehaviorAttackModifier","CBehaviorAttribute","CBehaviorBuff","CBehaviorClickResponse","CBehaviorConjoined","CBehaviorCreepSource","CBehaviorJump","CBehaviorPowerSource","CBehaviorPowerUser","CBehaviorResource","CBehaviorReveal","CBehaviorSpawn","CBehaviorUnitTracker","CBehaviorVeterancy","CBehaviorWander",],
            "boost": [  "CBoost",],
            "bundle": [  "CBundle",],
            "button": [ "CButton",],
            "camera": [ "CCamera",],
            "campaign": [ "CCampaign",],
            "character": [  "CCharacter",],
            "cliff": [  "CCliff", "CCliffDoodad"],
            "cliffmesh": ["CCliffMesh",],
            "colorstyle": ["CColorStyle",],
            "commander": ["CCommander",],
            "config": ["CConfig",],
            "consoleskin": ["CConsoleSkin",],
            "conversation": ["CConversation",],
            "conversationstate": ["CConversationState",],
            "cursor": ["CCursor",],
            "datacollection": [ "CDataCollection", "CDataCollectionAbil", "CDataCollectionUnit", "CDataCollectionUpgrade",],
            "datacollectionpattern": ["CDataCollectionPattern",],
            "decalpack": ["CDecalPack",],
            "dsp": ["CDSPChorus", "CDSPCompressor", "CDSPCustomCompressor", "CDSPDistortion", "CDSPEcho", "CDSPFlange", "CDSPHighPass", "CDSPLimiter", "CDSPLowPass", "CDSPLowPassSimple", "CDSPNormalize", "CDSPParamEQ", "CDSPPitchShift", "CDSPReverb",],
            "effect": ["CEffect","CEffectAddTrackedUnit","CEffectApplyBehavior","CEffectApplyForce","CEffectApplyKinetic","CEffectCancelOrder","CEffectCreateHealer","CEffectCreatePersistent","CEffectCreateUnit","CEffectCreep","CEffectDamage","CEffectDestroyPersistent","CEffectEnumArea","CEffectEnumMagazine","CEffectEnumTransport","CEffectIssueOrder","CEffectLastTarget","CEffectLaunchMissile","CEffectLoadContainer","CEffectModifyPlayer","CEffectModifyUnit","CEffectRandomPointInCircle","CEffectRedirectMissile","CEffectReleaseMagazine","CEffectRemoveBehavior","CEffectRemoveKinetic","CEffectReturnMagazine","CEffectSet","CEffectSwitch","CEffectTeleport","CEffectTransferBehavior","CEffectUseCalldown","CEffectUseMagazine","CEffectUserData",],
            "emoticon": ["CEmoticon",],
            "emoticonpack": ["CEmoticonPack",],
            "error": [],
            "footprint": [    "CFootprint",],
            "fow": [    "CFoW",],
            "game": [    "CGame",],
            "gameui": [    "CGameUI",],
            "herd": [    "CHerd",],
            "herdnode": [    "CHerdNode",],
            "hero": [    "CHero",],
            "heroabil": [    "CHeroAbil",],
            "herostat": [    "CHeroStat",],
            "item": [    "CItem", "CItemAbil", "CItemEffect", "CItemEffectInstant", "CItemEffectTarget",],
            "itemclass": [    "CItemClass",],
            "itemcontainer": [    "CItemContainer",],
            "kinetic": [    "CKinetic", "CKineticDistance", "CKineticFollow", "CKineticRotate", "CKineticSequence", "CKineticSet", "CKineticTranslate",],
            "lensflareset": [    "CLensFlareSet",],
            "light": [    "CLight",],
            "location": [    "CLocation",],
            "loot": [    "CLoot", "CLootEffect", "CLootItem", "CLootSet", "CLootSpawn", "CLootUnit",],
            "map": [    "CMap",],
            "model": [    "CModel", "CModelFoliage",],
            "mount": [    "CMount",],
            "mover": [    "CMover", "CMoverAvoid", "CMoverFlock", "CMoverMissile",],
            "objective": [    "CObjective",],
            "physicsmaterial": [    "CPhysicsMaterial",],
            "ping": [    "CPing",],
            "playerresponse": [    "CPlayerResponse", "CPlayerResponseUnit", "CPlayerResponseUnitBirth", "CPlayerResponseUnitDamage", "CPlayerResponseUnitDeath",],
            "portraitpack": [    "CPortraitPack",],
            "preload": [    "CPreload", "CPreloadActor", "CPreloadConversation", "CPreloadModel", "CPreloadSound", "CPreloadUnit",],
            "premiummap": [    "CPremiumMap",],
            "racebannerpack": [    "CRaceBannerPack",],
            "race": [    "CRace",],
            "requirement": [    "CRequirement",],
            "requirementnode": [    "CRequirementAllowAbil","CRequirementAllowBehavior","CRequirementAllowUnit","CRequirementAllowUpgrade","CRequirementAnd","CRequirementConst","CRequirementCountAbil","CRequirementCountBehavior","CRequirementCountUnit","CRequirementCountUpgrade","CRequirementDiv","CRequirementEq","CRequirementGT","CRequirementGTE","CRequirementLT","CRequirementLTE","CRequirementMod","CRequirementMul","CRequirementNE","CRequirementNode","CRequirementNot","CRequirementOdd","CRequirementOr","CRequirementSum","CRequirementXor",],
            "reverb": [    "CReverb",],
            "reward": [    "CReward", "CRewardConsoleSkin", "CRewardDecal", "CRewardEmoticon", "CRewardIcon", "CRewardModel", "CRewardPoints", "CRewardPortrait", "CRewardPortraitInGame", "CRewardRaceBanner", "CRewardSpray", "CRewardSprayUseDecal", "CRewardTrophy", "CRewardVoicePack",],
            "scoreresult": [    "CScoreResult", "CScoreResultBuildOrder", "CScoreResultExperience", "CScoreResultGraph", "CScoreResultPerformance", "CScoreResultRoot", "CScoreResultScore",],
            "scorevalue": [    "CScoreValue", "CScoreValueCombine", "CScoreValueCustom", "CScoreValueStandard",],
            "shape": [    "CShape", "CShapeArc", "CShapeQuad",],
            "skin": [    "CSkin",],
            "skinpack": [    "CSkinPack",],
            "sound": [    "CSound",],
            "soundexclusivity": [    "CSoundExclusivity",],
            "soundmixsnapshot": [    "CSoundMixSnapshot",],
            "soundtrack": [    "CSoundtrack",],
            "spray": [    "CSpray",],
            "spraypack": [    "CSprayPack",],
            "stimpack": [    "CStimPack",],
            "taccooldown": [    "CTacCooldown",],
            "tactical": [    "CTactical", "CTacticalOrder", "CTacticalSet",],
            "talent": [    "CTalent",],
            "talentprofile": [    "CTalentProfile",],
            "targetfind": [    "CTargetFind","CTargetFindBestPoint","CTargetFindEffect","CTargetFindEnumArea","CTargetFindLastAttacker","CTargetFindOffset","CTargetFindOrder","CTargetFindRallyPoint","CTargetFindSet","CTargetFindWorkerRallyPoint",],
            "targetsort": [    "CTargetSort","CTargetSortValidator","CTargetSortField", "CTargetSortAlliance","CTargetSortAngle","CTargetSortBehaviorCount","CTargetSortChargeCount","CTargetSortChargeRegen","CTargetSortCooldown","CTargetSortDistance","CTargetSortInterruptible","CTargetSortMarker","CTargetSortPowerSourceLevel","CTargetSortPowerUserLevel","CTargetSortPriority","CTargetSortRandom","CTargetSortVital","CTargetSortVitalFraction",],
            "terrain": [    "CTerrain",],
            "terrainobject": [    "CTerrainObject",],
            "terraintex": [    "CTerrainTex",],
            "texture": [    "CTexture",],
            "texturesheet": [    "CTextureSheet",],
            "tile": [    "CTile",],
            "trophy": [    "CTrophy",],
            "turret": [    "CTurret",],
            "unit": [    "CUnit",],
            "upgrade": [    "CUpgrade",],
            "user": [    "CUser",],
            "validator": [    "CValidator","CValidatorUnitCompareCooldown","CValidatorCombine","CValidatorCondition","CValidatorEffect","CValidatorEffectCompareDodged","CValidatorEffectCompareEvaded","CValidatorEffectTreeUserData","CValidatorFunction","CValidatorGameCommanderActive","CValidatorGameCompareTerrain","CValidatorGameCompareTimeEvent","CValidatorGameCompareTimeOfDay","CValidatorLocation","CValidatorLocationArc","CValidatorLocationCompareCliffLevel","CValidatorLocationComparePower","CValidatorLocationCompareRange","CValidatorLocationCreep","CValidatorLocationCrossChasm","CValidatorLocationCrossCliff","CValidatorLocationEnumArea","CValidatorLocationInPlayableMapArea","CValidatorLocationPathable","CValidatorLocationPlacement","CValidatorLocationShrub","CValidatorLocationType","CValidatorLocationVision","CValidatorPlayer","CValidatorPlayerAlliance","CValidatorPlayerCompareDifficulty","CValidatorPlayerCompareFoodAvailable","CValidatorPlayerCompareFoodUsed","CValidatorPlayerCompareRace","CValidatorPlayerCompareResource","CValidatorPlayerCompareResult","CValidatorPlayerCompareType","CValidatorPlayerFood","CValidatorPlayerRequirement","CValidatorUnit","CValidatorUnitAI","CValidatorUnitAbil","CValidatorUnitAlliance","CValidatorUnitBehaviorStackAlias","CValidatorUnitBehaviorState","CValidatorUnitCombatAI","CValidatorUnitCompareAIAreaEvalRatio","CValidatorUnitCompareAbilSkillPoint","CValidatorUnitCompareAttackPriority","CValidatorUnitCompareBehaviorCount","CValidatorUnitCompareCargo","CValidatorUnitCompareChargeUsed","CValidatorUnitCompareDamageDealtTime","CValidatorUnitCompareDamageTakenTime","CValidatorUnitCompareDeath","CValidatorUnitCompareField","CValidatorUnitCompareHeight","CValidatorUnitCompareKillCount","CValidatorUnitCompareMarkerCount","CValidatorUnitCompareMoverPhase","CValidatorUnitCompareOrderCount","CValidatorUnitCompareOrderTargetRange","CValidatorUnitComparePowerSourceLevel","CValidatorUnitComparePowerUserLevel","CValidatorUnitCompareRallyPointCount","CValidatorUnitCompareResourceContents","CValidatorUnitCompareResourceHarvesters","CValidatorUnitCompareSpeed","CValidatorUnitCompareVeterancyLevel","CValidatorUnitCompareVital","CValidatorUnitCompareVitality","CValidatorUnitDetected","CValidatorUnitFilters","CValidatorUnitFlying","CValidatorUnitInWeaponRange","CValidatorUnitInventory","CValidatorUnitInventoryContainsItem","CValidatorUnitInventoryIsFull","CValidatorUnitKinetic","CValidatorUnitLastDamagePlayer","CValidatorUnitMissileNullified","CValidatorUnitMover","CValidatorUnitOrder","CValidatorUnitOrderQueue","CValidatorUnitOrderTargetPathable","CValidatorUnitOrderTargetType","CValidatorUnitPathable","CValidatorUnitPathing","CValidatorUnitScanning","CValidatorUnitState","CValidatorUnitTestWeaponType","CValidatorUnitType","CValidatorUnitWeaponAnimating","CValidatorUnitWeaponFiring","CValidatorUnitWeaponPlane",],
            "voiceover": [ "CVoiceOver",],
            "voicepack": [ "CVoicePack",],
            "warchest": [ "CWarChest",],
            "warchestseason": [ "CWarChestSeason",],
            "water": [ "CWater",],
            "weapon": [ "CWeapon", "CWeaponLegacy", "CWeaponStrafe",],
        }


    prototype._gameDataSupport = supportdata
    prototype._gameDataAssociations = {
        "const": "const"
    }
    for(let fname in supportdata){
        for(let type of supportdata[fname]){
            prototype._gameDataAssociations[type] = fname
        }
    }
    prototype._gameDataFiles = Object.keys(supportdata)

    let classinfo = {
        entity: {}
    }

    for(let catalog in supportdata){
        let prototype = supportdata[catalog][0]
        classinfo[prototype] = {catalog}

        for(let i= 1;i < supportdata[catalog].length ; i++){
            let classname = supportdata[catalog][i]
            classinfo[classname] = {prototype}
        }
    }
    classinfo.CAbilEffectInstant.prototype = "CAbilEffect"
    classinfo.CAbilEffectTarget.prototype = "CAbilEffect"
    SC2Mod.classinfo = classinfo
    SC2Mod.setSchema = function(file){
        SC2Mod.schema = JSON.parse(fs.readFileSync(file,{encoding: 'utf-8'}))

        SC2Mod.makeClasses()
    }
    SC2Mod.makeClasses = function(){

        let classlist = {}
        classlist.Entity = class Entity {
            constructor(id,data) {
                this.id = data.id
                this.default = data.default
                let _data = {...data}
                delete _data.default;
                delete _data.id;
                delete _data.class;
                delete _data.parent;
                this.data = _data
            }
        }
        for (let classname in SC2Mod.schema){
            let classdata = SC2Mod.schema[classname]
            if(/[A-Z]/.test(classname[0])){
                let superclass =  classdata.prototype ? classlist[classdata.prototype] : classlist.Entity
                let entityclass = ({[classname] : class extends superclass {}})[classname];
                let selfschema = {...classdata}
                delete selfschema.prototype
                delete selfschema.catalog

                entityclass.prototype.classname = classname
                if(classdata.catalog){
                    entityclass.prototype.catalog = classdata.catalog
                }

                if(Object.keys(selfschema).length || classdata.catalog){

                    let schema = {}
                    if(classdata.catalog){
                        let catalogschema = SC2Mod.schema[classdata.catalog] || {}
                        deep(schema,catalogschema,'unite');
                    }
                    function extendSchema(schema,entityclass){
                        if(!entityclass)return

                        if(entityclass !== classlist.Entity){
                            extendSchema(schema, entityclass.__proto__)
                        }
                        entityclass.prototype.schema && deep(schema,entityclass.prototype.schema,'unite')
                    }
                    extendSchema(schema,entityclass)
                    if(Object.keys(selfschema).length){
                        deep(schema,selfschema,'unite')
                    }
                    entityclass.prototype.schema = schema
                }


                classlist[classname] = entityclass
            }
        }
        SC2Mod.classlist = classlist
    }




})(SC2Mod.prototype)

export async function merge({input,output}){
    let mod = await SC2Mod.from(...input)
    await mod.write(output)
}