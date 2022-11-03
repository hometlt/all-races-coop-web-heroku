import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SCMod } from "./src/sc-mod.js";
import {SCGame} from "./src/sc-game.js";
import {deep, filterTypedProperties} from "./src/operations.js";
process.chdir(dirname(fileURLToPath(import.meta.url)))

let mod = new SCMod()
const PATCH_PATH = './output/patch'
const JSON_FILE = "./input/voidmulti.json"


let core =  new SCMod()
await core.read("./input/0.Core.SC2Mod")
let coreExclude = {}
for(let i of ["actor","model","race","unit","upgrade","button","behavior","abil","validator","effect"]){
    coreExclude[i] = Object.keys(core.cache[i])
}
deep(SCGame.defaultPickIgnoreObjects,coreExclude)


// await mod.read("./input/1.Liberty.SC2Mod")
// // await mod.read("./input/2.LibertyCampaign.SC2Mod")
// await mod.read("./input/4.Swarm.SC2Mod")
// // await mod.read("./input/5.SwarmCampaign.SC2Mod")
// await mod.read("./input/7.Void.SC2Mod")
// // await mod.read("./input/8.VoidCampaign.SC2Mod")
// fs.writeFileSync(JSON_FILE, JSON.stringify(mod, null,"  "))
await mod.read(JSON_FILE)
SCGame.useResolve = false;

mod.pick({race: ["Terr"]},{exclude: {
    unit: ['WarHound'],
    abil: [
        'MorphToInfestedTerran',
        'PlacePointDefenseDrone',
    ]
}})
mod.pick({race: ["Zerg"]},{exclude: {
    validator: [
        'IsNotWarpingIn',
        'IsNotPhaseShifted',
        'BattlecruiserNotJumping',
        'IsBunker',
        'IsVikingAir',
        'IsVikingGround',
    ],
    unit: [
        "Zealot",
        "Marine",
        "InfestorTerran",
        "VikingAssault",
        "VikingFighter",
    ],
    behavior: [
        'Precursor',
        'LockOnDisableAttack',
        'MothershipCoreRecalling',
        'Recalling',
    ],
    weapon: [
        'PsiBlades',
        'GuassRifle'
    ],
    abil: [
        'Stimpack',
        'InfestedTerrans',
    ]
}})
mod.pick({race: ["Prot"]},{exclude: {
    effect: [
        'InstantUnburrow',
        'InstantMorphUnburrowAB',
    ],
    unit: [
        'ArbiterMP',
        'CorsairMP',
        'Replicant',
    ],
    abil: [
        'ResourceStun',
    ]
}})

mod.pickActors()
mod.filter()

for(let index in mod.cache.model){
    let val = deep({},mod.cache.model[index].$$resolved)
    delete val.default
    delete val.parent
    delete val.id
    delete val.class
    filterTypedProperties(val, 'file',mod.cache.model[index].$$schema)
    mod.cache.model[index].mixin(val)
}
console.log("Total Entities: " + mod.entities.length)
mod.renameEntities("Legacy*")

await mod.saveCatalogs(PATCH_PATH)
