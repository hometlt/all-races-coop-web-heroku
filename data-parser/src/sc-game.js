import fs from "fs";
import {SCMod} from "./sc-mod.js";
import {deep,deepReplaceMatch, isNumeric} from "./sc-util.js";
import {SCEntity} from "./sc-entity.js";

export const SCGame = {
    schema: {},
    classlist : {},
    defaultPickIgnoreObjects: {
        validator:  [
            'CasterNotDead',
            'NotHidden',
            'Failure',
            'Pathable',
        ],
        path:  [
            'CValidatorUnitFilters',
            'CValidatorUnitCompareDamageTakenTime',
            'CEffectRemoveBehavior',
            'CValidatorUnitFilters',
            'CValidatorUnitCompareVital',
            'CValidatorUnitOrderQueue',
            'CValidatorUnitCompareResourceContents',
            'CValidatorUnitMover',
            'CValidatorUnitCompareMoverPhase',
            "CEffectIssueOrder.Abil",
            "CUpgrade.AffectedUnitArray",
            "CUpgrade.EffectArray.Reference",
            "CUnit.TechTreeProducedUnitArray.value",
            "CBehaviorBuff.Modification.AbilLinkDisableArray",
            "CBehaviorBuff.Modification.AbilLinkEnableArray",
            "CBehaviorBuff.Modification.BehaviorLinkDisableArray",
            "CBehaviorBuff.Modification.BehaviorLinkEnableArray.value",
            "CUnit.TechTreeUnlockedUnitArray",
            "CValidatorUnitCompareBehaviorCount.Behavior",
            "CValidator*.*.Effect",
            "CBehaviorBuff.DamageResponse.RequireEffectArray",
            "CRequirement*.Count.Link"
        ],
        requirementnode: [1,2,3,4,5,6,7,8,9,10],
        turret: [
            'FreeRotate'
        ],
        behavior: [
            'KillsToCaster',
            'CloakFieldEffect',
            'CloakField',
        ],
        effect: [
            'Kill',
            'Suicide',
            'AttackCancel',
            'DisableCasterWeaponsApplyBehavior',
            'DisableCasterEnergyRegenApplyBehavior',
            'TimedLifeFate',
        ],
        button: [
            'Move',
            'MovePatrol',
            'MoveHoldPosition',
            'AcquireMove',
            'Turn',
            'Stop',
            'Cheer',
            'Dance',
            'HoldFire',
            'HoldFireSpecial',
            'Cancel',
            'CancelBuilding',
            'Halt',
            'Spray',
            'AttackBuilding',
            'Attack',
            'AttackWorker',
        ],
        abil: [
            'RallyCommand',
            'HoldFire',
            'attack',
            'move',
            'stop',
            'que5',
            'que5Passive',
            'que5Addon',
            'que5CancelToSelection',
            'que5PassiveCancelToSelection',
            'que1',
            'Rally',
            'BuildInProgress'
        ]
    },
    ignoredNamespaces: [
        "achievement",
        "achievementterm",
        "alert",
        "armycategory",
        "armyunit",
        "armyupgrade",
        "artifact",
        "artifactslot",
        "bankcondition",
        "boost",
        "bundle",
        "camera",
        "campaign",
        "character",
        "cliff",
        "cliffmesh",
        "colorstyle",
        "conversation",
        "conversationstate",
        "config",
        "consoleskin",
        "gameui",
        "location",
        "map",
        "objective",
        "premiummap",
        "racebannerpack",
        "reward",
        "stimpack",
        "trophy",
        "warchest",
        "warchestseason",
        "dsp",
        "decalpack",
        "emoticon",
        "emoticonpack",
        "fow",
        "game",
        "herd",
        "herdnode",
        "hero",
        "heroabil",
        "herostat",
        "lensflareset",
        "mount",
        "physicsmaterial",
        "ping",
        "playerresponse",
        "portraitpack",
        "preload",
        "reverb",
        "scoreresult",
        "scorevalue",
        "skinpack",
        "soundexclusivity",
        "soundmixsnapshot",
        "soundtrack",
        "spray",
        "spraypack",
        "talent",
        "talentprofile",
        "terrain",
        "terrainobject",
        "terraintex",
        "tile",
        "voiceover",
        "voicepack",
        "water",
        "beam",
        "commander"
    ],
    pickIgnoreObjects: {},
    makeCoreSchema(){
        let namespaces = {
            "sss": [
                "SCameraSmooth",
                "SCommanderDifficultyLevel",
                "SCommanderMasteryTalent",
                "SCommanderTalentTree",
                "SConversationAction",
                "SConversationCondition",
                "SConversationFacialAnim",
                "SConversationGroup",
                "SConversationLine",
                "SCost",
                "SDeathResponse",
                "SLightInfo",
                "SMarker",
                "SModification",
                "SSoundAsset",
                "SSoundData",
                "SSpawnInfo",
                "SAbil",
                    "SAbilArmMagazineInfo", "SAbilCmdButton", "SAbilMorphInfo",
                "SBehavior",
                    "SBehaviorDuration", "SBehaviorFraction",
            ],
            "achievement": [
                "CAchievement"
            ],
            "achievementterm": [
                "CAchievementTerm",
                    "CAchievementTermAbilInteract", "CAchievementTermAbilLoad", "CAchievementTermAbilUse", "CAchievementTermAchievement", "CAchievementTermBehaviorCount", "CAchievementTermBehaviorState", "CAchievementTermCombine", "CAchievementTermEffectAbsorbed", "CAchievementTermEffectDamaged", "CAchievementTermEffectDodged", "CAchievementTermEffectHealed", "CAchievementTermEffectKilled", "CAchievementTermEffectUse", "CAchievementTermGeneric", "CAchievementTermReplay", "CAchievementTermScoreValue", "CAchievementTermTime", "CAchievementTermUnitBirth", "CAchievementTermUnitDeath", "CAchievementTermUnitKills", "CAchievementTermUnitRegen", "CAchievementTermUnitSupplyLoss"
            ],
            "alert": [
                "CAlert"
            ],
            "armycategory": [
                "CArmyCategory"
            ],
            "armyunit": [
                "CArmyUnit"
            ],
            "armyupgrade": [
                "CArmyUpgrade"
            ],
            "artifact": [
                "CArtifact"
            ],
            "artifactslot": [
                "CArtifactSlot"
            ],
            "bankcondition": [
                "CBankConditionCompare",
                    "CBankConditionCompareValueCount","CBankConditionCompareValueSum"
            ],
            "boost": [
                "CBoost"
            ],
            "bundle": [
                "CBundle"
            ],
            "camera": [
                "CCamera"
            ],
            "campaign": [
                "CCampaign"
            ],
            "character": [
                "CCharacter"
            ],
            "cliff": [
                "CCliff",
                    "CCliffDoodad"
            ],
            "cliffmesh": [
                "CCliffMesh"
            ],
            "colorstyle": [
                "CColorStyle"
            ],
            "conversation": [
                "CConversation"
            ],
            "conversationstate": [
                "CConversationState"
            ],
            "config": [
                "CConfig"
            ],
            "consoleskin": [
                "CConsoleSkin"
            ],
            "gameui": [
                "CGameUI"
            ],
            "location": [
                "CLocation"
            ],
            "map": [
                "CMap"
            ],
            "objective": [
                "CObjective"
            ],
            "premiummap": [
                "CPremiumMap"
            ],
            "racebannerpack": [
                "CRaceBannerPack"
            ],
            "reward": [
                "CReward",
                    "CRewardConsoleSkin", "CRewardDecal", "CRewardEmoticon", "CRewardIcon", "CRewardModel", "CRewardPoints", "CRewardPortrait", "CRewardPortraitInGame", "CRewardRaceBanner", "CRewardSpray", "CRewardSprayUseDecal", "CRewardTrophy", "CRewardVoicePack"
            ],
            "stimpack": [
                "CStimPack"
            ],
            "trophy": [
                "CTrophy"
            ],
            "warchest": [
                "CWarChest"
            ],
            "warchestseason": [
                "CWarChestSeason"
            ],
            "dsp": [
                "CDSPChorus", "CDSPCompressor", "CDSPCustomCompressor", "CDSPDistortion", "CDSPEcho", "CDSPFlange", "CDSPHighPass", "CDSPLimiter", "CDSPLowPass", "CDSPLowPassSimple", "CDSPNormalize", "CDSPParamEQ", "CDSPPitchShift", "CDSPReverb"
            ],
            "decalpack": ["CDecalPack",],
            "emoticon": ["CEmoticon",],
            "emoticonpack": ["CEmoticonPack",],
            "fow": [    "CFoW",],
            "game": [    "CGame",],
            "herd": [    "CHerd",],
            "herdnode": [    "CHerdNode",],
            "hero": [    "CHero",],
            "heroabil": [    "CHeroAbil",],
            "herostat": [    "CHeroStat",],
            "lensflareset": [    "CLensFlareSet",],
            "mount": [    "CMount",],
            "physicsmaterial": [    "CPhysicsMaterial",],
            "ping": [    "CPing",],
            "playerresponse": [    "CPlayerResponse", "CPlayerResponseUnit", "CPlayerResponseUnitBirth", "CPlayerResponseUnitDamage", "CPlayerResponseUnitDeath",],
            "portraitpack": [    "CPortraitPack",],
            "preload": [    "CPreload", "CPreloadActor", "CPreloadConversation", "CPreloadModel", "CPreloadSound", "CPreloadUnit",],
            "reverb": [    "CReverb",],
            "scoreresult": [    "CScoreResult", "CScoreResultBuildOrder", "CScoreResultExperience", "CScoreResultGraph", "CScoreResultPerformance", "CScoreResultRoot", "CScoreResultScore",],
            "scorevalue": [
                "CScoreValue", "CScoreValueStandard",
                "CScoreValueCombine",
                "CScoreValueCustom"
            ],
            "skinpack": [    "CSkinPack",],
            "soundexclusivity": [    "CSoundExclusivity",],
            "soundmixsnapshot": [    "CSoundMixSnapshot",],
            "soundtrack": [    "CSoundtrack",],
            "spray": [    "CSpray",],
            "spraypack": [    "CSprayPack",],
            "talent": [    "CTalent",],
            "talentprofile": [    "CTalentProfile",],
            "terrain": [    "CTerrain",],
            "terrainobject": [    "CTerrainObject",],
            "terraintex": [    "CTerrainTex",],
            "tile": [    "CTile",],
            "voiceover": [ "CVoiceOver",],
            "voicepack": [ "CVoicePack",],
            "water": [ "CWater",],
            "beam": [ "CBeamAsyncLinear"],
            "commander": [
                "CCommander"
            ],




            "datacollection": [ "CDataCollection", "CDataCollectionAbil", "CDataCollectionUnit", "CDataCollectionUpgrade",],
            "datacollectionpattern": ["CDataCollectionPattern",],
            "texture": [    "CTexture",],
            "texturesheet": [    "CTextureSheet",],
            "item": [
                "CItem",
                "CItemAbil", "CItemEffect", "CItemEffectInstant", "CItemEffectTarget"
            ],
            "itemclass": [
                "CItemClass"
            ],
            "itemcontainer": [
                "CItemContainer"
            ],
            "loot": [
                "CLoot",
                "CLootEffect", "CLootItem", "CLootSet", "CLootSpawn", "CLootUnit"
            ],
            "user": [
                "CUser"
            ],


            "abil": [
                "CAbil",
                    "CAbilArmMagazine", "CAbilAttack", "CAbilAttackModifier", "CAbilAugment", "CAbilBattery", "CAbilBeacon", "CAbilBehavior", "CAbilBuild", "CAbilBuildable",              "CAbilHarvest", "CAbilInteract", "CAbilInventory", "CAbilLearn", "CAbilMerge", "CAbilMergeable", "CAbilMorph", "CAbilMorphPlacement", "CAbilMove", "CAbilPawn", "CAbilProgress", "CAbilQueue", "CAbilQueueable", "CAbilRally", "CAbilRedirect", "CAbilRedirectInstant", "CAbilRedirectTarget", "CAbilResearch", "CAbilRevive", "CAbilSpecialize", "CAbilStop", "CAbilTrain", "CAbilTransport", "CAbilWarpTrain", "CAbilWarpable",
                    "CAbilEffect",
                        "CAbilEffectInstant", "CAbilEffectTarget",
            ],
            "accumulator": [
                "CAccumulator",
                    "CAccumulatorConstant","CAccumulatorAbilLevel", "CAccumulatorArithmetic", "CAccumulatorAttributePoints", "CAccumulatorBehavior", "CAccumulatorCargo", "CAccumulatorDistance", "CAccumulatorEffectAmount", "CAccumulatorSwitch", "CAccumulatorUnitCustomValue", "CAccumulatorUserData", "CAccumulatorVitals"
            ],
            "actor": [
                "CActor",
                    "CActorAction", "CActorActionOverride", "CActorArc", "CActorBase", "CActorBatch", "CActorBeamStandard", "CActorBearings", "CActorCamera", "CActorCameraModel", "CActorCreep", "CActorCutscene", "CActorDoodad", "CActorDoodadPreserver", "CActorEditorCamera",  "CActorEventMacro", "CActorFoliageFXSpawner", "CActorForce", "CActorForceBox", "CActorForceConeRoundedEnd", "CActorForceCylinder", "CActorForceSphere", "CActorGlobalConfig", "CActorLightModel", "CActorLightOmni","CActorLightOmniModel","CActorLightSpot","CActorLightSpotModel","CActorList","CActorLookAt", "CActorPortrait","CActorPower","CActorProgress","CActorPropertyCurveSet","CActorQuad","CActorQueryResponse","CActorRange", "CActorScene","CActorSelection","CActorSetQueried","CActorShadow","CActorShield","CActorShieldImpact","CActorSimple","CActorSite","CActorSiteBillboard","CActorSiteMover","CActorSiteOp2DRotation","CActorSiteOpAction","CActorSiteOpAttach","CActorSiteOpAttachVolume","CActorSiteOpBanker","CActorSiteOpBankerUnit","CActorSiteOpBasic","CActorSiteOpCursor","CActorSiteOpDeathMotion","CActorSiteOpEffect","CActorSiteOpForward","CActorSiteOpGameCameraFollow","CActorSiteOpHeight","CActorSiteOpHigherOfTerrainAndWater","CActorSiteOpHostBearings","CActorSiteOpHostedOffset","CActorSiteOpIncoming","CActorSiteOpLocalOffset","CActorSiteOpOrbiter","CActorSiteOpPatch","CActorSiteOpPhysicsImpact","CActorSiteOpRandomPointInCircle","CActorSiteOpRandomPointInCrossbar","CActorSiteOpRandomPointInSphere","CActorSiteOpRotationExplicit","CActorSiteOpRotationRandom","CActorSiteOpRotationSmooth","CActorSiteOpRotationVariancer","CActorSiteOpRotator","CActorSiteOpSelectionOffset","CActorSiteOpSerpentHead","CActorSiteOpSerpentSegment","CActorSiteOpShadow","CActorSiteOpTilter","CActorSiteOpTipability","CActorSiteOpUp","CActorSiteOpZ","CActorSiteOrbiter","CActorSiteRocker","CActorSnapshot","CActorSound","CActorSplat","CActorSquib","CActorStateMonitor","CActorTerrain","CActorTerrainDeformer","CActorText","CActorTurret",
                    "CActorModel",
                        "CActorModelMaterial","CActorEditorPoint", "CActorBeamSimple",
                    "CActorUnit",
                        "CActorMissile",
                    "CActorRegion",
                        "CActorRegionArc","CActorRegionCircle","CActorRegionGame","CActorRegionQuad","CActorRegionWater"
            ],
            "attachmethod": [
                "CAttachMethod",
                    "CAttachMethodArcTest","CAttachMethodAttachType","CAttachMethodBestMatch","CAttachMethodFilter","CAttachMethodIncoming","CAttachMethodNodeOccupancy","CAttachMethodNodeOccupancy2","CAttachMethodNumericField","CAttachMethodPattern","CAttachMethodPortAllocator","CAttachMethodProximity","CAttachMethodRandom","CAttachMethodReduction","CAttachMethodVolumesRequery","CAttachMethodVolumesTargets","CAttachMethodVolumesWeightedPick"
            ],
            "behavior": [
                "CBehavior","CBehaviorAttackModifier","CBehaviorAttribute","CBehaviorBuff","CBehaviorClickResponse","CBehaviorConjoined","CBehaviorCreepSource","CBehaviorJump","CBehaviorPowerSource","CBehaviorPowerUser","CBehaviorResource","CBehaviorReveal","CBehaviorSpawn","CBehaviorUnitTracker","CBehaviorVeterancy","CBehaviorWander"
            ],
            "button": [
                "CButton"
            ],
            "cursor": [
                "CCursor"
            ],
            "effect": [
                "CEffect",
                    "CEffectAddTrackedUnit","CEffectApplyBehavior","CEffectApplyForce","CEffectApplyKinetic","CEffectCancelOrder","CEffectCreateHealer","CEffectCreatePersistent","CEffectCreateUnit","CEffectCreep","CEffectDamage","CEffectDestroyPersistent","CEffectEnumArea","CEffectEnumMagazine","CEffectEnumTransport","CEffectIssueOrder","CEffectLastTarget","CEffectLaunchMissile","CEffectLoadContainer","CEffectModifyPlayer","CEffectModifyUnit","CEffectRandomPointInCircle","CEffectRedirectMissile","CEffectReleaseMagazine","CEffectRemoveBehavior","CEffectRemoveKinetic","CEffectReturnMagazine","CEffectSet","CEffectSwitch","CEffectTeleport","CEffectTransferBehavior","CEffectUseCalldown","CEffectUseMagazine","CEffectUserData"
            ],
            "footprint": [
                "CFootprint"
            ],
            "kinetic": [
                "CKinetic",
                    "CKineticDistance", "CKineticFollow", "CKineticRotate", "CKineticSequence", "CKineticSet", "CKineticTranslate",],
            "light": [
                "CLight"
            ],
            "model": [
                "CModel",
                    "CModelFoliage"
            ],
            "mover": [
                "CMover",
                    "CMoverAvoid", "CMoverFlock", "CMoverMissile"
            ],
            "race": [
                "CRace"
            ],
            "requirement": [
                "CRequirement"
            ],
            "requirementnode": [
                "CRequirementAllowAbil","CRequirementAllowBehavior","CRequirementAllowUnit","CRequirementAllowUpgrade","CRequirementAnd","CRequirementConst","CRequirementCountAbil","CRequirementCountBehavior","CRequirementCountUnit","CRequirementCountUpgrade","CRequirementDiv","CRequirementEq","CRequirementGT","CRequirementGTE","CRequirementLT","CRequirementLTE","CRequirementMod","CRequirementMul","CRequirementNE","CRequirementNode","CRequirementNot","CRequirementOdd","CRequirementOr","CRequirementSum","CRequirementXor"
            ],
            "shape": [
                "CShape",
                    "CShapeArc", "CShapeQuad"
            ],
            "skin": [
                "CSkin"
            ],
            "sound": [
                "CSound"
            ],
            "taccooldown": [
                "CTacCooldown"
            ],
            "tactical": [
                "CTactical",
                    "CTacticalOrder", "CTacticalSet"
            ],
            "targetfind": [
                "CTargetFind",
                    "CTargetFindBestPoint","CTargetFindEffect","CTargetFindEnumArea","CTargetFindLastAttacker","CTargetFindOffset","CTargetFindOrder","CTargetFindRallyPoint","CTargetFindSet","CTargetFindWorkerRallyPoint"
            ],
            "targetsort": [
                "CTargetSort",
                    "CTargetSortValidator","CTargetSortField", "CTargetSortAlliance","CTargetSortAngle","CTargetSortBehaviorCount","CTargetSortChargeCount","CTargetSortChargeRegen","CTargetSortCooldown","CTargetSortDistance","CTargetSortInterruptible","CTargetSortMarker","CTargetSortPowerSourceLevel","CTargetSortPowerUserLevel","CTargetSortPriority","CTargetSortRandom","CTargetSortVital","CTargetSortVitalFraction"
            ],
            "turret": [
                "CTurret"
            ],
            "unit": [
                "CUnit"
            ],
            "upgrade": [
                "CUpgrade"
            ],
            "validator": [
                "CValidator",
                    "CValidatorUnitCompareCooldown","CValidatorCombine","CValidatorCondition","CValidatorEffect","CValidatorEffectCompareDodged","CValidatorEffectCompareEvaded","CValidatorEffectTreeUserData","CValidatorFunction","CValidatorGameCommanderActive","CValidatorGameCompareTerrain","CValidatorGameCompareTimeEvent","CValidatorGameCompareTimeOfDay","CValidatorLocation","CValidatorLocationArc","CValidatorLocationCompareCliffLevel","CValidatorLocationComparePower","CValidatorLocationCompareRange","CValidatorLocationCreep","CValidatorLocationCrossChasm","CValidatorLocationCrossCliff","CValidatorLocationEnumArea","CValidatorLocationInPlayableMapArea","CValidatorLocationPathable","CValidatorLocationPlacement","CValidatorLocationShrub","CValidatorLocationType","CValidatorLocationVision","CValidatorPlayer","CValidatorPlayerAlliance","CValidatorPlayerCompareDifficulty","CValidatorPlayerCompareFoodAvailable","CValidatorPlayerCompareFoodUsed","CValidatorPlayerCompareRace","CValidatorPlayerCompareResource","CValidatorPlayerCompareResult","CValidatorPlayerCompareType","CValidatorPlayerFood","CValidatorPlayerRequirement","CValidatorUnit","CValidatorUnitAI","CValidatorUnitAbil","CValidatorUnitAlliance","CValidatorUnitBehaviorStackAlias","CValidatorUnitBehaviorState","CValidatorUnitCombatAI","CValidatorUnitCompareAIAreaEvalRatio","CValidatorUnitCompareAbilSkillPoint","CValidatorUnitCompareAttackPriority","CValidatorUnitCompareBehaviorCount","CValidatorUnitCompareCargo","CValidatorUnitCompareChargeUsed","CValidatorUnitCompareDamageDealtTime","CValidatorUnitCompareDamageTakenTime","CValidatorUnitCompareDeath","CValidatorUnitCompareField","CValidatorUnitCompareHeight","CValidatorUnitCompareKillCount","CValidatorUnitCompareMarkerCount","CValidatorUnitCompareMoverPhase","CValidatorUnitCompareOrderCount","CValidatorUnitCompareOrderTargetRange","CValidatorUnitComparePowerSourceLevel","CValidatorUnitComparePowerUserLevel","CValidatorUnitCompareRallyPointCount","CValidatorUnitCompareResourceContents","CValidatorUnitCompareResourceHarvesters","CValidatorUnitCompareSpeed","CValidatorUnitCompareVeterancyLevel","CValidatorUnitCompareVital","CValidatorUnitCompareVitality","CValidatorUnitDetected","CValidatorUnitFilters","CValidatorUnitFlying","CValidatorUnitInWeaponRange","CValidatorUnitInventory","CValidatorUnitInventoryContainsItem","CValidatorUnitInventoryIsFull","CValidatorUnitKinetic","CValidatorUnitLastDamagePlayer","CValidatorUnitMissileNullified","CValidatorUnitMover","CValidatorUnitOrder","CValidatorUnitOrderQueue","CValidatorUnitOrderTargetPathable","CValidatorUnitOrderTargetType","CValidatorUnitPathable","CValidatorUnitPathing","CValidatorUnitScanning","CValidatorUnitState","CValidatorUnitTestWeaponType","CValidatorUnitType","CValidatorUnitWeaponAnimating","CValidatorUnitWeaponFiring","CValidatorUnitWeaponPlane",],
            "weapon": [
                "CWeapon",
                    "CWeaponLegacy", "CWeaponStrafe"
            ],
        }



        let _cat = {
            "const": "const"
        }

        for(let fname in namespaces){
            for(let type of namespaces[fname]){
                _cat[type] = fname
            }
        }

        let classinfo = {
            entity: {}
        }
        for(let namespace in namespaces){
            if(SCGame.ignoredNamespaces.includes(namespace))return;
            let prototype = namespaces[namespace][0]
            classinfo[prototype] = {namespace}

            for(let i= 1;i < namespaces[namespace].length ; i++){
                let classname = namespaces[namespace][i]
                classinfo[classname] = {prototype}
            }
        }

        classinfo.CAbilEffectInstant.prototype = "CAbilEffect"
        classinfo.CAbilEffectTarget.prototype = "CAbilEffect"

        classinfo.CActorRegionArc.prototype = "CActorRegion"
        classinfo.CActorRegionCircle.prototype = "CActorRegion"
        classinfo.CActorRegionQuad.prototype = "CActorRegion"
        classinfo.CActorRegionWater.prototype = "CActorRegion"
        classinfo.CActorRegionGame.prototype = "CActorRegion"

        classinfo.CActorMissile.prototype = "CActorUnit"

        classinfo.CScoreValueCombine.prototype = "CScoreValueCustom"

        classinfo.CActorEditorPoint.prototype = "CActorModel"
        classinfo.CActorBeamSimple.prototype = "CActorModel"
        classinfo.CActorModelMaterial.prototype = "CActorModel"


        return classinfo
    },
    setSchema (file){
        let schemaData = JSON.parse(fs.readFileSync(file,{encoding: 'utf-8'}))

        let classlist = {}

        function _setSchemaInstance(entityID){
            let entitydata = schemaData[entityID]

            if(/[A-Z]/.test(entityID[0])){
                let schema = {}
                if(entitydata.catalog && schemaData[entitydata.catalog]){
                    deep(schema,schemaData[entitydata.catalog],'unite');
                }
                let selfschema = {...entitydata}
                delete selfschema.prototype
                delete selfschema.catalog
                if(Object.keys(selfschema).length){
                    deep(schema,selfschema,'unite')
                }
                if(entitydata.prototype && !classlist[entitydata.prototype]){
                    _setSchemaInstance(entitydata.prototype)
                }

                let entity = new SCEntity({
                    class: entityID,
                    $namespace: entitydata.catalog,
                    $parent: entitydata.prototype && classlist[entitydata.prototype],
                    $schema: schema
                });
                classlist[entityID] = entity
            }
        }

        for (let entityID in schemaData){
            _setSchemaInstance(entityID)
        }

        this.classlist = classlist
    },
    _objectScheme(object,schema,path,options = {}){

        if(! this._matchPath(options.path,path)){
            return
        }

        for (let property in object) {
            if (['id', 'class', 'parent', 'default', 'removed'].includes(property)) continue;
            let _path = [...path,property].join(".")

            if(property === "Unit"){
                property
            }
            if(! this._matchPath(options.path,_path))continue

            if(property === "Unit"){
                property
            }




            let value = object[property]

            if(!this._schemaValues[_path]){
                this._schemaValues[_path] = []
            }
            let values = this._schemaValues[_path];


            let isarray = property.endsWith("Array") || (value.constructor === Array && value.length > 1)
            if(isarray && value.constructor === String){
                value = [{value}]
            }

            if (value.constructor === Array && value.length === 1){
                value = value[0]
            }
            if(value.constructor === Object){
                isarray = isarray || value.index || value.removed
                value = {...value}
                // delete value.index
                delete value.removed
                if(isarray) value = [value]
            }
            if (value.constructor === Object && !Object.keys(value).length) {
                continue
            }
            if (value.constructor === Object && Object.keys(value).length === 1 && value.value !== undefined) {
                value = value.value
            }


            if(value === ""){
                continue
            }
            let type = this._getType(schema,property)

            if(type){
                if(type.constructor === Array ){
                    if(value.constructor === Object){
                        value = [value]
                    }
                    if(value.constructor === String){
                        value = [{value}]
                    }
                }
                if (type.constructor === Object ) {
                    if(value.constructor === Array){
                        type = [type]
                    }
                    if(value.constructor === String){
                        value = {value}
                    }
                }
                if (type.constructor === String ) {
                    if (value.constructor === Array) {
                        type = [{value: type}]
                    }
                    if (value.constructor === Object) {
                        type = {value: type}
                    }
                }
            }
            else {
                if(value.constructor === Array ){
                    type = [{}]
                }
                if (value.constructor === Object) {
                    type = {}
                }
                if (value.constructor === String) {
                    type = 'unknown'
                }
            }

            values.push(value)

            let specialProperties = {
                "SortArray": "[targetsort]",
                // "EffectArray": "[effect]",
                // "PeriodicEffectArray": "[effect]",
                race: "race",
                Race: "race",
                Face: "button",
                "BuildOnAs": "unit",
                // "BuiltOn": "[unit]",
                // GlossaryAlias: "[unit]",
                // TechAliasArray: "[unit]",
                // GlossaryStrongArray: "[unit]",
                // GlossaryWeakArray: "[unit]",
                Ops: "ops",
                Send: "send",
                Terms: "terms",
                Reference: "reference",
                AbilCmd: "abilcmd",
                SelectAbilCmd: "abilcmd",
            };


            let newtypeoptions
            if(property === "index"){
                if(type !== 'word' && isNumeric(value)){
                    type = 'int'
                    continue;
                }
                else{
                    type = 'word'
                }
            }
            else if(specialProperties[property]){
                type = specialProperties[property]
            }
            else if (value.constructor === Array) {
                let typeitem = type[0]
                // if (value.find(item => item.index && !isNumeric(item.index))) {
                //     typeitem.index = "word"
                // }
                for (let valueitem of value) {
                    this._objectScheme(valueitem, typeitem,[...path,property],options)
                }
                let len = Object.keys(typeitem).length

                if(typeitem.value?.constructor === String){
                    if(len === 1 || (len === 2 && ["bit","int"].includes(typeitem.index))){
                        type = `[${typeitem.value}]`
                    }
                    else if(len === 2 && typeitem.index === "word"){
                        type = `{${typeitem.value}}`
                    }
                }
            }
            else if (value.constructor === Object) {
                this._objectScheme(value, type,[...path,property],options)
            }
            else if (value === '0' || value === '1') {
                newtypeoptions = {
                    type: 'bit',
                    bigger: ['reals','real','int']
                }
            }
            else if (/^-?(0|[1-9]\d*)$/.test(value)) {
                newtypeoptions = {
                    type: 'int',
                    smaller: ['bit'],
                    bigger: ['reals','real']
                }
            }
            else if (/^(-?(0|[1-9]\d*)(\.\d+)?)$/.test(value)) {
                newtypeoptions = {
                    type: 'real',
                    smaller: ['int','ints','bit'],
                    bigger: ['reals']
                }
            }
            else if (/^-?(0|[1-9]\d*)(,-?(0|[1-9]\d*))+$/.test(value)) {
                newtypeoptions = {
                    type: 'ints',
                    smaller: ['int','bit'],
                    bigger: ['reals']
                }
            }
            else if (/^(-?(0|[1-9]\d*)(\.\d+)?)(\,-?(0|[1-9]\d*)(\.\d+)?)*$/.test(value)) {
                newtypeoptions = {
                    type: 'reals',
                    smaller: ['ints','real','int','bit']
                }
            }
            else if (/^(-|\w+(,\w+){0,});(-|\w+(,\w+){0,})$/.test(value)) {
                newtypeoptions = {
                    type: 'filters'
                }
            }
            else if (/^(\w+\:\w*)(,\w+\:\w*){0,}$/.test(value)) {
                newtypeoptions = {
                    type: 'categories',
                    smaller: ['word']
                }
            }
            else if (/^Assets[\\/][\\/\w\-. ]\.\w+$/.test(value) || property.endsWith("Icon")) {
                newtypeoptions = {
                    type: 'file',
                    smaller: ['word']
                }
            }
            else if (/^[A-Za-z_@#0-9]+(\/+[A-Za-z_@#0-9]+)+\/?$/.test(value)) {
                newtypeoptions = {
                    type: 'link',
                    smaller: ['word']
                }
            }
            else if (/^[\w+@_#]+$/.test(value)) {
                let catalog;
                for (let compareCatalog in this.cache) {
                    // let compareCatalogCapitalized = compareCatalog.substr(0, 1).toUpperCase() + compareCatalog.substr(1);

                    if (this.cache[compareCatalog][value]) {
                        let parentNode = path[path.length - 1]

                        if (property.toLowerCase().includes(compareCatalog)) {
                            catalog = compareCatalog;
                            break;
                        }
                        if ((property==="value" || property==="Link") && parentNode.toLowerCase().includes(compareCatalog)) {
                            catalog = compareCatalog;
                            break;
                        }
                    }

                    if(type === compareCatalog){
                        catalog = compareCatalog;
                        break;
                    }
                }
                if(catalog){

                    newtypeoptions = {
                        type: catalog,
                        smaller: ['word']
                    }
                }
                else{
                    newtypeoptions = {
                        type: 'word',
                        bigger: ['words']
                    }
                }

            }
            else if (/^[\w+@_#]+(,[\w+@_#]+)+$/.test(value)) {
                newtypeoptions = {
                    type: 'words',
                    smaller: ['word']
                }
            }
            else {
                newtypeoptions = {
                    type: 'string'
                }
            }



            if(newtypeoptions && type !== newtypeoptions.type && !newtypeoptions.bigger?.includes(type) && type !== 'string'){
                if(type === 'unknown' || newtypeoptions.smaller?.includes(type)) {
                    type = newtypeoptions.type
                }
                else{
                    type = 'string'
                }
            }


            schema[property] = type
        }
    },
    async makeSchema({files,path = '*',group = 'catalog' }){

        let mod = new SCMod()
        let schema = this.makeCoreSchema()

        //Make Catalogs Data Schema and Save Catalogs Data as JSON
        for(let file of files){
            await mod.read(files);

            mod.resolveTokens()

            this._schemaValues = {}
            for(let catalog in mod.catalogs){
                if([
                    "sss","const",
                    "achievement","achievementterm","armycategory","armyunit","armyupgrade","bankcondition",
                    "boost","bundle","camera","campaign","emoticon","emoticonpack","objective","preload","premiummap",
                    "racebannerpack","reward","scoreresult","scorevalue","stimpack","talentprofile","trophy",
                    "warchest","warchestseason","talent",

                ].includes(catalog)){
                    continue;
                }
                if(catalog === "sss")continue;

                for(let entity of mod.catalogs[catalog]) {

                    let schemaName
                    if(group === "catalog"){
                        schemaName = catalog
                    }
                    if(group === "class"){
                        schemaName = entity.class
                    }
                    if(!schema[schemaName])schema[schemaName] = {}
                    this._objectScheme(entity,schema[schemaName],[schemaName] ,{path})
                }
            }

            deepReplaceMatch(schema, val => val.constructor===Object && Object.keys(val).length === 0,null, ({val, obj, prop,x ,path,crumbs}) => {
                let index
                if(obj.constructor === Object){
                    index = path.length -1
                }
                if(obj.constructor === Array){
                    index = path.length -2
                }
                delete path[index][crumbs[index]]
                while(index> 0 && path[index].constructor===Object && Object.keys(path[index]).length === 0){
                    index--
                    delete path[index][crumbs[index]]
                }
            })

            delete this._schemaValues
        }

        deep(schema,{
            requirementnode: {OperandArray:  "{string}"},
            requirement: {NodeArray: [{Link : "requirementnode"}]},
            validator: {
                CombineArray: "[validator]",
            },
            actor: {
                "Sight": "word",
                "sight": "word",
            },
            CRequirementCountUpgrade: {Count: {Link: "upgrade",}},
            CRequirementCountBehavior: {Count: {Link: "behavior",}},
            CRequirementCountUnit: {Count: {Link: "unit",}},
            CValidatorUnitType: {Value: "unit"},
            CValidatorPlayerRequirement: {Value: "requirement"},
            abil: {InfoArray: [{Unit : "unit",index:"int"}]},
            CAbilTrain:{InfoArray:[{index:"word", "Unit": "[unit]"}]},
            CAbilBuild:{InfoArray:[{index:"word"}]},
            CAbilLearn:{InfoArray:[{index:"word"}]},
            CAbilPawn:{InfoArray:[{index:"word"}]},
            CAbilResearch:{InfoArray:[{index:"word"}]},
            CAbilSpecialize:{InfoArray:[{index:"word"}]},
            CAbilWarpTrain:{InfoArray:[{index:"word"}]},
            CAbilArmMagazine:{InfoArray:[{index:"word"}]}
        },'unite')

        return schema;
    }
}

