import fs from 'fs'
import xml2js from 'xml2js'
import * as yaml from "js-yaml";
import {deep, matchPath, deepReplaceMatch, resolveSchemaType} from "./sc-util.js";
import {SCGame} from "./sc-game.js";
import {SCEntity} from "./sc-entity.js";

export class SCMod {
    constructor(data= {}){
        // deep(this,data)

        // if(data){
        //     this.updateCache()
        //     this.updateEntities()
        // }

        // this.catalogs = {}
        // this.cache = {}
        this.entities = []
        Object.defineProperty(this, 'cache',{ configurable:true, writable: true,enumerable: false,value: {} })
        Object.defineProperty(this, 'catalogs',{ configurable:true, writable: true,enumerable: false,value: {} })
        Object.defineProperty(this, 'entities',{ configurable:true, writable: true,enumerable: false,value: []})

        // this.path = ""
        // this.assets = {}
        // this.dependencies = []
        // this.styles = {}
        // this.localisations = {}
        // this.entities = []
        // this.layouts = []
        // this.triggers = ""
        // this.files = {}
    }
    async read (path){
        let format;
        if(path.toLowerCase().endsWith('.json')){
            format = 'JSON'
        }
        else if(path.toLowerCase().endsWith('.xml')){
            format = 'XML'
        }
        else if(path.toLowerCase().endsWith('.yaml')){
            format = 'YAML'
        }
        else{
            format = 'SC2MOD'
        }

        let data = {};

        if(format === 'SC2MOD') {
            if(!path.endsWith("/"))path += "/"

            let ComponentsData = await this._readXMLFile(path + "ComponentList.SC2Components")
            ////////     Assets     ////////////////////////////////////////////////////////////////////////////////////
            {
                let assetsTextData = await this._readTextFile(path + "Base.SC2Data/GameData/Assets.txt")
                if(assetsTextData){
                    data.assets = assetsTextData
                }
            }
            ////////     dependencies     //////////////////////////////////////////////////////////////////////////////
            {
                let documentInfo = await this._readXMLFile(path + "DocumentInfo")
                let dependencies = documentInfo?.DocInfo?.Dependencies?.[0].Value
                if(dependencies) {
                    data.dependencies = dependencies
                }
            }
            ////////     styles     ////////////////////////////////////////////////////////////////////////////////////
            {
                let stylesData = await this._readXMLFile(path + "Base.SC2Data/UI/FontStyles.SC2Style")
                if(stylesData){
                    data.styles = stylesData
                }
            }
            ////////     TextData     //////////////////////////////////////////////////////////////////////////////////
            {
                let textFiles = ["GameHotkeys", "GameStrings", "ObjectStrings", "TriggerStrings", "ConversationStrings"]
                let localisations = {}
                let LocaleData = ComponentsData?.Components?.DataComponent?.filter(entity => entity.$?.Type.toLowerCase() === "text").map(entity => entity.$.Locale) || ["enUS"];
                if(LocaleData){
                    for (let locale of LocaleData) {
                        localisations[locale] = {}
                        for (let textFile of textFiles) {
                            let data = this._readTextFile(`${path}${locale}.sc2data/LocalizedData/${textFile}.txt`)
                            if (data) {
                                localisations[locale][textFile] = data
                            }
                        }
                    }
                    data.localisations = localisations
                }
            }
            ////////     GameData     //////////////////////////////////////////////////////////////////////////////////
            {
                let includesData = await this._readXMLFile(path + "Base.SC2Data/GameData.xml")
                let commonFiles = SCMod.datafiles.map(el => "Base.SC2Data/GameData/" + el + "data.xml");
                let includes = commonFiles.filter(file => fs.existsSync(path + file))
                let additionalFiles = includesData?.Includes?.Catalog?.map(catalog => "Base.SC2Data/" + catalog.$.path)
                if (additionalFiles) {
                    includes.push(...additionalFiles)
                }
                let catalogs = []
                for (let file of includes) {
                    let data = await this._readXMLFile(path + file, true)
                    if (!data) {
                        console.log("File not found: " + path + file)
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
                                for (let property in entity) {
                                    if (/^__(.*)__$/.test(property)) {
                                        entity[property.substring(2, property.length - 2)] = entity[property][0].value
                                        delete entity[property]
                                    }
                                }
                                // if (!entity.id) {
                                //     entity.id = "_" + entity.class + "_"
                                // }
                                entities.push(entity)
                            }
                        }
                    }
                }
                if(entities.length){
                    data.entities = entities
                }
            }
            ////////     Triggers     //////////////////////////////////////////////////////////////////////////////////
            {
                let triggersFile = path + "Triggers"
                let raw = fs.existsSync(triggersFile) && fs.readFileSync(triggersFile, {encoding: 'utf-8'})
                if(raw){
                    data.triggers = raw.substring(raw.indexOf("<TriggerData>") + 13, raw.indexOf("</TriggerData>"))
                }
            }
            ////////     layouts     ///////////////////////////////////////////////////////////////////////////////////
            {
                let layoutsData = await this._readXMLFile(path + "Base.SC2Data/UI/Layout/DescIndex.SC2Layout")
                let layouts = layoutsData?.Desc?.Include
                if(layouts){
                    data.layouts = layouts
                }
            }
            ////////     Files     /////////////////////////////////////////////////////////////////////////////////////
            {
                // this._getAllFiles(path).forEach(file => files[file] = path + file)//.filter(file => file.endsWith("m3"))
                // for(let m3File of files){
                //     let raw = fs.readFileSync(m3File, {encoding: 'utf-8'})
                //     const indexes = raw.matchAll(new RegExp(`Assets\\[\\\w_]+\.dds`, 'gi'))
                //     console.log(indexes)
                //
                // }
                let files = {}
                let galaxyFiles = fs.readdirSync(path + "Base.SC2Data").filter(file => file.endsWith(".galaxy"))
                if(data.layouts){
                    for (let include of data.layouts) {
                        files["Base.SC2Data/" + include.$.path] = (path + "Base.SC2Data/" + include.$.path)
                    }
                }
                for (let file of galaxyFiles) {
                    files["Base.SC2Data/" + file] = (path + "Base.SC2Data/" + file)
                }
                if(Object.keys(files).length){
                    data.files = files
                }
            }
        }
        else{
            if(!fs.existsSync(path))return

            let raw = fs.readFileSync(path, {encoding: 'utf-8'})

            if (format === 'JSON') {
                data = JSON.parse(raw)
            }
            if (format === 'YAML') {
                data = yaml.load(raw)
            }
            if (format === 'XML') {
                data = {}
            }
        }

        ////////     triggers     /////////////////////////////////////////////////////////////////////////////////////

        if(data.triggers){
            if (!this.triggers) this.triggers = ""
            this.triggers += data.triggers
        }
        ////////     dependencies     /////////////////////////////////////////////////////////////////////////////////////
        if(data.dependencies){
            if (!this.dependencies) this.dependencies = []
            for (let dependency of data.dependencies) {
                let dependencyFile = dependency.substring(dependency.lastIndexOf("file:") + 5)
                if (!this.dependencies.includes(dependencyFile)) {
                    this.dependencies.push(dependencyFile)
                }
            }
        }
        ////////     styles     /////////////////////////////////////////////////////////////////////////////////////
        if(data.styles) {
            if (!this.styles) this.styles = {}
            deep(this.styles, data.styles)
        }
        ////////     localisations     /////////////////////////////////////////////////////////////////////////////////////
        if(data.localisations) {
            if (!this.localisations) this.localisations = {}
            deep(this.localisations, data.localisations)
        }
        ////////     assets     /////////////////////////////////////////////////////////////////////////////////////
        if(data.assets){
            if(!this.assets)this.assets = {}
            Object.assign(this.assets, data.assets)
        }
        if(data.this) {
            if (!this.this) this.this = {}
            Object.assign(this.files, data.files)
        }
        if(data.layouts){
            if (!this.layouts) this.layouts = {}
            this.layouts.push(...data.layouts)
        }

        if(data.catalogs){
            if (!data.entities) data.entities = []
            for(let catalog in data.catalogs){
                //catalog format
                if(data.catalogs[catalog].constructor === Array){
                    data.entities.push(...data.catalogs[catalog])
                }
                //cache format
                if(data.catalogs[catalog].constructor === Object){
                    for(let id in data.catalogs[catalog]) {
                        data.entities.push(...data.catalogs[catalog][id])
                    }
                }
            }
        }

        if(data.entities){
            for(let entity of data.entities) {
                this.makeEntity(entity)
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

            // let catalogs = JSON.parse(JSON.stringify(this.catalogs))

            for (let entity of this.entities)entity.optimiseForXML()

            if(writeToSingleFile){
                let entitiesData = ""
                for (let cat in catalogs) {
                    for (let entity of catalogs[cat]) {
                        let tag = entity.class
                        delete entity.class
                        entitiesData += CMBuilder2.buildObject({[tag]: entity}) + "\n";
                        entity.class = tag
                    }
                }
                entitiesData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Catalog>\n${entitiesData}\n</Catalog>`
                this._saveRawData(entitiesData,  path)
            }
            else{
                for (let cat in this.catalogs) {
                    let entitiesData = ""
                    for (let entity of this.catalogs[cat]) {

                        let tag = entity.class
                        delete entity.class
                        entitiesData += CMBuilder2.buildObject({[tag]: entity}) + "\n";
                        entity.class = tag
                    }
                    entitiesData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Catalog>\n${entitiesData}\n</Catalog>`
                    this._saveRawData(entitiesData,  `${path}Base.SC2Data/GameData/${cat.at(0).toUpperCase() + cat.substring(1)}Data.xml`)
                }
            }
        }
        else{
            let optimised = new SCMod(this)
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
    // chains = {}
    // ingored = {}

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

        entity.addReference( path, type, object, property)

        for(let iPath of SCGame.pickIgnoreObjects.path){
            if(matchPath(iPath,path)){
                return;
            }
        }

        if(SCGame.pickIgnoreObjects.path.includes(entity.$class)) {
            return
        }
        this.pickEntity(entity,newChain)
    }
    _pickProperty(object,schema,path,chain){
        if(!schema) return

        for(let property in object){
            if(["index",'class', "removed" ,'id','parent','default'].includes(property))continue;
            // if(property !== 'value' && /[a-z]/.test(property))continue;
            let value = object[property]
            if(!value)continue;
            let type = resolveSchemaType(schema,property);
            let _path = [...path,property]
            if(!type){
                console.log("unknown field",_path.join(".") );
                continue;
            }

            if(type.constructor === Object){
                if(value.constructor === Array){
                    //todo For not otimised object
                    for(let item of value){
                        this._pickProperty(item,type, _path,chain)
                    }
                }
                else{
                    //optimised arrays
                    this._pickProperty(value,type, _path,chain)
                }
            }
            else if(type.constructor === Array){
                for(let item in value){
                    this._pickProperty(value[item],type[0], _path,chain)
                }
            }
            else {
                if(value.constructor === Array){
                    //todo For not otimised object
                    for(let item of value){
                        if(item.constructor === Object){
                            // item = item.value
                            this._pickField(item, 'value' , type, _path,chain)
                        }
                        else{
                            this._pickField(value, value.indexOf("item") , type, _path,chain)
                        }
                    }
                }
                else{
                    //for optimised objects
                    this._pickField(object, property , type, _path,chain)
                }
            }
        }
    }

    pickEntity(entity,chain = []){
        if(SCGame.pickIgnoreObjects?.[entity.$$namespace]?.includes(entity.id))return
        entity.addChain(chain)
        if(entity.$picked) return
        entity.markPicked()
        this._pickProperty(entity, entity.$$schema,[entity.class],[...chain,entity.$trace])
    }
    createEntity(entity){
        let catalog = entity.$class.$$namespace
        if(!this.createdCache[catalog])this.createdCache[catalog] = {}
        if(!this.createdCatalog[catalog])this.createdCatalog[catalog] = []
        let instance =  new SCEntity(entity)
        this.createdCache[catalog][entity.id] =instance
        this.createdCatalog[catalog].push(instance)
        this.createdEntities.push(instance)
    }
    // createdCache = {}
    // createdCatalog = {}
    // createdEntities = []
    pick(include = {}, exclude = {}){
        if(!this.createdCache) this.createdCache = {}
        if(!this.createdCatalog) this.createdCatalog = {}
        if(!this.createdEntities) this.createdEntities = []

        SCGame.pickIgnoreObjects = deep(SCGame.defaultPickIgnoreObjects,exclude)

        for(let catalog in include){
            for(let unit of include[catalog]){
                this.pickEntity(this.cache[catalog][unit])
            }
        }
    }
    createActorsForPickedUnits(){
        // for (let actor of [this.cache.actor.MothershipCore]){
        for (let actor of this.catalogs.actor){
            if(actor.$picked){
                this.createEntity({
                    id: actor.id,
                    class: actor.class,
                    $class: actor.$class,
                    $references: actor.$references,
                    $chains: actor.$chains
                })
            }
            for(let field of ["On","Remove"]){
                if(!actor[field])continue
                for (let index in actor[field]){
                    let actorAction = actor[field][index]
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
                            if(entity?.$picked){
                                newchains.push([ entity.$trace, field+"#" + index + "."+ event])
                                entity.addReference( "actor." + field, 'actor-event', terms, 'value')
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
                                if(entity?.$picked){
                                    newchains.push([ entity.$trace, field+"#" + index + "."+ event ])
                                    entity.addReference( "actor." + field, 'actor-condition', terms, 'value' ,index )
                                }
                            }
                        }
                    }

                    if(newchains.length){
                        if(!this.createdCache.actor?.[actor.id]) {
                            this.createEntity({
                                id: actor.id,
                                class: actor.class,
                                $class: actor.$class,
                                $references: actor.$references,
                                $chains: actor.$chains
                            })
                        }
                        let chainActor = this.createdCache.actor[actor.id]
                        chainActor.markPicked()
                        chainActor.addChain(...newchains)
                        if(!chainActor[field]){
                            chainActor[field] = []
                        }
                        chainActor[field].push(actionCopy)
                    }
                }
            }
        }
    }
    filter(){


        for(let catalog in this.catalogs){
            for(let entity of this.catalogs[catalog]){
                if(!entity.$picked){
                    delete this.cache[catalog][entity.id]
                }
            }
            this.catalogs[catalog] = this.catalogs[catalog].filter(item => item.$picked)

            if(!this.catalogs[catalog].length){
                delete this.catalogs[catalog]
                delete this.cache[catalog]
            }
        }
        this.entities = this.entities.filter(item => item.$picked)

        //adding actors //todo probably add to ordinary array with tag $new
        this.entities.push(...this.createdEntities)
        for(let catalog in this.createdCatalog){
            for(let entity of this.createdCatalog[catalog]){

                if(entity.id === "HellionTank"){
                    entity
                }

                if(!this.cache[catalog])this.cache[catalog] = {}
                if(!this.catalogs[catalog])this.catalogs[catalog] = []
                this.cache[catalog][entity.id] = entity
                this.catalogs[catalog].push(entity)
            }
        }

        delete this.createdCatalog
        delete this.createdEntities
        delete this.createdCache

        for(let entity of this.entities){
            delete entity.$picked
        }

    }
    renameEntities(mask){
        for(let catalog in this.catalogs) {
            if(catalog === 'actor')continue
            for (let entity of this.catalogs[catalog]) {
                entity.id = mask.replace("*", entity.id)
                if (entity.$references) {
                    for (let reference of entity.$references) {
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
//        this.updateCache()
    }
    // updateEntities(){
    //     this.entities = [];
    //     for(let catalog in this.catalogs){
    //         this.entities.push(...this.catalogs[catalog])
    //     }
    // }
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

    makeEntity(entity){
        let classname = entity.class;
        let entityparent = entity.parent;
        let entityclass = SCGame.classlist[classname]
        let entityid = entity.id || entity.Id || entity.index;
        let entitydata = {...entity}

        delete entitydata.class

        if(classname === "const"){
            return
        }
        if(!entityid){

            // entitydata.$parent = entityclass
            // entitydata.class = classname

            // let entityInstance  = new SCEntity(entitydata)
            // SCGame.classlist[classname] = entityInstance
            //extend the class. do not create property
            if(Object.keys(entitydata).length){

                entityclass.arrayValues(entitydata)
                // entityclass._modifyIndexArrays(entitydata,entityclass.$$schema)
                // entityclass.arrayValues(entitydata)
                deep(entityclass,entitydata)
            }
        }
        else{
            let namespace = entityclass.$$namespace

            if(!namespace || SCGame.ignoredNamespaces.includes(namespace))return;

            if(!this.cache[namespace])this.cache[namespace] ={}
            if(!this.catalogs[namespace])this.catalogs[namespace] =[]

            let catalog = this.catalogs[namespace]


            let existed = this.cache[namespace][entityid]
            let parent = entityparent && this.cache[namespace][entityparent]
            // if (existed && parent) {
            //     console.info(`entity parent override: ${this.id} ${existed.parent?.id} => ${data.parent}`)
            // }
            entitydata.$parent =  parent || existed || null;
            entitydata.class = classname
            entitydata.$class = entityclass

            let entityInstance = new SCEntity(entitydata)


            this.cache[namespace][entityid] = entityInstance

            if(existed){
                //overriden instances aren`t available anymore
                catalog.splice(catalog.indexOf(existed),1)
                //but keep in entitie for proper saving
                // this.entities.splice(this.entities.indexOf(existed),1)
            }
            catalog.push(entityInstance)
            this.entities.push(entityInstance)


        }
    }
    static datafiles = [
        "abil", "accumulator", "achievement", "achievementterm", "actor", "actorsupport", "alert", "armycategory", "armyunit",
        "armyupgrade", "artifact", "artifactslot", "attachmethod", "bankcondition", "beam", "behavior", "boost", "bundle",
        "button", "camera", "campaign", "character", "cliff", "cliffmesh", "colorstyle", "commander", "config", "consoleskin",
        "conversation", "conversationstate", "cursor", "datacollection", "datacollectionpattern", "decalpack", "dsp", "effect",
        "emoticon", "emoticonpack", "error", "footprint", "fow", "game", "gameui", "herd", "herdnode", "hero", "heroabil",
        "herostat", "item", "itemclass", "itemcontainer", "kinetic", "lensflareset", "light", "location", "loot", "map",
        "model", "mount", "mover", "objective", "physicsmaterial", "ping", "playerresponse", "portraitpack", "preload",
        "premiummap", "racebannerpack", "race", "requirement", "requirementnode", "reverb", "reward", "scoreresult", "scorevalue",
        "shape", "skin", "skinpack", "sound", "soundexclusivity", "soundmixsnapshot", "soundtrack", "spray", "spraypack",
        "stimpack", "taccooldown", "tactical", "talent", "talentprofile", "targetfind", "targetsort", "terrain", "terrainobject",
        "terraintex", "texture", "texturesheet", "tile", "trophy", "turret", "unit",
        "upgrade","user","validator","voiceover","voicepack","warchest","warchestseason","water","weapon"
    ]
}


