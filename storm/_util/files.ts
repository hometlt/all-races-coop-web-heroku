import * as fs from "fs";
import {drive} from "@googleapis/drive";
import {auth, OAuth2Client} from 'google-auth-library'
import * as https from "https";
import {DomJS, Element} from "dom-js";
import * as storage from 'electron-json-storage'
import config from "./config/config";
import {exec} from "child_process"
import * as path from "path"
import * as url from "url"


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const errorCodes = {
  401:'Auth error',
  404:'Not found',
  409:'Conflict',
  400:'Bad Destination',
  507:'Insufficient Storage'
}

export function request(options,encoding = null){
  return new Promise((resolve, reject) =>{
    let request = https.request(options, (res) => {
      let code = res.statusCode
      if (code >= 200 && code < 300) {
        if(encoding){
          let response = '';
          res.setEncoding('utf-8');
          res.on('data', function(chunk) {
            response += chunk;
          });
          res.on('end', function() {
            if(encoding === 'json'){
              resolve(JSON.parse(response))
            }
            else{
              resolve( response);
            }
          });
        }
        else{
          resolve(res)
        }
      } else {
        reject (errorCodes[code] || `Unknown error, code: ${code}`)
      }
    })
      .on('socket', (socket) => {
        socket.setTimeout(60000);
        socket.on('timeout', function () {
          request.destroy();
          reject('timeout')
        });
      })
      .on('error', (err) => {
        reject(err.message)
      })
      .end();
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class FileClient {
}

export class UpdateClientHeroku extends FileClient {
  infohost = config.server.host
  infodomain = ""
  infopath = ""
  infourl = ""
  versionsurl = "versions"
  constructor() {
    super();
    this.setInfoHost(this.infohost)
  }
  setInfoHost(host){
    this.infohost = host
    this.infodomain = host.substring(0,host.indexOf("/"))
    this.infopath = host.substring(host.indexOf("/"))

  }
  versions() {
    return request({
      hostname: this.infodomain,
      port: 443,
      path: this.infopath + "/" + this.versionsurl,
      method: 'GET'
    }, 'json').then(response => {
      // @ts-ignore
      return response.versions
    })
  }
  files (){
    return request({
      hostname: this.infodomain,
      port: 443,
      path: this.infopath + "/" + this.infourl,
      method: 'GET'
    }, 'json')
  }
}

export class WebDAV extends FileClient{
  directory = ""
  host = ""
  auth = ""

  _normalizePath(fpath) {
    return fpath.replace(/\\/g, '/');
  }
  _getNodes(root, nodeName) {
    let res = [];
    root.children.forEach((node) =>{
      if (node instanceof Element) {
        if (nodeName === '*' || node.name === nodeName) {
          res.push(node);
        }
        [].push.apply(res, this._getNodes(node, nodeName));
      }
    });
    return res;
  }

  _getNodeValue(root, nodeName) {
    let nodes = this._getNodes(root, nodeName);
    return nodes.length ? nodes[0].text() : '';
  }

  async list (directoryPath){
    let response = await request({
      host: this.host,
      port: 443,
      method: 'PROPFIND',
      path: encodeURI(this._normalizePath(this.directory + directoryPath)),
      headers: {
        Host: this.host,
        Accept: '*/*',
        Authorization: this.auth,
        Depth: 1
      }
    },'text')

    return await new Promise((resolve,reject)=>{
      new DomJS().parse(response,  (err, root)=> {
        if(err){
          return reject(err)
        }
        try {
          let dir = [];
          root.children.shift()
          root.children.forEach( node => {
            if (node.name === 'd:response') {
              let name = this._getNodeValue(node, 'd:displayname')
              let directory = Boolean(this._getNodes(node, 'd:collection').length)
              dir.push({
                path: directoryPath + "/" + name,
                name ,
                size: directory ? null : +this._getNodeValue(node, 'd:getcontentlength'),
                created: new Date(this._getNodeValue(node, 'd:creationdate')).getTime(),
                modified: new Date(this._getNodeValue(node, 'd:getlastmodified')).getTime()
              });
            }
          });
          return resolve(dir);
        } catch (pareError) {
          return reject(pareError)
        }
      });
    })
  }
  async info (directoryPath){
    let response = await request({
      host: this.host,
      port: 443,
      method: 'PROPFIND',
      path: encodeURI(this._normalizePath(this.directory + directoryPath)),
      headers: {
        Host: this.host,
        Accept: '*/*',
        Authorization: this.auth,
        Depth: 1
      }
    },'text')

    return await new Promise((resolve,reject)=>{
      new DomJS().parse(response,  (err, root)=> {
        if(err){
          return reject(err)
        }
        try {
          let dir = [];
          root.children.forEach( node => {
            if (node.name === 'd:response') {
              dir.push({
                // href: _getNodeValue(node, 'd:href'),
                // isDir: Boolean(this._getNodes(node, 'd:collection').length),
                // path: directoryPath,
                // name: this._getNodeValue(node, 'd:displayname'),
                size: +this._getNodeValue(node, 'd:getcontentlength'),
                created: new Date(this._getNodeValue(node, 'd:creationdate')).getTime(),
                modified: new Date(this._getNodeValue(node, 'd:getlastmodified')).getTime()
              });
            }
          });
          return resolve(dir[0]);
        } catch (pareError) {
          return reject(pareError)
        }
      });
    })
  }

  stream (fileData){

    return request({
      host: this.host,
      port: 443,
      method: 'GET',
      path: encodeURI(this._normalizePath(this.directory + fileData.name)),
      headers: {
        'Host': this.host,
        'Accept': '*/*',
        'Authorization': this.auth,
        'TE': 'chunked',
        'Accept-Encoding': 'gzip'
      }
    })
  }
}


export class GoogleDriveAPI extends FileClient {
  host= 'www.googleapis.com'
  client = null
  drive = null
  cache = {}
  clientId = config.google.clientId
  clientSecret = config.google.clientSecret
  refreshToken = config.google.refreshToken
  accessToken = ''
  rootFolderId = config.google.rootFolderId
  infourl = "files/gdrive"
  constructor(){
    super()
    this.client = auth.fromJSON({
      type: "authorized_user",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
    })

    this.client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      'http://localhost:3131'
    );

// // Now tokens contains an access_token and an optional refresh_token. Save them.
    this.client.setCredentials({
      refresh_token: this.refreshToken,
      // access_token: this.accessToken
    });

    this.client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // store the refresh_token in my database!
        console.log(this.refreshToken);
      }
      this.accessToken = tokens.access_token
      console.log(tokens.access_token);
    });


    this.drive = drive({version: 'v3', auth: this.client});
  }
   getAuthorizeUrl(){
  // which should be downloaded from the Google Developers Console.

  // Generate the url that will be used for the consent dialog.
      const authorizeUrl = this.client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/drive.file'
      });
      return authorizeUrl
  }
  async getCredetialsFromAuthCallbackURL(urlstring){

    let code = url.parse(urlstring, true).query.code
    const r = await this.client.getToken(code);
    this.client.setCredentials(r.tokens);
    console.info('Tokens acquired.');

    return r;
  }
  async list (folder) {
    let folderID = this.cache[folder]
    if (!folderID){
      let folderData = await this.info(folder)
      folderID = folderData.id
    }


    let response = await this.drive.files.list({
      auth: this.client,
      q: `parents in '${folderID}'`,
      fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime)'
    })

    let result = []
    response.data.files.forEach(fileData => {
      let directoryPath = folder + "/" + fileData.name
      this.cache[directoryPath] = fileData.id
      result.push({
        directoryPath: directoryPath,
        name: fileData.name,
        id: fileData.id,
        size: fileData.size ? +fileData.size: null,
        created:  new Date(fileData.createdTime).getTime(),
        modified: new Date(fileData.modifiedTime).getTime()
      })
    })
    return result
  }
  async info (fileName){
    let fileID = this.cache[fileName]
    let fileData;
    if(fileID && false){
      // let response = await this.drive.files.get({
      //   fileId: fileID,
      //   auth: this.client,
      //   fields: 'id, name, size, createdTime, modifiedTime'
      // })
      // fileData = response.data.files[0]
    }
    else{
      let folders = fileName.split("/");
      fileID = this.rootFolderId
      for (const folder of folders) {
        let response = await this.drive.files.list({
          auth: this.client,
          q: `parents in '${fileID}' and name = '${folder}'`,
          fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime)'
        })
        fileData = response.data.files[0]
        fileID = fileData.id
        this.cache[fileName] = fileID
      }
    }
    return {
      // path: fileName,
      // name: fileData.name,
      id: fileID,
      size: fileData.size ? +fileData.size: null,
      created:  new Date(fileData.createdTime).getTime(),
      modified: new Date(fileData.modifiedTime).getTime(),
    }
  }
  async stream(fileData){
    let somereadstream = await this.drive.files.get({fileId: fileData.id, alt: 'media' }, {responseType: 'stream'})
    return somereadstream.data
  }
}

export class YandexDiskWebDAV extends WebDAV{
  directory = "/SC2/Commanders Conflict/"
  host = 'webdav.yandex.ru'
  auth = config.yandex.token
  infourl = "files/ydisk"
}


