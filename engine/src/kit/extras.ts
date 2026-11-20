import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {cardShade} from "../videos/bridge/cardshade";
import {NOINK} from "../videos/bridge/ink";
import {ARCH_PRESETS,drawScientist} from "../videos/dubai3d/scientist";
import {Pen} from "../videos/dubai3d/toon";

// Everyone who is not the host is drawn with the host's own 2D card rig (round head, dot eyes, thin limbs, same line weight);
// only clothes, hair, hat and glasses change. Kits record where people stand in group.userData.people; dress() turns them into cards.
export type Person={x:number;y?:number;z:number;variant:number;scale?:number};
const V:{coat:string;coatDk:string;shirt:string;hair:string;skin:string;glasses:boolean;hat:string}[]=[
  {coat:"#3d3f4a",coatDk:"#2f313a",shirt:"#f1eee6",hair:"#2b2420",skin:"#c99468",glasses:false,hat:"none"},   // dark suit, black hair
  {coat:"#7c6a58",coatDk:"#66564a",shirt:"#e8dcc3",hair:"#6a4a30",skin:"#dfac82",glasses:true,hat:"none"},    // brown jacket, glasses
  {coat:"#556e5e",coatDk:"#445a4c",shirt:"#f4f1e8",hair:"#b9a37a",skin:"#e7bb94",glasses:false,hat:"none"},  // green jacket, fair hair
  {coat:"#8a3f3f",coatDk:"#713232",shirt:"#f1e6d4",hair:"#1f1b1a",skin:"#b07d56",glasses:true,hat:"none"},    // maroon jacket, glasses
  {coat:"#2f4c6b",coatDk:"#243d56",shirt:"#dbe7f2",hair:"#8a8a8a",skin:"#d9a679",glasses:true,hat:"none"},    // navy suit, grey hair
  {coat:"#d9d4c4",coatDk:"#bdb7a4",shirt:"#ffffff",hair:"#3a2a22",skin:"#c08c62",glasses:false,hat:"none"},  // cream jacket
  {coat:"#4a4f57",coatDk:"#393d44",shirt:"#e6e9ee",hair:"#1d1a1a",skin:"#cf9c70",glasses:false,hat:"none"},  // grey suit
];
export function extraCard(variant:number,scale=1){
  const v=V[((variant%V.length)+V.length)%V.length];
  const map=ctex("kit-extra-"+variant,600,1000,g=>drawScientist(new Pen(g),ARCH_PRESETS.neutral,{look:"architect",glasses:v.glasses,hat:v.hat,
    palette:{coat:v.coat,coatDk:v.coatDk,shirt:v.shirt,pants:v.coatDk,hair:v.hair,hairDk:v.hair,hairHi:v.hair,tips:v.hair,skin:v.skin,glove:v.skin,moustache:v.hair,brow:v.hair}}));
  map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
  const w=1.38*scale,h=2.30*scale;
  const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h).translate(0,h*.475,0),cardShade(new THREE.MeshLambertMaterial({map,alphaTest:.4,side:THREE.DoubleSide})));
  card.layers.set(NOINK);card.receiveShadow=true;card.castShadow=true;
  card.customDepthMaterial=new THREE.MeshDepthMaterial({map,alphaTest:.4,depthPacking:THREE.RGBADepthPacking});
  return card;
}
/** Kits call this instead of drawing blocky figures. */
export function addPerson(group:THREE.Group,person:Person){
  (group.userData.people??=[]).push(person);
}
