import {combineMods} from "./src/data-parser.mjs";

await combineMods({
    input: `./../Mods/all-races-tester/{CORE,LOTV,DRAGON,SCION,NHBR,UED,UPL,COOP}.SC2Mod`,
    // input: `./../Mods/all-races-tester/{CORE,LOTV,DRAGON,SCION,NHBR,UED,UPL,COOP,WAR}.SC2Mod`,
    output: "./../Mods/all-races-coop/TESTER.SC2Mod/",
})