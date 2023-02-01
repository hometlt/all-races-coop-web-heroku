import dotenv from 'dotenv'
dotenv.config();

import express from "express"
import cors from "cors"
import path from "path"
import url from "url"
import fs from "fs"
import serveStatic from "serve-static"
import bodyParser from "body-parser"
import ejs from "ejs"
import session from "express-session"
import passport from "passport"
import cookieParser from "cookie-parser"

// import stormRouter from "./storm/router.js"
// import dataRouter from "./data/router.js"
// import authRouter from "./auth/router.js"
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// App Configuration /////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let app = express()
app.use(cookieParser());
app.use(cors());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '/'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: "This is important.", resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// Rutes /////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// app.use('/icons',serveStatic(__dirname + "/icons"))

// app.use('/icon/:icon', (req, res) => {res.sendFile(`${__dirname}/services/icon/${req.params.icon}.png`)})
//
// app.use('/info',serveStatic(__dirname + "/services/info"))
//
// app.use('/tech',serveStatic(__dirname + "/services/tech"))

app.use('/icons',serveStatic(__dirname + "/icons"))

// app.use('/wiki',serveStatic(__dirname + "/wiki"))


app.all('/wiki/*', (req, res) => {
    if(fs.existsSync(__dirname + req.url )){
        res.status(200).sendFile(__dirname + req.url);
    }
    else{
        res.status(200).sendFile(__dirname + '/wiki/index.html');
    }
});




// app.use('/data', dataRouter)

// app.use('/storm', stormRouter)

// app.use('/auth', authRouter)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// Starting Server ///////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let port = process.env.PORT || process.argv[3] || 3000
app.listen(port)

console.log('server started ' + port)
