import {combineMods} from "./src/data-parser.mjs";

await combineMods({
    input: `./../Mods/all-races-tester/{LOTV,DRAGON,SCION,NHBR,UED,UPL}.SC2Mod`,
    output: "./../Mods/all-races-tester/PVP.SC2Mod/",
})