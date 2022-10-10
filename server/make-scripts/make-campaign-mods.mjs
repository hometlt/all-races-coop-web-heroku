import {combineMods} from "./../data-parser.mjs";
function join(...array){return array.join(",")}

await combineMods({
    input: `./../Mods/{${join(
        "built-in-mods/Liberty",
        "built-in-mods/LibertyCampaign",
        "built-in-mods/Swarm",
        "built-in-mods/SwarmCampaign",
        "built-in-mods/Void",
        "built-in-mods/VoidCampaign",
        "all-races-mods/VoidBalance",
        "all-races-coop/Campaign",
    )}}.SC2Mod`,
    output: "./../Mods/all-races-coop/CAMPAIGN-PVP.SC2Mod/",
})
