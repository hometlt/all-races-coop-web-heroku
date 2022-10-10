import {combineMods} from "./src/data-parser.mjs";
function join(...array){return array.join(",")}

await combineMods({
    input: `./../Mods/{${join(
        "all-races-mods/VoidBalance",   
        "all-races-coop/Campaign",
        // "all-races-mods/Scion"  ,
        // "all-races-mods/UED",
        // "all-races-mods/Hybrids",
        // "all-races-mods/Dragons",
        // "all-races-mods/UPL",
        // "all-races-mods/UPLBalance",
        // "all-races-coop/Extra",
        "all-races-mods/WarCraft",
        // "all-races-coop/Core",
    )}}.SC2Mod`,
    output: "./../Mods/all-races-coop/WC3.SC2Mod/",
})
