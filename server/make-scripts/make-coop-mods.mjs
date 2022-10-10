import {combineMods} from "./src/data-parser.mjs";
function join(...array){return array.join(",")}

await combineMods({
    input: `./../Mods/{${join(


        // "all-races-mods/assets/Scion",
        // "all-races-mods/assets/Hybrids",
        // "all-races-mods/assets/Talon",
        // "all-races-mods/assets/UED",
        // "all-races-mods/assets/Dragons",
        // "all-races-mods/assets/UPL",
        // "all-races-mods/assets/UPLCampaign",
        // "all-races-mods/assets/COOP",
        // "all-races-mods/assets/LOTC",
        // "all-races-mods/assets/WarCraft",
        
        // "all-races-mods/built-in/Liberty",
        // "all-races-mods/built-in/LibertyCampaign",
        // "all-races-mods/built-in/Swarm",
        // "all-races-mods/built-in/SwarmCampaign",
        // "all-races-mods/built-in/Void",
        // "all-races-mods/built-in/VoidCampaign",
        "all-races-mods/VoidBalance",
        "all-races-coop/Campaign",
        "all-races-mods/Scion"  ,
        "all-races-mods/UED",
        "all-races-mods/Hybrids",
        "all-races-mods/Dragons",
        "all-races-mods/UPL","all-races-mods/UPLCampaign","all-races-mods/UPLBalance",
        "all-races-mods/Talon",
        // "all-races-coop/Extra",
        // "all-races-mods/WarCraft",
    )}}.SC2Mod`,
    output: "./../Mods/all-races-coop/MODS.SC2Mod/",
})
