
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

export function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export function deep(a,b,c = 'merge'){
    if(!a){
        console.error("wrong deep a argument")
    }
    for(let i in b){
        if(i.startsWith("$")){
            i
        }
        if(b[i].constructor === String){
            a[i] = b[i]
        }
        else if(a[i] && a[i].constructor === Array && c === 'replace') {
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


export function matchPath(path1,path2){
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



export function resolveSchemaType(schema,property){
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