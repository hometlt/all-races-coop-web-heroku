import express from "express"
import fs from "fs"
const stormRouter = express.Router();
// import  {YandexDisk} from 'yandex-disk'
// let hots = new YandexDisk('y0_AgAAAAABtKHXAAhrwwAAAADPIH6Z4KcCiFKYQx-3gqSOJYYNt54ipbQ');

function responseFile(srcPath, response, callback) {
    this._request('GET', srcPath, {'TE': 'chunked', 'Accept-Encoding': 'gzip'}, null, response, callback);
}

// middleware that is specific to this router
stormRouter.use(function timeLog(req, res, next) {
    console.log('Time: ', Date.now());
    next();
});

//
// stormRouter.get('/download/*', function(req, res){
//     let filename = "SC2/Commanders Conflict/"+ req.params[0]
//     res.setHeader('Content-disposition', 'attachment; filename=' + req.params[0] + ".SC2Mod");
//     responseFile(filename, res, ()=>{
//         console.log("Woohoo")
//     })
// });
stormRouter.get('/versions', function(req, res){
    const data = JSON.parse(fs.readFileSync("./data/Hots/versions.json", {encoding: 'utf-8'}))
    res.setHeader('content-type', 'text/plain');
    res.json(data)
});
// stormRouter.get('/files/ydisk', function(req, res){
//     const data = JSON.parse(fs.readFileSync("./data/Hots/info-disk.json", {encoding: 'utf-8'}))
//     res.setHeader('content-type', 'text/plain');
//     res.json(data)
// });
stormRouter.get('/files/gdrive', function(req, res){
    const data = JSON.parse(fs.readFileSync("./data/Hots/info-drive.json", {encoding: 'utf-8'}))
    res.setHeader('content-type', 'text/plain');
    res.json(data)
});
module.exports = {
    stormRouter
}


//https://drive.google.com/u/0/uc?id=12WtA6XEvwOGBJLzpdnJuJNK-HskbYlHl&export=download&confirm=t&uuid=f3b6932a-7213-4f27-9158-875a5b32d165
// AssetMods
// PatchNotes
// VersionControlMods
// Versions


