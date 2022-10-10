import {combineMods} from "./src/data-parser.mjs";

await combineMods({
    input: `./../Mods/all-races-mods/{Scion,UED,Hybrids,Dragons,UPL,UPLCampaign,UPLBalance}.SC2Mod`,
    output: "./../Mods/all-races-mods/MODS.SC2Mod/",
})