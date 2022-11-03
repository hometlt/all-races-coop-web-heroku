import fs from 'fs'
import xml2js from 'xml2js'
import * as yaml from "js-yaml";
import {SCGame} from "./sc-game.js";
import {SCEntity} from "./sc-entity.js";
import {deep,optimizeObject, optimizeJSONObject, fromXMLToObject, optimiseForXML, convertObjectsToIndexedArray, stringValues} from "./operations.js";

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
        // Object.defineProperty(this, 'entities',{ configurable:true, writable: true,enumerable: false,value: []})

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
            ////////     Triggers     //////////////////////////////////////////////////////////////////////////////////
            {
                let triggersFile = path + "Triggers"
                let triggersDataParsed = await this._readXMLFile(path + "Triggers", true)
                let triggersData = triggersDataParsed?.TriggerData
                if(triggersData){
                    fromXMLToObject(triggersData)
                    data.triggers = triggersData.Library
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
            ////////     GameData     //////////////////////////////////////////////////////////////////////////////////
            {
                let includesData = await this._readXMLFile(path + "Base.SC2Data/GameData.xml")
                let commonFiles = SCGame.datafiles.map(el => "Base.SC2Data/GameData/" + el + "data.xml");
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
                            for (let entity of catalog.data.Catalog.$$) {
                                fromXMLToObject(entity)
                                if(SCGame.classlist[entity.class]?.$$namespace && !SCGame.ignoredNamespaces.includes(SCGame.classlist[entity.class]?.$$namespace)){
                                    optimizeObject(entity, SCGame.classlist[entity.class].$$schema)
                                    entities.push(entity)
                                }
                            }
                        }
                    }
                }
                if(entities.length){
                    data.entities = entities
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
            for(let entity of data.entities){
                optimizeJSONObject(entity, SCGame.classlist[entity.class].$$schema)
            }
        }

        ////////     triggers     /////////////////////////////////////////////////////////////////////////////////////

        if(data.triggers){
            if (!this.triggers) this.triggers = []
            this.triggers.push(...data.triggers)
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
            .replace(/<\?xml(.*)\?>/g,'')
            .replace(/<\?token\s+id="(\w+)"\s+(?:type="(\w+)"\s+)?value="(.*)"\?>/g,(_,tokenID,tokenType,tokenValue) =>{
                return `<__${tokenID}__ value="${tokenValue}"/>`
            })
            .replace(/<\?(.*)\?>/g,function(_){
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

                        let entityData;

                        if(SCGame.useResolve){
                            entityData = deep({},entity.$$resolved)
                        }
                        else{
                            entityData = deep({},entity)
                        }
                        entityData.id = entity.id

                        delete entityData.class
                        optimiseForXML(entityData,entity.$$schema)


                        try{
                            entitiesData += CMBuilder2.buildObject({[entity.class]: entityData}) + "\n";
                        }
                        catch(e){
                            for(let property in entity){
                                try {
                                    CMBuilder2.buildObject({[entity.class]: {[property]: entity[property]}})
                                }
                                catch(e2){
                                    console.error(e2.message, entity.id, property ,entity[property])
                                }
                            }
                        }
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
    pickEntity(entity){
        if(!entity)return
        for(let relation of entity.$$relations){
            let linkedEntity = this.cache[relation.namespace][relation.link]
            if(!linkedEntity)continue
            if(linkedEntity.$$references){
                linkedEntity.addReferences(relation.path)
            }
            else{
                linkedEntity.addReferences(relation.path)
                this.pickEntity(linkedEntity)
            }
        }
    }
    pick(include = {}, {exclude = {}} = {}){
        SCGame.pickIgnoreObjects = {}
        deep(SCGame.pickIgnoreObjects,SCGame.defaultPickIgnoreObjects)
        deep(SCGame.pickIgnoreObjects,exclude)

        for(let namespace in include){
            for(let link of include[namespace]){
                let entity = this.cache[namespace][link]
                if(!entity)continue;
                entity.addReferences("")
                this.pickEntity(entity)
            }
        }
    }
    pickActors(){
        for (let actor of this.catalogs.actor){
            let termRelations = actor.$$relations.filter(rel => rel.type === "terms")
            let used = false
            for(let relation of termRelations){
                let linkedEntity = this.cache[relation.namespace][relation.link]
                if(linkedEntity?.$$references){
                    // linkedEntity.addReferences(relation.path)
                    used = true;
                }
            }
            if(used) {
                actor.addReferences("")
                this.pickEntity(actor)
            }
        }
    }
    createActorsForPickedUnits(){

        let copiedEvents = []

        for (let actor of this.catalogs.actor){
            let createdEntity;
            if(actor.$created)continue;
            if(actor.$overriden)continue;

            delete actor.$$references

            let termRelations = actor.$$relations.filter(rel => rel.type === "terms")
            for(let relation of termRelations){
                let linkedEntity = this.cache[relation.namespace][relation.link]
                if(!linkedEntity || !relation.path)continue
                if(linkedEntity?.$$references){
                    let _path = relation.path.split(".")

                    if(linkedEntity.$$references.includes(relation.path)){
                        linkedEntity.$$references.splice(linkedEntity.$$references.indexOf(relation.path),1)
                    }

                    if(!createdEntity){
                        createdEntity = this.makeEntity({
                            id: actor.id,
                            class: actor.class,
                            $class: actor.$class
                        })
                        Object.defineProperty(createdEntity, '$created',{ configurable:true, writable: true,enumerable: false,value: true })
                        createdEntity.addReferences("")
                    }
                    let property = _path[2]

                    if(!createdEntity[property])createdEntity[property] = []
                    let event = actor.$$resolved[property][_path[3]]
                    if(copiedEvents.includes(event)) continue;
                    copiedEvents.push(event)
                    _path[3] = createdEntity[property].length
                    createdEntity[property].push({...event})
                    linkedEntity.addReferences(_path.join("."))
                }
            }


        }
    }
    filter(){
        for(let catalog in this.catalogs){
            for(let entity of this.catalogs[catalog]){
                if(!entity.$$references){
                    if(this.cache[catalog][entity.id] === entity){
                        delete this.cache[catalog][entity.id]
                    }
                }
            }
            this.catalogs[catalog] = this.catalogs[catalog].filter(item => item.$$references)

            if(!this.catalogs[catalog].length){
                delete this.catalogs[catalog]
                delete this.cache[catalog]
            }
        }
        this.entities = this.entities.filter(item => item.$$references)
    }
    renameEntities(mask){
        for(let catalog in this.catalogs) {
            // if(catalog === 'actor')continue
            for (let entity of this.catalogs[catalog]) {
                let oldName = entity.id
                entity.id = mask.replace("*", oldName)
                if (entity.$$references) {
                    for (let reference of entity.$$references) {
                        if(reference === "")continue //nothing to rename
                        let _path = reference.split(".")
                        let value,valueObject,valueProperty, valueEntity, newvalue
                        let referenceEntity = this.cache[_path[0]][_path[1]]
                        if(!referenceEntity){
                            console.warn("wrong reference " + reference)
                            continue;
                        }
                        if(SCGame.useResolve){
                            valueEntity = referenceEntity.$created ? referenceEntity : referenceEntity.$$resolved;
                        }
                        else{
                            valueEntity = referenceEntity;
                        }
                        value = valueEntity
                        for(let pathItem of _path.slice(2)){
                            if(value === undefined)break;
                            valueObject = value
                            valueProperty = pathItem
                            value = value[pathItem]
                        }
                        if(value === undefined){
                            console.warn("wrong reference " + reference)
                            continue;
                        }
                        if(value.includes(".") || value.includes(" ") || value.includes(";")){
                            //this is a term

                            let [event,...conditions] = value.split(";").map(term => term.trim())
                            let eventParts = event.split(".")
                            let namespace = {
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
                            }[eventParts[0]]


                            if(namespace === entity.$$namespace && eventParts[1] === oldName){
                                eventParts[1] = entity.id
                                event = eventParts.join(".")
                            }
                            for(let index =0; index < conditions.length; index++){
                                let condition = conditions[index]
                                let eventParts = condition.split(" ").map(term => term.trim())
                                let namespace = {
                                    ValidateUnit: "validator",
                                    MorphFrom: "unit",
                                    MorphTo: "unit",
                                }[eventParts[0]]
                                if(namespace === entity.$$namespace && eventParts[1] === oldName){
                                    eventParts[1] = entity.id
                                    conditions[index] = eventParts.join(" ")
                                }
                            }
                            newvalue = [event, ...conditions].join(";")
                        }
                        else if(value.includes(",") && value.lastIndexOf(",") !==  value.indexOf(","))  {
                            //this is a reference
                            let [entityType, entityName, entityProperty] = value.split(",")
                            newvalue = [entityType, entity.id, entityProperty].join(",")
                        }
                        else if(value.includes(",")) {
                            //this is a abilcmd
                            let [entityName, cmd] = value.split(",")
                            newvalue = [entity.id, cmd].join(",")
                        }
                        else{
                            //this is a link
                            newvalue = entity.id
                        }
                        valueObject[valueProperty] = newvalue
                    }
                }
            }
        }
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
        if (!raw) return {}
        let data = {}
        raw.replace(/\r/g, "").split("\n").forEach(el => {
            let key = el.substring(0, el.indexOf("="))
            let value = el.substring(el.indexOf("=") + 1)
            data[key] = value
        })
        delete data[""]
        return data;
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
            entityclass.mixin(entitydata)
            this.entities.push(entityclass)
            return entityclass
        }
        else{
            let namespace = entityclass.$$namespace
            if(!namespace || SCGame.ignoredNamespaces.includes(namespace))return;
            if(!this.cache[namespace])this.cache[namespace] ={}
            if(!this.catalogs[namespace])this.catalogs[namespace] =[]
            let catalog = this.catalogs[namespace]
            let existed = this.cache[namespace][entityid]
            let parent = entityparent && this.cache[namespace][entityparent]

            if(existed) {
                if (entityparent) {
                    Object.defineProperty(existed, '$overriden',{ configurable:true, writable: true,enumerable: false,value: true })
                    console.log(entityid + ': overriding element parent ')
                }
                else{
                    existed.mixin(entitydata)
                    return existed
                }
            }
            entitydata.$parent =  parent || null;
            entitydata.class = classname
            entitydata.$class = entityclass
            let entityInstance = new SCEntity(entitydata)
            this.cache[namespace][entityid] = entityInstance
            catalog.push(entityInstance)
            this.entities.push(entityInstance)
            return entityInstance
        }
    }
}
