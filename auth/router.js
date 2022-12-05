
const {LocalFileClient} = require("./files.js");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const refresh = require('passport-oauth2-refresh');

const User = require('./models/User').User;
const express = require("express");
const app = express.Router();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require("mongoose");
const fetch = require('node-fetch')

const google = require('@googleapis/drive');

const googleScope = ["profile","email","https://www.googleapis.com/auth/drive.file"]
const discordScope = ['identify', 'email', 'guilds', 'guilds.join']
const failureRedirect = "/auth"
const successRedirect = "/auth"

let data = {}




const fetchDiscordUser = async id => {
    const response = await fetch(`https://discord.com/api/v9/users/`, {headers: {Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`}})
    if (!response.ok) throw new Error(`Error status code: ${response.status}`)
    let responseData = await response.json();
    return responseData
}

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true,});
mongoose.set("useCreateIndex", true);
passport.serializeUser( (user, done) => { done(null, user.id);});
passport.deserializeUser( (id, done) => { User.findById(id,  done); });

let discordStrategy = new DiscordStrategy({
  clientID: process.env.DISCORD_APP_ID,
  clientSecret: process.env.DISCORD_APP_SECRET,
  callbackURL: `${process.env.HOST}auth/discord/callback`,
  scope: discordScope,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {

  // let user = await User.findOrCreate({username: profile.email})
  let user = await  User.findOneAndUpdate({discord_id: profile.id},{
    discord_id: profile.id,
    discord_access_token: accessToken,
    discord_refresh_token: refreshToken,
    discord_user: profile.username +'#'+ profile.discriminator,
    discord_avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.webp` //?size=128
  }, {upsert: true, returnDocument: 'after',useFindAndModify: false}).exec()

  done(null, user);
})
passport.use(discordStrategy);
refresh.use(discordStrategy);

passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.HOST}auth/google/callback`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {

    let user = await  User.findByIdAndUpdate(req.user.id,{
        google_id: profile.id,
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_user: profile.displayName, //profile.emails[0].value,//
        google_avatar: profile.photos[0].value
      }, {upsert: true, returnDocument: 'after',useFindAndModify: false}).exec()
      done(null, user);
    }))


async function googleDriveFilesList(drive, folderID){
  let response = await drive.files.list({
    q: `parents in '${folderID}' and trashed=false`,
    fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime)'
  })

  let result = []
  for (let fileData of response.data.files){
    let info = {
      id: fileData.id,
      name: fileData.name,
      created:  new Date(fileData.createdTime).getTime(),
      modified: new Date(fileData.modifiedTime).getTime()
    }
    if(fileData.size){
      info.size = +fileData.size
    }
    else{
      info.files = await googleDriveFilesList(drive, fileData.id)
    }
    result.push(info)
  }
  return result
}

async function uploadFiles(drive,folder){
  let fileSystem = new LocalFileClient()
  let folderId = await googleDriveCreateFolder(drive,'AssetMods',folder)
  let localDirectory = './storm/mod/AssetMods/'
  let files = fileSystem.files(localDirectory)

  for(let file of files){
    let stream = fs.createReadStream(file.path)
    let read = (''+0).padStart(10," ")
    let percent = (''+0).padStart(3," ")
    let total = (''+ Math.round(file.size/1000)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
    let driveFile = await drive.files.create({resource: {name: file.name,parents: [folderId]}, media: {mimeType: file.mimeType, body: stream}, fields: 'id'}, {
      onUploadProgress(e) {
        read = (''+ Math.round(e.bytesRead/1000)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ').padStart(10," ")
        percent = Math.floor((e.bytesRead / file.size) * 100).padStart(3," ")
        process.stdout.write(`\rUploading: ${file.name} ${read} / ${total} KB (${percent}%)`)
      }
    })
    console.log('\n'+ file.name + " " + file.size + " " + driveFile.data.id)
  }
}

async function initialize(){
  let users
  try{
    users = await User.find().exec()
  }
  catch(e){
    console.error(e)
    return setTimeout(1000,initialize)
  }
  data.users = []
  for(let user of users){
    if(!user.google_id) continue;
    if(!user.google_refresh_token) continue;
    let drive = getGoogleDrive(user)
    let googleDriveFiles = await googleDriveFilesList(drive, user.google_drive_folder)

    data.users.push({
      avatar: user.discord_avatar,
      discord: user.discord_user,
      files: googleDriveFiles,
      folder: user.google_drive_folder,
    })
    //todo
   await uploadFiles(drive,user.google_drive_folder);
  }
}


async function googleDriveCreateRootFolder(user){
  let drive = getGoogleDrive(user)
  googleDriveCreateFolder(drive,'Resurgence Of The Storm','root')
  //save folder id in database
  await User.findByIdAndUpdate(user.id,{
    google_drive_folder: fileId
  }, {upsert: true, returnDocument: 'after',useFindAndModify: false}).exec()
}

async function googleDriveCreateFolder(drive, name, parent){
  const mimeType = 'application/vnd.google-apps.folder'
  let rootFiles = await drive.files.list({
    auth: this.client,
    q: `'${parent}' in parents and mimeType = '${mimeType}' and name = '${name}'`,
    fields: 'nextPageToken, files(id, name)'
  })
  //if folder was already created, use it
  let fileId
  if(rootFiles.data.files.length){
    fileId = rootFiles.data.files[0].id
  }
  //or create new root directory
  else{
    let parents = [parent];
    let folder = await drive.files.create({resource: {name, mimeType,parents}, fields: 'id'})
    fileId = folder.data.id
    await drive.permissions.create({fileId, resource: {role: 'reader', type: 'anyone'}})
  }
  return fileId
}

async function googleDriveUnlink(user) {
  await User.findByIdAndUpdate(user.id, {
    $unset: {
      google_id: "",
      google_access_token: "",
      google_refresh_token: "",
      google_user: "",
      google_avatar: "",
      google_drive_folder: ""
    }
  }, {upsert: true, returnDocument: 'after', useFindAndModify: false}).exec()
}

function getGoogleDrive(user){
  const auth = google.auth.fromJSON({
    type: 'authorized_user',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: user.google_refresh_token
  })
  return google.drive({version: 'v3', auth});
}

const secure = process.env.NODE_ENV === "production"
app.get("/", async (req, res) => {

  if(!req.user){
    if(req.cookies.discord_refresh_token){

      try{
        let {accessToken, refreshToken} = await new Promise((resolve,reject) => refresh.requestNewAccessToken('discord', req.cookies.discord_refresh_token,  async (err, accessToken, refreshToken) => {
          if(err)return reject(err)
          resolve({accessToken, refreshToken})
        }))

        const response = await fetch(`https://discord.com/api/v9/users/@me`, {headers: {Authorization: `Bearer ${accessToken}`}})
        if (!response.ok) throw new Error(`Error status code: ${response.status}`)

        let profile = await response.json();
        let user = await  User.findOneAndUpdate({discord_id: profile.id},{
          discord_id: profile.id,
          discord_access_token: accessToken,
          discord_refresh_token: refreshToken,
          discord_user: profile.username +'#'+ profile.discriminator,
          discord_avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.webp` //?size=128
        }, {upsert: true, returnDocument: 'after',useFindAndModify: false}).exec()

        req.user = user

        res.cookie("discord_access_token", req.user.discord_access_token, {httpOnly: true, secure})
        res.cookie("discord_refresh_token", req.user.discord_refresh_token, {httpOnly: true, secure})
      }
      catch(err){
        console.error(err)
      }
    }
  }
  res.render("auth/views/home",{user: req.user, data})
})
app.get("/google", passport.authenticate("google", {scope: googleScope}))
app.get("/discord", passport.authenticate("discord"))
app.get("/google/callback", passport.authenticate("google", {failureRedirect}), async (req, res) => {
  await googleDriveCreateRootFolder(req.user)
  res.redirect(successRedirect)
})
app.get('/discord/callback', passport.authenticate('discord', {failureRedirect}), (req, res) => {
  res.cookie("discord_access_token", req.user.discord_access_token, {httpOnly: true, secure})
  res.cookie("discord_refresh_token", req.user.discord_refresh_token, {httpOnly: true, secure})
  res.redirect(successRedirect)
})
app.get("/unlink/google", async (req, res) => {
  if(!req.user){
    return res.status(403).send('You do not have rights to visit this page');
  }
  await googleDriveUnlink(req.user)

  let suser = req.session.passport.user
  delete suser.google_id
  delete suser.google_access_token
  delete suser.google_refresh_token
  delete suser.google_user
  delete suser.google_avatar

  req.session.save((err) => {
    if(err){
      console.log(err);
    }
  })
  res.redirect(successRedirect);
})
app.get("/logout", async (req, res) => {
  res.clearCookie("discord_access_token")
  res.clearCookie("discord_refresh_token")

  req.logout(()=>{})
  res.redirect(successRedirect);
})

initialize()

module.exports = {
  authRouter: app
}