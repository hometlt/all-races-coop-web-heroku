import express from "express"
import {getUnitData,getUnits} from "./units.mjs";
export const dataRouter = express.Router();

function response(req, res, data){
    if(req.query.beautify !== undefined){
        res.setHeader('content-type', 'text/plain');
        res.send(JSON.stringify(data, null, 2));
    }
    else{
        res.json(data)
    }
}

// middleware that is specific to this router
dataRouter.use(function timeLog(req, res, next) {
    console.log('Time: ', Date.now());
    next();
});

dataRouter.get('/unit/:unit', function(req, res){
    response(req, res, getUnitData(req.params.unit))
});
dataRouter.get('/units', function(req, res){
    response(req, res, getUnits(req.params))
});

