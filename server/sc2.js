import xml2js from "xml2js";
import osd from "object-assign-deep";
const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"})
const builder = new xml2js.Builder();
const NORACE =  {icon: "ui_ingame_help_techtree_questionmark"}
const objectAssignDeep = (a, ...b) => osd.withOptions(a,b,{arrayBehaviour: 'merge'})

function getTableColumns(DA,DO,fields){
    let columns =  [
        {
            label: "#",
            field: "index",
            editable: false,
            filter: {method: "contains",value: ""},
            width: "5%",
            sortable: true,
            isKey: true
        },
        {
            label: "ID",
            field: "id",
            width: "30%",
            filter: {method: "contains",value: ""},
            unique: true,
            sortable: true,
        },
        ...fields.sort((a,b) => a.EditorColumn > b.EditorColumn).map(c => Object.assign({
            label: c.id,
            field: c.id,
            sortable: true,
            visible: !!c.EditorColumn,
            type:  c.Type,
            filter: {method: "contains",value: ""},
            width: (c.Type === "Int" ? 5 : 30) + '%',
            icon: SC2LinkReferences[c.Type]?.icon,
            datasource:  DO[SC2LinkReferences[c.Type]?.catalog],
            options: DA[SC2LinkReferences[c.Type]?.catalog],
        }))
    ]



    return columns;
}

const SC2LinkReferences = {
    Image: {catalog: "icons",icon: true},
    UpgradeLevel: {catalog: "UpgradeLevel",icon: false},
    AbilCmd: {catalog: "abilities",icon: true},
    Behavior: {catalog: "behaviors",icon: true},
    Upgrade: {catalog: "upgrades",icon: true},
    Button: {catalog: "buttons",icon: true},
    Race: {catalog: "races",icon: true},
    Unit: {catalog: "units",icon: true},
    Prestiges: {catalog: "prestiges",icon: true},
    Commanders: {catalog: "commanders",icon: true},
    CommanderTech: {catalog: "tech",icon: true},
}

let missed = {
    icons: [],
    wireframes: [],
    races: [],
    buttons: []
}

function toXMLObject(data,DO,CF){
    let CUser = []
    for(let instanceType in data){
        let userType = Object.keys(SC2LinkReferences)[Object.values(SC2LinkReferences).indexOf(Object.values(SC2LinkReferences).find(ref => ref.catalog === instanceType))]
        let CUserInstance =  {$: {id: userType}, Instances: [], Fields: []}

        for(let field of CF[instanceType]){
            let {Type, EditorColumn} = field
            let FieldInstance = {$: {Id: field.id, EditorColumn: EditorColumn || 0}}
            if(["Upgrade","Unit","AbilCmd","Int","Image"].includes(Type)){
                FieldInstance.$.Type = Type
            }
            else if(["Race","Behavior","Button"].includes(Type)){
                FieldInstance.$.Type = "GameLink"
                FieldInstance.$.GameLinkType = Type
            }
            else{
                FieldInstance.$.Type = "User"
                FieldInstance.$.UserType = Type
            }
            CUserInstance.Fields.push(FieldInstance)
        }
        for(let item of data[instanceType]){
            let UserTypeInstance = {}
            for(let field in item){
                if(field === "index"){
                    continue
                }
                if(field === "id"){
                    UserTypeInstance.$ = {Id: item.id}
                }
                else{
                    let fieldType = CF[instanceType].find(f => f.id === field).Type
                    let Value = item[field]
                    let InstanceType = fieldType, InstanceValue = {$: {},Field: [{$: {Id: field}}]}
                    switch (fieldType){
                        case "Behavior":
                            InstanceType = "GameLink"
                            InstanceValue.$.GameLink =  Value
                            break;
                        case "AbilCmd":
                            if(Value.includes(",")){
                                let [abil,cmd] = Value.split(",")
                                InstanceValue.$.Abil =  abil
                                if(cmd !== "0"){
                                    InstanceValue.$.Cmd =  cmd
                                }
                            }
                            else{
                                InstanceValue.$.Abil =  Value
                            }
                            break;
                        case "Unit":
                        case "Upgrade":
                        case "Int":
                        case "Image":
                            InstanceValue.$[fieldType] = Value
                            break;
                        default:
                            InstanceType = "User"
                            InstanceValue.$.Type = fieldType
                            InstanceValue.$.Instance = Value
                    }
                    if(!UserTypeInstance[InstanceType])UserTypeInstance[InstanceType] = []
                    UserTypeInstance[InstanceType].push(InstanceValue)
                }
            }
            CUserInstance.Instances.push(UserTypeInstance)
        }
        CUser.push(CUserInstance)
    }

    return builder.buildObject({Catalog: {CUser}});
}

