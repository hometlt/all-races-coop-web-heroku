import {combineMods} from "./src/data-parser.mjs";
function join(...array){return array.join(",")}

await combineMods({
    input: `./../Mods/{${join(
        "built-in-mods/Core",
        "built-in-mods/Liberty",
        "built-in-mods/LibertyCampaign",
        "built-in-mods/Swarm",
        "built-in-mods/SwarmCampaign",
        "built-in-mods/Void",
        "built-in-mods/VoidCampaign",
        "all-races-mods/VoidBalance",
        "all-races-coop/Campaign",
        "all-races-mods/Scion"  ,
        "all-races-mods/UED",
        "all-races-mods/Hybrids",
        "all-races-mods/Dragons",
        "all-races-mods/UPL","all-races-mods/UPLCampaign","all-races-mods/UPLBalance",
        "all-races-mods/Talon",
        "all-races-coop/Core",
        "all-races-mods/WarCraft",
    )}}.SC2Mod`,
    output: "./SC2Data/",
})
