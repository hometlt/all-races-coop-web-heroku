const fs = require("fs")
const path = require("path")
const mime = require('mime-types')
class FileClient{}

class LocalFileClient extends FileClient{
    constructor() {
        super();
    }
    info (filename){
        if(!fs.existsSync(filename)) return false

        let localFileStats = fs.statSync(filename)
        return {
            size: localFileStats.size,
            created: new Date(localFileStats.ctime).getTime(),
            modified: new Date(localFileStats.mtime).getTime()
        }
    }
    files (directory) {
        let result = []
        let items = fs.readdirSync(directory)
        for(let item of items){
            let filePath = path.resolve(directory + item)
            let mimeType = mime.lookup(filePath)
            if(fs.lstatSync(filePath).isDirectory()){
                result.push({
                    name: item,
                    path: filePath,
                    ...this.files(filePath)
                })
            }
            else{
                result.push({
                    name: item,
                    mimeType,
                    path: filePath,
                    ...this.info(filePath)
                })
            }
        }
        return result
    }
}

module.exports = {
    LocalFileClient
}