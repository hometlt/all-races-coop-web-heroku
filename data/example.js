import { SCMod } from "./src/sc-mod.js";

//create the mod instance
let mod = new SCMod()

//read all needed mods in an order
await mod.read("./input/0.Core.SC2Mod")
await mod.read("./input/1.Liberty.SC2Mod")
await mod.read("./input/4.Swarm.SC2Mod")
await mod.read("./input/7.Void.SC2Mod")
await mod.read("./input/9.Void Multi.SC2Mod")

//write the result mod into a folder
mod.write('./output/combined')

//or to json file
mod.write('./output/combined.json')

//read the mod
await mod.read('./input/combined.json')

//pick the instances and all related data from the mod. prevent from adding too much data using exclude option
mod.pick({race: ["Terr"]},{
    exclude: {
        unit: ['WarHound'],
        abil: ['PlacePointDefenseDrone']
    }
})
mod.pick({race: ["Zerg"]},{
    exclude: {
        validator: ['IsNotWarpingIn', 'IsNotPhaseShifted', 'BattlecruiserNotJumping', 'IsBunker', 'IsVikingAir', 'IsVikingGround',],
        unit: ["Zealot", "Marine", "InfestorTerran", "VikingAssault", "VikingFighter",],
        behavior: ['Precursor', 'LockOnDisableAttack', 'MothershipCoreRecalling', 'Recalling',],
        weapon: ['PsiBlades', 'GuassRifle'],
        abil: ['Stimpack', 'InfestedTerrans',]
    }
})
mod.pick({race: ["Prot"]},{
    exclude: {
        effect: ['InstantUnburrow', 'InstantMorphUnburrowAB',],
        unit: ['ArbiterMP', 'CorsairMP', 'Replicant'],
        abil: ['ResourceStun',]
    }
})

//pick all actors for picked instances. todo: actors are ignored in pick function
mod.pickActors()

//only leave picked entities.
mod.filter()

//get the count of picked entities
console.log("Picked Entities: " + mod.entities.length)

//prefix all filtered entities with 'Legacy' word. where '*' is an old entity id
mod.renameEntities("Legacy*")

//save new mod dara in a specific folder (can be used in game)
await mod.saveData('./output/patch')
//or save ot into a single xml file (can be used in game)
await mod.saveData('./output/patch.xml')
//save Data to json file (to use with scripts and web apps)
await mod.saveData('./output/patch.json')
//or even Yaml format (most compact and readable notation)
await mod.saveData('./output/patch.yaml')
