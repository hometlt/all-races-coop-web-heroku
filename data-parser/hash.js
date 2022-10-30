var fs = require('fs');
var crypto = require('crypto');

function hash(file){

    return new Promise((resolve,reject)=>{

// the file you want to get the hash
        var fd = fs.createReadStream(file);
        var hash = crypto.createHash('sha1');
        hash.setEncoding('hex');

        fd.on('end', function() {
            hash.end();
            resolve(hash.read())
        });

// read all file and pipe it (write it) to the hash object
        fd.pipe(hash);
    })

}

async function testCache(){

    let files = [
        './Assets01.SC2Mod',
        './Assets02.SC2Mod',
        './Assets03.SC2Mod',
        './Assets04.SC2Mod',
        './Assets05.SC2Mod',
        './Assets06.SC2Mod',
    ]
    console.time('total')
    for(let file of files){
        console.time(file)
        let hashdata = await hash(file)
        console.log(hashdata)
        console.timeEnd(file)
    }
    console.timeEnd('total')
}
testCache()