function sc2race(item,DO){
    if(item?.race){
        return sc2race(DO.races[item.race],DO)
    }
    if(item?.commander){
        return sc2race(DO.commanders[item.commander],DO)
    }
    return item
}

function sc2icon(item,DO){
    if(!item){
        return sc2icon(NORACE,DO)
    }
    if(item.icon && !item.iconbroken) {
        return `assets/buttons/${item.icon}.png`
    }
    if(item.button && DO.buttons[item.button]){
        return sc2icon(DO.buttons[item.button],DO)
    }
    if(item.race){
        return sc2icon(DO.races[item.race],DO)
    }
    return sc2icon(NORACE,DO)
}

function processButton(DO, instance){
    let buttonID = instance.button
    if (buttonID && !DO.buttons[buttonID] && !missed.buttons.includes(buttonID)){
        missed.buttons.push (buttonID)
    }
}

function processRace(DO,instance){
    if(instance.race){
        if(DO.races[instance.race]){
            DO.races[instance.race].used = true
        }
        else  if (!missed.races.includes(instance.race)){
            missed.races.push(instance.race)
            let newRace = {
                id: instance.race
                // used: true
            }
            // DO.races[instance.race] = newRace
        }
    }
}

function fromXMLObject(DO){


    let DA = {
        buttons: [],
        tech: [],
        commanders: [],
        prestiges: [],
        units: [],
        upgrades: [],
        abilities: [],
        behaviors: [],
        unitTypes: [
            {id: 'Unit', name: 'Unit' , icon: 'btn-unit-terran-marine'},
            {id: 'Hero', name: 'Other' , icon: 'btn-hero-raynor'},
            {id: 'Structure', name: 'Structure' , icon: 'btn-building-terran-barracks'},
            {id: 'Other', name: 'Other' , icon: 'wireframe-terran-troopermengskflamethrower'}
        ],
        races: [
            {id: "all", selectable: false, used: true, name: "All Races", icon: 'ui_battlenet_glue_coop_newuser_splashicon'},
            {id: "none", selectable: false,  used: true, name: "No Race", icon: 'sc2_ui_coop_circularprogress_basic_bar' }
        ]
    }


    // {id: 'commander', Type: 'PlayerCommanders', EditorColumn: 1}
    let CF = {
        Image: [],
        Int: [],
        String: [],
        Text: [],
        AbilCmd: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Behavior: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Upgrade: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Button: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Race: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Unit: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        //todo
        UpgradeLevel: [],
        Prestiges: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Commanders: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}],
        Tech: [ {id: 'race', Type: "Race"}, {id: 'icon', Type: "Image"}]
    }

    objectAssignDeep(DO,{
        races: {
            // ued: {color: "#ffffa4"},
            // Gen: {color: "#80f0ff"},
            // Keir: {color: "#ffff80"},
            // Xayi: {color: "#ff7129"},
            // Prot: {color: "#4bb6fd"},
            // Terr: {color: "#4da05f"},
            // Zerg: {color: "#8b49ff"},
            // Neut: {color: "#e7e7e7"},
            // Dragon: {color: "#ff1a1a"},
            // NHbr: {color: "#000000"},
            // UPL: {color: "#acd9ff"},
            // Keiron: { race: "Keir"},
            // Genetron: { race: "Gen"},
            // Xayid: {race: "Xayi"},
            // Protoss: { race: "Prot"},
            // Terran: { race: "Terr"},
            // UED: { race: "ued"},
            // InfestedTerran: {race: "TerrI"},
            // PrimalZerg: {race: "ZergP"},
            // Neutral: {race: "Neut"}
        }
    })

    for(let type of ["abilities", "prestiges"]){
        for(let id in DO[type]){
            let instance = DO[type][id]
            processButton(DO,instance)
        }
    }

    DA.icons = DO.icons;
    DO.icons = {}
    for(let index in DA.icons) {
        DA.icons[index] = DO.icons[DA.icons[index]] = {id: DA.icons[index] , icon: DA.icons[index]}
    }



    for(let id in DO.abilities){
        let instance = DO.abilities[id]
        processRace(DO,instance)
        instance.id = id
        if(instance.info){
            for(let ii in instance.info){
                let abilCmdInstance = instance.info[ii]
                let index = +ii.match(/\D+(\d+)/)[1] - 1
                let abilCmdId = id + "," + index
                abilCmdInstance.id = abilCmdId
                abilCmdInstance.race = instance.race
                processButton(DO,abilCmdInstance)
                DO.abilities[abilCmdId] = abilCmdInstance
                DA.abilities.push(abilCmdInstance)
            }
            delete DO.abilities[id]
        }
        else{
            DA.abilities.push(instance)
        }
    }
    DA.abilities.sort((a, b) => collator.compare(a.id, b.id));


    for(let type of ["races","buttons", "commanders", "units", "upgrades", "behaviors", "prestiges"]) {
        for(let id in DO[type]){
            let instance = DO[type][id]
            processRace(DO,instance)
            instance.id = id
            DA[type].push(instance)
        }
        DA[type].sort((a, b) => collator.compare(a.id, b.id));
    }

    let TypePriorities = {
        Structure: 100000,
        Unit: 200000,
        Hero: 300000
    }

    DA.units.sort((a, b) => ((TypePriorities[a.Type] || 0) + (a.priority || 1000) > (TypePriorities[b.Type] || 0) + (b.priority || 1000) ? 1 : -1))

    for(let unit of DA.units){
        let ocards = unit.card;
        if(ocards){
            let ncards = []
            for(let ocard of ocards){
                let ncard = [[],[],[]]
                ncards.push(ncard)

                for(let lb in ocard) {
                    let [x, y] = lb.split("x")
                    for(let bb in ocard[lb]) {
                        if(!ncard[y][x]){
                            ncard[y][x] = []
                        }
                        ncard[y][x].push({button: ocard[lb][bb]})
                    }
                }
            }
            unit.card = ncards
        }
    }

    DO.catalogs = {
        tech: {id: "tech"},
        replacement: {id: "replacement"},
        buttons: {id: "buttons"},
        units: {id: "units"},
        upgrades: {id: "upgrades"},
        abilities: {id: "abilities"},
        behaviors: {id: "behaviors"},
        // {id: "icons"}
    }
    DA.catalogs = Object.values(DO.catalogs)

    DA.UpgradeLevel = DO.UpgradeLevel
    DO.UpgradeLevel = {}
    for(let ul of DA.UpgradeLevel) DO.UpgradeLevel[ul.id] = ul

    DA.Tech =  DO.Tech;
    DO.Tech = {}
    for(let index = 0; index < DA.Tech.length; index++){
        let tech = DA.Tech[index]

        Object.defineProperty(tech, 'index', {
            get: () =>{
                return DA.Tech.indexOf(tech)
            },
            set: (newValue) => {

            },
            enumerable: true,
            configurable: true
        });

        // Object.defineProperty(tech, 'id', {
        //     get: function () {
        //         return "" +
        //             (this.commander || "") +
        //             (this.prestige ? "prestige"+this.prestige : "") +
        //             (this.level ? "Level"+this.level : "") +
        //             "_"+
        //             (this.unit || "") +
        //             (this.ability || "") +
        //             (this.upgrade || "") +
        //             (this.behavior || "") +
        //             (this.state || "ON")
        //     },
        //     set: (newValue) => {
        //     },
        //     enumerable: true,
        //     configurable: true
        // });

        if(tech.ability && DO.abilities[tech.ability+",0"]){
            tech.ability+=",0"
        }

        if(DO.Tech[tech.id]){
            console.log(tech.id)
        }
        DO.Tech[tech.id] = tech
    }





    DA.replacement =  DO.replacement;
    DO.replacement = {}
    for(let index = 0; index < DA.replacement.length; index++){
        let replacement = DA.replacement[index]


        Object.defineProperty(replacement, 'index', {
            get: () =>{
                return DA.replacement.indexOf(replacement)
            },
            enumerable: true,
            configurable: true
        });

        DO.replacement[replacement.id] = replacement
    }




    window.DO = DO
    window.DA = DA
    window.CF = CF


    return {DA,DO,CF}
}

export {sc2race,fromXMLObject,sc2icon,toXMLObject,getTableColumns}