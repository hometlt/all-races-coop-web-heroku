const passport = require("passport");
const User = require('./models/User').User;
const express = require("express");
const app = express.Router();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require("mongoose");

const google = require('@googleapis/drive');

const googleScope = ["profile","email","https://www.googleapis.com/auth/drive.file"]
const discordScope = ['identify', 'email', 'guilds', 'guilds.join']
const failureRedirect = "/auth"
const successRedirect = "/auth"

let data = {}

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true,});
mongoose.set("useCreateIndex", true);
passport.serializeUser( (user, done) => { done(null, user.id);});
passport.deserializeUser( (id, done) => { User.findById(id,  done); });
passport.use(new DiscordStrategy({
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
    }));
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
    // q: `parents in '${folderID}' and trashed=false`,
    fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime)'
  })

  let result = []
  response.data.files.forEach(fileData => {
    let info = {
      id: fileData.id,
      name: fileData.name,
      created:  new Date(fileData.createdTime).getTime(),
      modified: new Date(fileData.modifiedTime).getTime()
    }
    if(fileData.size){
      info.size = fileData.size
    }
    else{
      info.files = googleDriveFilesList(drive, fileData.id)
    }
    result.push(info)
  })
  return result
}

/**
 * Describe with given media and metaData and upload it using google.drive.create method()
 */
async function uploadFile(auth) {
  try{
    let file =  await drive.files.create({
      resource: {name: 'photo.jpg'},
      media: {mimeType: 'image/jpeg', body: fs.createReadStream('files/photo.jpg')},
      fields: 'id'
    })
    console.log('File Id: ', file.id);
  }
  catch(err){
    console.error(err);
  }
}

async function initialize(){
  let users = await User.find().exec()
  data.users = []
  for(let user of users){
    if(!user.google_id)continue;
    if(!user.google_refresh_token)continue;
    let drive = getGoogleDrive(user)
    let googleDriveFiles = await googleDriveFilesList(drive, user.google_drive_folder)

    data.users.push({
      avatar: user.discord_avatar,
      discord: user.discord_user,
      files: googleDriveFiles,
      folder: user.google_drive_folder,
    })
  }
  // data.users
}

async function googleDriveCreateFolder(user){
  const mimeType = 'application/vnd.google-apps.folder'
  const name = 'Resurgence Of The Storm'
  let drive = getGoogleDrive(user)
  let rootFiles = await drive.files.list({
    auth: this.client,
    q: `'root' in parents and mimeType = '${mimeType}' and name = '${name}'`,
    fields: 'nextPageToken, files(id, name)'
  })
  //if folder was already created, use it
  let fileId
  if(rootFiles.data.files.length){
    fileId = rootFiles.data.files[0].id
  }
  //or create new root directory
  else{
    let folder = await drive.files.create({resource: {name, mimeType}, fields: 'id'})
    fileId = folder.data.id
    await drive.permissions.create({fileId, resource: {role: 'reader', type: 'anyone'}})
  }
  //save folder id in database
  await User.findByIdAndUpdate(user.id,{
    google_drive_folder: fileId
  }, {upsert: true, returnDocument: 'after',useFindAndModify: false}).exec()
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

app.get("/", async (req, res) => res.render("auth/views/home",{user: req.user, data}))
app.get("/google", passport.authenticate("google", {scope: googleScope}))
app.get("/discord", passport.authenticate("discord"))
app.get("/google/callback", passport.authenticate("google", {failureRedirect}), async (req, res) => {
  await googleDriveCreateFolder(req.user)
  res.redirect(successRedirect)
})
app.get('/discord/callback', passport.authenticate('discord', {failureRedirect}), (req, res) => res.redirect(successRedirect))
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
  req.logout(()=>{})
  res.redirect(successRedirect);
})

initialize()

module.exports = {
  authRouter: app
}