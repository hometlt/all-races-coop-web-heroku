import * as fs from "fs";
import {SCGame} from "./sc-game.js";
import {SCMod} from "./sc-mod.js";

SCGame.setSchema('./input/schema.json')
let mod = new SCMod({title: "Test mode"})
const JSON_FILE = './input/melee1.json'
const PATCH_PATH = './output/patch'
const PATCH_CREATED = fs.existsSync(PATCH_PATH)
const JSON_CREATED = fs.existsSync(JSON_FILE)
const LOAD_METHOD = 'MERGE'
const FORCE_PATCH = true

//Load Mods as XML and Save Catalogs Data as JSON
if(LOAD_METHOD === 'MERGE' || !JSON_CREATED){
    await mod.read("./input/Core.SC2Mod")
    await mod.read("./input/Liberty.SC2Mod")
    await mod.read("./input/Swarm.SC2Mod")
    await mod.read("./input/Void.SC2Mod")
    // await mod.read("./input/LibertyCampaign.SC2Mod")
    // await mod.read("./input/SwarmCampaign.SC2Mod")
    // await mod.read("./input/VoidCampaign.SC2Mod")
    await mod.read("./input/VoidBalance.SC2Mod")

    delete mod.triggers
    delete mod.dependencies


    mod.cache.abil.SprayTerran.resolve()
    mod.cache.abil.SprayTerran.resolveTokens()
    //Flags Broken . check Default Property for indexed arrays

    for (let entity of mod.entities)entity.resolve()
    // for (let entity of mod.entities)entity.resolveArrays()
    for (let entity of mod.entities)entity.resolveTokens()

    fs.writeFileSync(JSON_FILE, JSON.stringify(mod, null,"  "))
}

//Load Mods from JSON
if(LOAD_METHOD === 'JSON' && JSON_CREATED){
    await mod.read(JSON_FILE)
}

//creating game patch
if(FORCE_PATCH || !PATCH_CREATED) {

    // for (let entity of mod.entities)entity.resolveParents()



    let Zerg = 1, Terran = 1, Protoss = 1
    if(Terran){
        mod.pick({unit: ["SCV"]},{
            unit: ['Vulture', 'Goliath', 'Wraith', 'Spectre', 'Medic', 'Firebat', 'UmojanLabMicrobot', 'WarHound', 'Predator', 'MercCompound', 'Hercules', 'Diamondback', 'ScienceVessel', 'TechReactor', 'SpectreNuke', 'AutomatedRefinery',],
            abil: ['MengskMercTrain', 'TrainKorhalMercenaries', 'SummonMercenaries', 'SummonKorhalMercenaries',]
        })
    }
    if(Zerg){
        mod.pick({unit: ["Drone"]},{
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
                "ZealotAiur",
                "ZealotShakuras",
                "ZealotPurifier",
                "Marine",
                "Scourge",
                "Virophage",
                "Brutalisk",
                "HotSHunter",
                "InfestedTerran",
                "Impaler",
                "KorhalSporeCannon",
                "HotSLeviathan",
                "InfestorTerran",
                "ImpalerDen",
                "HotSSwarmling",
                "GreaterNydusWorm",
                "AutomatedExtractor",
                "VikingAssault"/*Younk weapon*/,
                "VikingFighter"/*Younk weapon*/,
            ],
            behavior: [
                'Precursor',
                'LockOnDisableAttack',
                'MothershipCoreRecalling',
                'Recalling',
                'VoidShade',
                'TerrazineShadow',
                'ZealotRespawnDeath',
                'SOAHeroicShieldProcBuff'
            ],
            weapon: [
                'PsiBlades',
                'GuassRifle'
            ],
            abil: [
                'Stimpack',
                'InfestedTerrans',
                'SummonInfestedMercs',
                'LarvaTrainSwarm',
            ]
        })
    }
    if(Protoss){
        mod.pick({unit: ["Probe"]},{
            behavior: [
                'SOARadar',
                'CarrierInterceptorBombs'
            ],
            effect: [
                'InstantUnburrow',
                'InstantMorphUnburrowAB',
            ],
            unit: [
                'AutomatedAssimilator',
                'Reaver',
                'Scout',
                'ArbiterMP',
                'KhaydarinMonolith',
                'CorsairMP',
                'VoidRayShakuras',
                'VoidRayTaldarim',
                'SoACaster',
                'Replicant',
            ],
            abil: [
                'SOACasterWarpTrain',
                'UpgradeToRoboticsFacilityWarp',
                'PurifyMorphPylon',
                'WarpGateTrainAI',
                'GatewayTrainAI',
                'RoboticsFacilityWarpTrainAI',
                'RoboticsFacilityTrainAI',
                'StargateWarpTrainAI',
                'StargateTrainAI',
                'NexusTrainMothershipCore',
                'ChampionWarpTrain',
                'AssimilatorToAutomatedAssimilator',
                'UpgradeToRoboticsFacilityWarpInstant',
                'ResourceStun',
            ]
        })
    }

    // console.log("Total References: " + [].concat(...Object.values(mod.chains).map((entities) => Object.values(entities))).map(item => item.references?.length || 0).reduce((acc,val)=>acc+val,0))
    mod.createActorsForPickedUnits()
    mod.filter()
    console.log("Total Entities: " + mod.entities.length)
    mod.renameEntities("Legacy*")

    //remove info needed only for renaming (references) and debugging (chains)
    for(let entity of mod.entities){
        delete entity.$chains
        delete entity.$references
        delete entity.default //todo ???
    }

    for (let entity of mod.catalogs.actor)entity.stringValues()

    await mod.saveCatalogs("./output/patch")
    // await mod.saveCatalogs("./output/patch.json")
    // await mod.saveCatalogs("./output/patch.yaml")
    // await mod.saveCatalogs("./output/patch.xml")
}
else{
    await mod.read('./output/patch')
}


