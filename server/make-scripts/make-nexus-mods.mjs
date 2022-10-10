import {combineMods} from "./src/data-parser.mjs";
function join(...array){return array.join(",")}

await combineMods({
    input: `./../Mods/{${join(

        "nexus/NC Data 1",
        "nexus/NC Data 2",
        "nexus/NC Data 3"
    )}}.SC2Mod`,
    output: "./../Mods/nexus/Nexus-Combined.SC2Mod/",
})
