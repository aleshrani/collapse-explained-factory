export type Action="stand"|"walk-in"|"point"|"shrug"|"facepalm"|"shocked-jump"|"laugh"|"explain"|"count-fingers"|"cover-eyes"|"thumbs-up"|"sit";
export type Expression="neutral"|"shocked"|"laughing"|"explaining"|"smug"|"facepalm";
export type Overlay={kind:"label"|"number"|"map"|"diagram";text:string;detail?:string;nodes?:{x:number;y:number;label:string}[]};
export type Shot={start:number;end:number;line:string;visual_idea:string;direction:{subject:string;environment:string;mood:string;move:"push-in"|"pull-back"|"truck"|"orbit"|"crane"|"tilt";action:string};kit:string;params:Record<string,unknown>;camera:"wide"|"medium"|"close"|"low"|"aerial"|"dolly";light:"day"|"golden";
  action:Action;expression:Expression;overlay:Overlay|null;transition:"cut"|"whip";beat:"hook"|"lock-in"|"point"|"rehook"|"closing"|"cta";reframeX:number};
export type Episode={shots:Shot[];words:{w:string;t:number}[];rms:number[];duration:number};
