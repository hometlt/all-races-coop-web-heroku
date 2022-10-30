import { deep,deepReplaceMatch, resolveSchemaType} from "./sc-util.js";
/**
 `
 <CUnit id="LegacyMarauderCopy" parent="LegacyMarauder"/>   //cant make copy of previously created instance
 <CUnitHero id="LegacyMarauderHero" parent="LegacyMarauder"/>  //can change class to more specific class
 <!--CUnit id="LegacyMarauderHeroCopy" parent="LegacyMarine"/-->  //cant do opposite
 <CUnit id="LegacyMarauder" parent="Zealot"> <Race value="Prot"/></CUnit> //can change parent
 <CUnit id="LegacyMarauderZealotCopy" parent="LegacyMarauder"/>  //cant make copy of previously created instance
 <!--CUnit id="LegacyMarauder" parent="Queen"><Race value="Zerg"/> </CUnit--> //cant duplicate in the same file
 `
 **/

export class SCEntity {
    id
    parent
    default
    $class
    $parent
    $resolved
    $picked
    $namespace
    $schema
    class
    constructor(data) {
        delete this.$class
        delete this.$parent
        delete this.$resolved
        delete this.$picked
        delete this.$schema
        delete this.$namespace
        delete this.parent
        delete this.default
        delete this.id
        delete this.class

        for(let property in data){
            if(data[property] === null || data[property] === undefined) continue
            if (property.startsWith('$')){
                Object.defineProperty(this, property,{ configurable:true, writable: true,enumerable: false, value: data[property]})
            }
            else{
                this[property] = data[property]
            }
        }

        this.arrayValues()
        // this._modifyIndexArrays(this,this.$$schema)
        // this.arrayValues()
    }
    stringValues(object = this) {
        for(let property in object){
            if (/[a-z]/.test(property[0])) continue;
            let value = object[property]

            if(value.constructor === Array){
                if(value.length === 1 && value[0].constructor === Object && Object.keys(value[0]).length === 1 && value[0].value !== undefined) {
                    object[property] = value[0].value
                }
                else{
                    for(let item of value) {
                        this.stringValues(item)
                    }
                }
            }
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
    optimiseForXML() {
        for(let property in this){
            if (['class','$'].includes(property)) continue;
            let value = this[property]

            if (/[a-z]/.test(property[0])){
                if(!this.$)this.$ = {}
                if(value.constructor === Array){
                    value = value[0].value
                }
                this.$[property] = value
                delete this[property]
            }
            else if(value.constructor === Array) {
                for(let item of value){
                    this._optimiseForXML(item)
                }
            }
            else if(value.constructor === String) {
                this[property] = {$: {value}}
            }
        }
    }
    arrayValues(object = this){//,_path) {
        for(let property in object){
            if (/[a-z]/.test(property[0])) continue;

            let value = object[property]
            if(value.constructor === String) {
                object[property] = [{value}]
            }
            else if(value.constructor === Object) {
                this.arrayValues(value)//,[..._path,property])
                object[property] = [value]
            }
            else if(value.constructor === Array) {
                for(let item of value){
                    this.arrayValues(item)//,[..._path,property])
                }
            }
        }
    }
    markPicked(){
        Object.defineProperty(this, '$picked',{ configurable:true, writable: true,enumerable: false ,value: true})
    }
    get $$namespace(){
        let namespace = this.$namespace || this.$class?.$$namespace || this.$parent?.$$namespace || ''
        Object.defineProperty(this, '$$namespace',{ configurable:true, writable: true,enumerable: false,value: namespace })
        return namespace
    }
    get $$schema(){
        let schema =  {}
        deep(schema,this.$class?.$$schema,'unite')
        deep(schema,this.$parent?.$$schema,'unite')
        deep(schema,this.$schema,'unite')

        Object.defineProperty(this, '$$schema',{ configurable:true, writable: true,enumerable: false,value: schema })
        return schema
    }
    get $trace(){
        return this.class + "#" + this.id
    }
    resolve(){
        Object.defineProperty(this, '$$original',{ configurable:true, writable: true,enumerable: false,value: {} })

        let resolved = {}
        deep(resolved, this.$class.$$data)
        deep(resolved, this.$$data,this.default ? 'replace' : 'merge')

        for(let property in this){
            if(!/[a-z]/.test(property[0])){
                this.$$original[property] = this[property]
                delete this[property]
            }
        }
        for(let property in resolved){
            this[property] = resolved[property]
        }
        this._resolveArrays( this , this.$$schema,[this.$trace])
    }
    get $$data(){
        let __default = this.default
        let resolved = {}
        // console.warn(`wrong Class Hierarchy ${self.id} ${thisClass.class} -> ${stopClass.class}` )
        // this.$class && deep(resolved, this.$class.$$resolved)
        this.$parent && deep(resolved, this.$parent.$$data)
        deep(resolved, this, __default ? 'replace' : 'merge')

        for(let property in resolved){
            if(/[a-z]/.test(property[0])){
                delete resolved[property]
            }
        }
        Object.defineProperty(this, '$$data',{ configurable:true, writable: true,enumerable: false,value: resolved })
        return this.$$data;
    }
    _resolveArrays(object, schema, path) {
        if(!schema || schema.constructor === String) return;

        for(let property in object){
            let type = resolveSchemaType(schema,property), value = object[property]
            if(!type || !value || value.constructor === String)continue
            let _path = [...path,property];
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
    get(property){
        if(this[property] !== undefined )return this[property]
        return this.$parent && !this.$resolved && this.$parent.get(property) || ""
    }
    resolveTokens(){
        deepReplaceMatch(this, val => val && val.constructor === String && val.includes("##"), null, ({val, obj, prop, id, path}) => {
            obj[prop] = val.replace(/##(\w+)##/g,(_,tokenID) =>  {
                let tokenValue = this.get(tokenID) || ""
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
    addChain( ...chain) {
        if(!this.$chains ){
            Object.defineProperty(this, '$chains',{ configurable:true, writable: true,enumerable: false, value: []})
        }
        this.$chains.push(...chain)
    }
    addReference( path, type, object,property,index) {
        if(!this.$references ){
            Object.defineProperty(this, '$references',{ configurable:true, writable: true,enumerable: false, value: []})
        }
        this.$references.push({path, type, object, property, index})
    }


    _modifyIndexArrays(object, schema) {
        if(!schema || schema.constructor === String) return;
        for(let property in object) {
            let type = resolveSchemaType(schema, property), value = object[property]
            if (!type || !value) continue

            if(value.constructor === Array){
                if (type.constructor === Array && type[0].index === 'word') {
                    let result = {}
                    for (let i = 0; i < value.length; i++) {
                        let item = {...value[i]}
                        delete item.index
                        delete item.removed
                        result[value[i].index] = item
                    }
                    for (let item in result) {
                        this._modifyIndexArrays(item, type[0])
                    }
                    object[property] = result
                }
                else{
                    for(let item of value) this._modifyIndexArrays(item, type[0])
                }
            }
            if(value.constructor === Object){
                this._modifyIndexArrays(value, type)
            }
        }
    }




    _optimizeObject(object, schema, path) {
        if(!schema) return;
        for(let property in object){
            let type = resolveSchemaType(schema,property), value = object[property]
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
                        // let str = _path.join(".")
                        // if(!this._warnings[str]){
                        //     this._warnings[str] = []
                        // }
                        // this._warnings[str].push(value)
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
        this._optimizeObject(this,this.$$schema,[this.$$namespace])
    }
}