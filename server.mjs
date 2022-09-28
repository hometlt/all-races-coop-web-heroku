import  {YandexDisk} from 'yandex-disk'
let disk = new YandexDisk('y0_AgAAAAABtKHXAAhrwwAAAADPIH6Z4KcCiFKYQx-3gqSOJYYNt54ipbQ');

import express from  'express'
import cors from 'cors'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs'
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname)


let port = process.argv[3] || 3000;






let app = express()
app.use(cors());
app.use((req, res, next) => { console.log('Time: %d', Date.now()); next()})

disk.responseFile = function(srcPath, response, callback) {
    var headers = {
        'TE': 'chunked',
        'Accept-Encoding': 'gzip'
    };
    this._request('GET', srcPath, headers, null, response, callback);
}

app.get('/download/:file', function(req, res){
    let filename = "SC2/"+ req.params.file + ".SC2Mod"
    res.setHeader('Content-disposition', 'attachment; filename=' + req.params.file + ".SC2Mod");
    disk.responseFile(filename, res, ()=>{
        console.log("Woohoo")
    })
});
app.listen(port)