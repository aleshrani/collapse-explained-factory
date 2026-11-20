import * as construction from "../kit/construction";
import * as ghostcity from "../kit/ghostcity";
import * as bunker from "../kit/bunker";
import * as ship from "../kit/ship";
import * as dubai from "../kit/dubai";
import * as service from "../kit/dubai-service";
import * as office from "../kit/property-office";
import * as court from "../kit/courtroom";
import * as hotel from "../kit/hotel-interior";
import * as finance from "../kit/finance";
import * as explainers from "../kit/explainers";
import * as projects from "../kit/projects";
import { Shot } from "./types";
export function scenery(shot:Shot){
  const ctx={light:shot.light};
  if(shot.kit==="dubai")return dubai.build(shot.params,ctx);
  if(shot.kit==="dubai-service")return service.build(shot.params);
  if(shot.kit==="property-office")return office.build(shot.params);
  if(shot.kit==="courtroom")return court.build(shot.params);
  if(shot.kit==="finance-wall")return finance.build(shot.params);
  if(shot.kit==="hotel-interior")return hotel.build(shot.params);
  if(projects.ids.includes(shot.kit as projects.Project))return projects.build(shot.kit as projects.Project,shot.params,ctx);
  if(explainers.bases.includes(shot.kit as explainers.Base))return explainers.build(shot.kit as explainers.Base,shot.params as Parameters<typeof explainers.build>[1]);
  const anchor=shot.camera==="aerial"?"wide":shot.camera==="dolly"||shot.camera==="low"?"medium":shot.camera;
  if(shot.kit==="bunker"){
    const variant=shot.params.variant==="tunnel"?"tunnel":"entrance";
    return {group:bunker.build({...shot.params,variant},ctx),feet:bunker.hosts[variant][anchor],place:variant};
  }
  const kits={construction,ghostcity,ship};
  const kit=kits[shot.kit as keyof typeof kits];if(!kit)throw Error("Unknown kit "+shot.kit);
  return {group:kit.build(shot.params,ctx),feet:kit.hosts[anchor],place:shot.kit};
}
