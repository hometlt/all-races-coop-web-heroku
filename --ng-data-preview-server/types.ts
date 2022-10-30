type SCUnitAttribute = "Light" | "Biological"
type SCFamily = "Storymode" | "Campaign" | "Melee" | "Coop"
type SCUnitType = "Unit" | "Destructible" | "Other" | "Projectile" | "Prop"
type SCColor = string
type SCIcon = string

interface SCInstance<T>{
  parent: T,
  Icon: SCIcon,
  Id: string;
  Race: SCRace
}

interface SCUnit extends SCInstance<SCUnit>{
  Description: string,
  LifeArmorIcon: SCIcon,
  ShieldArmorIcon: SCIcon,
  Name: string,
  ObjectFamily: SCFamily,
  ObjectType: SCUnitType,
  CargoSize : number,
  Speed : number,
  Sight : number,
  Food : number,
  EnergyMax : number,
  LifeMax : number,
  ShieldsMax : number,
  ShieldArmor : number,
  LifeArmor : number,
  GlossaryPriority : number,
  CostResource: {
    Minerals : number,
    Vespene : number,
  },
  Attributes: SCUnitAttribute[],
  Commands: SCCard[],
  Behaviors: Partial<SCBehaviorAny[]>,
  Weapons: Partial<SCWeapon[]>,
  Strengths: Partial<SCUnit[]>,
  Weaknesses: Partial<SCUnit[]>,
  Abilities: Partial<SCAbility[]>,
  Upgrades: Partial<SCUpgrade[]>,
  Producers: Partial<SCUnit[]>,
  Requirements: Partial<SCUnit[]> & Partial<SCUpgrade[]>,
  Production: Partial<SCUnit[]>,
}

interface SClayoutButton {
  Face: SCButton,
  Row: number,
  Column: number
}

interface SCCard {
  "l": number,
  "x": number,
  "y": number,
  "Icon": SCIcon,
  "Id": string,
  "Description": string,
  "Name": string
}


interface SCActor extends SCInstance<SCActor>{
  unit: SCUnit,
  wireframe: SCIcon,
  events: [{Terms: string, Send: string}]
}


interface SCRace extends SCInstance<SCRace>{
  color: SCColor
}

interface SCButton  extends SCInstance<SCButton>{
  icon: SCIcon
}
interface SCUpgrade extends SCInstance<SCUpgrade>{
  icon: SCIcon,
  Name: string,
  Description: string,
}

interface SCBehaviorBase extends SCInstance<SCBehaviorBase>{
  icon: SCIcon,
  Name: string,
}

interface SCBehaviorBuff extends SCBehaviorBase{
  icon: SCIcon
}

interface SCBehaviorAny extends SCBehaviorBuff {

}

interface SCWeapon extends SCInstance<SCBehaviorBase>{
  Name: string;
  DisplayEffect: SCEffect,
  DisplayAttackCount: number,
  Range: number,
  Period: number,
  TargetFilters: string,
  Effect: SCEffectDamage
}

interface SCEffectBase extends SCInstance<SCEffectBase>{}
interface SCEffectDamage extends SCEffectBase{
  "Amount": number,
  "AttributeBonus": {[key:string]: {value: number}}

}
interface SCEffect extends SCEffectDamage{}

interface SCAbilBase extends SCInstance<SCAbilBase>{}
interface SCAbilExecutable extends SCAbilBase {
  Name: string;
  button: SCButton
}
interface SCAbilMerge extends SCAbilExecutable{}
interface SCAbilTransport extends SCAbilExecutable{}
interface SCAbilBehavior extends SCAbilExecutable{}
interface SCAbilAugment extends SCAbilExecutable{}
interface SCAbilEffectInstant extends SCAbilExecutable{}
interface SCAbilEffectTarget extends SCAbilExecutable{}
interface SCAbilMorph extends SCAbilExecutable{}
interface SCAbilMorphPlacement extends SCAbilExecutable{}
interface SCAbilRedirectInstant extends SCAbilExecutable{}
interface SCAbilRedirectTarget extends SCAbilExecutable{}
interface SCAbilityGroup extends SCAbilBase {
  info: {
    Time: number,
    Unit: SCUnit,
    Upgrade: SCUpgrade,
    Effect: SCEffect,
    button: SCButton
  }
}
interface SCAbilArmMagazine extends SCAbilityGroup{}
interface SCAbilBuild extends SCAbilityGroup{}
interface SCAbilResearch extends SCAbilityGroup{}
interface SCAbilSpecialize extends SCAbilityGroup{}
interface SCAbilTrain extends SCAbilityGroup{}
interface SCAbilWarpTrain extends SCAbilityGroup{}
interface SCAbility extends
  SCAbilMerge,
  SCAbilTransport,
  SCAbilBehavior,
  SCAbilAugment,
  SCAbilEffectInstant,
  SCAbilEffectTarget,
  SCAbilMorph,
  SCAbilMorphPlacement,
  SCAbilRedirectInstant,
  SCAbilRedirectTarget,
  SCAbilArmMagazine,
  SCAbilBuild,
  SCAbilResearch,
  SCAbilSpecialize,
  SCAbilTrain,
  SCAbilWarpTrain {}

